const axios = require("axios");
const https = require("https");
const jwt = require("jsonwebtoken");
const { getOrCreateUserService } = require("../user");
const { sendEmail, buildRecoveryEmailTemplate } = require("../email");

// ============================================================
// ⚙️ Variables de entorno
// ============================================================
const usuarioApiUni = process.env.APIUNI_USER;
const claveApiUni = process.env.APIUNI_PASSWORD;
const tokenAppId = process.env.TOKEN_APP_ID;
const loginAppId = process.env.LOGIN_APP_ID;
const apiBaseUrl = (process.env.APIUNI_BASE_URL || "").replace(/\/+$/, "");
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiry = process.env.JWT_EXPIRY;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
let tokenCache = null;

// ============================================================
// 🧱 Error tipado para API
// ============================================================
class ApiError extends Error {
  constructor({ status = 500, errorCode = "INTERNAL_ERROR", userMessage, detail, meta }) {
    super(detail || userMessage || errorCode);
    this.status = status;
    this.errorCode = errorCode;
    this.userMessage = userMessage || "Ocurrió un error.";
    this.detail = detail || "";
    this.meta = meta || {};
  }

  toResponse() {
    return {
      success: false,
      status: this.status,
      errorCode: this.errorCode,
      userMessage: this.userMessage,
      detail: this.detail,
      meta: this.meta,
    };
  }
}

// ============================================================
// 🔧 Helpers
// ============================================================
function normalizeTxt(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ✅ Mantiene formato estándar de RUT (con puntos y guion)
function formatRutForApi(raw) {
  if (!raw) return raw;
  let s = raw.toString().trim().toUpperCase();
  if (/^\d{1,3}(\.\d{3})*-[0-9K]$/.test(s)) return s;

  if (/^\d{7,9}-[0-9K]$/.test(s)) {
    const [num, dv] = s.split("-");
    let numFmt = "";
    let count = 0;
    for (let i = num.length - 1; i >= 0; i--) {
      numFmt = num[i] + numFmt;
      count++;
      if (count === 3 && i !== 0) {
        numFmt = "." + numFmt;
        count = 0;
      }
    }
    return `${numFmt}-${dv}`;
  }
  return s;
}

// Extrae código de texto
function extractCode(detalle) {
  if (typeof detalle !== "string") return null;
  const m =
    detalle.match(/cod(?:igo)?:\s*([A-Za-z0-9\-_]+)/i) ||
    detalle.match(/([A-Za-z0-9]{4,})$/);
  return m ? m[1] : null;
}

/**
 * ✅ Normaliza semántica:
 * - accesotemporal = 0 => requiere cambio
 * - accesotemporal = 1 => normal
 */
function needsPasswordChange(value) {
  if (value === 0) return true;
  if (typeof value === "string" && value.trim() === "0") return true;
  return false;
}

function hasAccount(v) {
  if (v === true) return true;
  if (v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    return s === "1" || s === "S" || s === "SI" || s === "TRUE";
  }
  return false;
}

// ============================================================
// 🧭 Mapeo de errores APIUNI -> errorCode/userMessage (estable)
// ============================================================
function mapApiUniError({ action, status, body, fallbackMessage }) {
  const rawDetalle = body?.detalle || body?.mensaje || fallbackMessage || "";
  const det = normalizeTxt(rawDetalle);

  // 🔴 token inválido/expirado (se reintenta antes, pero por si acaso)
  if (status === 401 || status === 403 || /token.*(expir|invalid)/i.test(rawDetalle)) {
    return new ApiError({
      status: 502,
      errorCode: "APIUNI_TOKEN_ERROR",
      userMessage: "No fue posible validar sesión con el servicio externo. Intenta nuevamente.",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status },
    });
  }

  // 🔴 login: usuario no encontrado o inactivo
  if (action === "login" && (det.includes("usuario no encontrado") || det.includes("inactivo"))) {
    return new ApiError({
      status: 401,
      errorCode: "RUT_NOT_FOUND_OR_INACTIVE",
      userMessage: "RUT no registrado o cuenta inactiva. Verifica el RUT o contacta soporte.",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status },
    });
  }

  // 🔴 request-code: ya existe código vigente
  if (action === "request_code" && (det.includes("ya existe") || det.includes("vigent"))) {
    return new ApiError({
      status: 200, // 👈 lo tratamos como caso “OK informativo”
      errorCode: "CODE_ALREADY_SENT",
      userMessage: "Ya existe un código vigente. Revisa tu correo (y SPAM).",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status, vigencia: body?.vigencia || null },
    });
  }

  // 🔴 request-code: no se generó código (en tu realidad: rut no existe internamente)
  if (action === "request_code" && det.includes("no se genero codigo")) {
    return new ApiError({
      status: 404,
      errorCode: "RUT_NOT_REGISTERED",
      userMessage: "No existe una cuenta activa asociada a ese RUT. No se pudo generar el código.",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status },
    });
  }

  // 🔴 request-code: problemas de correo (sin correo vigente)
  if (action === "request_code" && det.includes("correo")) {
    return new ApiError({
      status: 409,
      errorCode: "NO_EMAIL_ON_FILE",
      userMessage: "No se encontró un correo vigente asociado a este RUT. Contacta soporte.",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status },
    });
  }

  // 🔴 credenciales inválidas en clave temporal
  if (action === "validate_temp" && (det.includes("credencial") || det.includes("clave") || det.includes("contrasen"))) {
    return new ApiError({
      status: 401,
      errorCode: "BAD_CREDENTIALS",
      userMessage: "La clave temporal no es válida. Verifica e intenta nuevamente.",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status },
    });
  }

  // 🟠 genérico APIUNI 4xx
  if (status >= 400 && status < 500) {
    return new ApiError({
      status: 400,
      errorCode: "APIUNI_REQUEST_ERROR",
      userMessage: "La solicitud no pudo ser procesada. Revisa los datos ingresados.",
      detail: rawDetalle,
      meta: { action, upstreamStatus: status },
    });
  }

  // 🔴 genérico APIUNI 5xx / red
  return new ApiError({
    status: 502,
    errorCode: "APIUNI_UNAVAILABLE",
    userMessage: "El servicio externo no está disponible en este momento. Intenta más tarde.",
    detail: rawDetalle || "Sin detalle",
    meta: { action, upstreamStatus: status || null },
  });
}

// ============================================================
// 🔑 Token API UNI
// ============================================================
async function getToken() {
  const res = await axios.post(
    `${apiBaseUrl}/ControlAcceso/Token_Obtener`,
    {
      rutfull: "0",
      usuariosistema: usuarioApiUni,
      clave: claveApiUni,
      aplicacion: parseInt(tokenAppId, 10),
    },
    {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      httpsAgent,
    }
  );

  tokenCache = res.data?.token || null;
  console.log("✅ Token obtenido:", tokenCache);
  return tokenCache;
}

// ============================================================
// 🔁 Envoltura con token y reintento (1 vez)
// ============================================================
async function withTokenRetry(callback) {
  if (!tokenCache) tokenCache = await getToken();

  try {
    return await callback(tokenCache);
  } catch (err) {
    const st = err?.response?.status;
    const body = err?.response?.data || {};
    const detalle = body?.detalle || body?.mensaje || "";

    // token expirado/inválido => refresh y reintentar
    if ((st === 401 || st === 403) || /token\s*(expir|invalid)/i.test(detalle)) {
      tokenCache = await getToken();
      return callback(tokenCache);
    }

    console.error("[APIUNI] Error:", st || 500, body || err.message);
    throw err;
  }
}

// ============================================================
// 🔐 Login (robusto + errores tipados)
// ============================================================
async function loginService(rut, clave) {
  // Validación rápida backend (evita correos)
  if (/@/.test(String(rut || ""))) {
    throw new ApiError({
      status: 422,
      errorCode: "INVALID_IDENTIFIER",
      userMessage: "Este sistema solo acepta RUT. Ej: 11.111.111-1",
      detail: "Se recibió identificador tipo correo.",
    });
  }

  const rutfullA = formatRutForApi(rut);
  const rutfullB = (rutfullA || "").toString().replace(/\./g, "").trim();
  const aplicacion = parseInt(loginAppId, 10);

  async function doLogin(usuario) {
    const loginPayload = { usuario, clave, aplicacion };

    return withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/Login`, loginPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      })
    );
  }

  function pickRemoteUser(data) {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    if (typeof data === "object") {
      if (Array.isArray(data.data)) return data.data[0] || null;
      if (data.usuario && typeof data.usuario === "object") return data.usuario;
      if (data.user && typeof data.user === "object") return data.user;
      if (data.rutfull || data.nombrefull || data.existecuenta !== undefined) return data;
      const k0 = data["0"];
      if (k0 && typeof k0 === "object") return k0;
      return null;
    }
    return null;
  }

  let response;
  try {
    response = await doLogin(rutfullA);
  } catch (err) {
    const st = err?.response?.status || 500;
    const body = err?.response?.data || {};
    throw mapApiUniError({ action: "login", status: st, body, fallbackMessage: err.message });
  }

  let remoteUser = pickRemoteUser(response?.data);

  // Si vino vacío, reintenta sin puntos
  if (!remoteUser && rutfullB && rutfullB !== rutfullA) {
    try {
      response = await doLogin(rutfullB);
      remoteUser = pickRemoteUser(response?.data);
    } catch (err) {
      const st = err?.response?.status || 500;
      const body = err?.response?.data || {};
      throw mapApiUniError({ action: "login", status: st, body, fallbackMessage: err.message });
    }
  }

  if (!remoteUser || !hasAccount(remoteUser.existecuenta)) {
    throw new ApiError({
      status: 401,
      errorCode: "RUT_NOT_FOUND_OR_INACTIVE",
      userMessage: "RUT no registrado o cuenta inactiva. Verifica el RUT o contacta soporte.",
      detail: "remoteUser vacío o existecuenta=false",
      meta: { upstream: response?.data || null },
    });
  }

  const mustChange = needsPasswordChange(remoteUser?.accesotemporal);

  let token = null;
  let localUser = null;

  // solo creamos/emitimos token si NO requiere cambio
  if (!mustChange) {
    try {
      localUser = await getOrCreateUserService({
        rut: remoteUser.rutfull,
        name: remoteUser.nombrefull,
      });
    } catch (e) {
      // Si Prisma/DB está abajo, devolvemos error claro al FE
      const msg = String(e?.message || "");
      const isDbDown = /can.t reach database server|localhost:5433/i.test(msg);

      throw new ApiError({
        status: 503,
        errorCode: isDbDown ? "INTERNAL_DB_DOWN" : "INTERNAL_USER_SYNC_ERROR",
        userMessage: isDbDown
          ? "Sistema temporalmente no disponible (base de datos). Intenta más tarde."
          : "No fue posible sincronizar el usuario. Intenta más tarde.",
        detail: msg,
      });
    }

    const payload = {
      userId: localUser.id,
      rut: remoteUser.rutfull,
      nombre: remoteUser.nombrefull,
      admin: remoteUser.admin,
      perfiles: remoteUser.aplicacionDetalle || [],
      nivelAcceso: remoteUser.idAdmNivelAcceso || [],
    };

    token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiry });
  }

  return {
    success: true,
    token,
    localUser,
    remoteUser,
    needsPasswordChange: mustChange,
  };
}

// ============================================================
// 📧 Correo vigente
// ============================================================
async function getCorreoVigente(rutfull) {
  const resp = await withTokenRetry((token) =>
    axios.post(
      `${apiBaseUrl}/Persona/Correo_Vigente`,
      { rutfull },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      }
    )
  );
  return resp?.data || {};
}

// ============================================================
// 🔄 Solicitar código y enviar correo (con errores estables)
// ============================================================
async function changePasswordService(rutInput) {
  if (/@/.test(String(rutInput || ""))) {
    throw new ApiError({
      status: 422,
      errorCode: "INVALID_IDENTIFIER",
      userMessage: "Este sistema solo acepta RUT. Ej: 11.111.111-1",
      detail: "Se recibió identificador tipo correo.",
    });
  }

  const rutfull = formatRutForApi(rutInput);
  const payload = { rutfull, idAdmAplicacion: parseInt(loginAppId, 10) };

  console.log("📤 Solicitando código para:", rutfull);

  let resp;
  try {
    resp = await withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/CodigoSeguridad_Nuevo`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      })
    );
  } catch (err) {
    const st = err?.response?.status || 500;
    const body = err?.response?.data || {};
    const apiErr = mapApiUniError({ action: "request_code", status: st, body, fallbackMessage: err.message });

    // 👇 Caso “código ya existe”: lo tratamos como success informativo
    if (apiErr.errorCode === "CODE_ALREADY_SENT") {
      return {
        success: true,
        codeAlreadySent: true,
        errorCode: apiErr.errorCode,
        userMessage: apiErr.userMessage,
        detalle: body?.detalle || apiErr.detail,
        vigencia: body?.vigencia || apiErr.meta?.vigencia || null,
      };
    }

    throw apiErr;
  }

  const data = resp?.data || {};
  console.log("✅ Respuesta APIUNI:", data);

  if (data.mensaje !== "OK") {
    // si APIUNI devolvió 200 pero mensaje != OK
    throw mapApiUniError({
      action: "request_code",
      status: 400,
      body: data,
      fallbackMessage: data.detalle || "No se generó código.",
    });
  }

  // 2) Obtener correo vigente
  let persona = {};
  try {
    persona = await getCorreoVigente(rutfull);
  } catch (e) {
    throw new ApiError({
      status: 502,
      errorCode: "EMAIL_LOOKUP_FAILED",
      userMessage: "No fue posible obtener el correo asociado al RUT. Contacta soporte.",
      detail: e?.response?.data?.detalle || e?.message || "Error correo vigente",
    });
  }

  const to = persona?.email || persona?.correo || persona?.mail;
  const nombre = persona?.nombrefull || "Usuario";

  if (!to) {
    throw new ApiError({
      status: 409,
      errorCode: "NO_EMAIL_ON_FILE",
      userMessage: "No se encontró un correo vigente asociado a este RUT. Contacta soporte.",
      detail: "Persona/Correo_Vigente no retornó email/correo/mail",
    });
  }

  // 3) Enviar correo
  const codigo = extractCode(data.detalle);
  const subject = "Clave Única DET - Reestablecimiento de Contraseña";
  const html = buildRecoveryEmailTemplate(codigo, nombre);

  try {
    await sendEmail(to, subject, html);
  } catch (e) {
    throw new ApiError({
      status: 502,
      errorCode: "EMAIL_SEND_FAILED",
      userMessage: "No fue posible enviar el correo de recuperación. Intenta más tarde.",
      detail: e?.message || "Error enviando correo",
    });
  }

  return {
    success: true,
    errorCode: "CODE_SENT",
    userMessage: "Código enviado. Revisa tu correo (y SPAM).",
    detalle: data.detalle,
    vigencia: data.vigencia || null,
  };
}

// ============================================================
// ✅ Validar clave temporal (login con temporal)
// ============================================================
async function validateTempPasswordService(rutInput, tempPassword) {
  if (/@/.test(String(rutInput || ""))) {
    throw new ApiError({
      status: 422,
      errorCode: "INVALID_IDENTIFIER",
      userMessage: "Este sistema solo acepta RUT. Ej: 11.111.111-1",
      detail: "Se recibió identificador tipo correo.",
    });
  }

  const rutfull = formatRutForApi(rutInput);
  const payload = {
    usuario: rutfull,
    clave: tempPassword,
    aplicacion: parseInt(loginAppId, 10),
  };

  try {
    const resp = await withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/Login`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      })
    );

    const data = Array.isArray(resp?.data) ? resp.data[0] : resp?.data;
    if (!data || !hasAccount(data?.existecuenta)) {
      throw new ApiError({
        status: 401,
        errorCode: "RUT_NOT_FOUND_OR_INACTIVE",
        userMessage: "RUT no registrado o cuenta inactiva.",
        detail: "validateTemp: existecuenta false o data vacío",
      });
    }

    return {
      success: true,
      valid: true,
      accesotemporal: data?.accesotemporal ?? null,
      user: { rutfull: data?.rutfull, nombre: data?.nombrefull },
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const st = err?.response?.status || 500;
    const body = err?.response?.data || {};
    throw mapApiUniError({ action: "validate_temp", status: st, body, fallbackMessage: err.message });
  }
}

// ============================================================
// 🔒 Finalizar cambio: actualizar contraseña definitiva
// ============================================================
async function updatePasswordService(rutInput, newPassword) {
  const rutfull = formatRutForApi(rutInput);

  const policy =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,;:*\/+\-=@#$])[A-Za-z\d.,;:*\/+\-=@#$]+$/;

  if (!policy.test(newPassword) || newPassword.length < 8) {
    throw new ApiError({
      status: 422,
      errorCode: "PASSWORD_POLICY",
      userMessage:
        "La clave no cumple los requisitos. Debe tener mínimo 8 caracteres, mayúscula, minúscula, número y un carácter especial (.,;:* / + - = @ # $).",
      detail: "Password policy fail",
    });
  }

  const body = { rutfull, usuariosistema: "0", clave: newPassword };

  try {
    const resp = await withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/PerfilClave_Actualizar`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      })
    );

    const data = resp?.data || {};
    const ok = data?.mensaje === "OK" || /guardado/i.test(data?.detalle || "");

    if (!ok) {
      throw new ApiError({
        status: 400,
        errorCode: "PASSWORD_UPDATE_FAILED",
        userMessage: "No fue posible actualizar la contraseña. Verifica los datos e intenta nuevamente.",
        detail: data?.detalle || data?.mensaje || "Sin detalle",
      });
    }

    return { success: true, errorCode: "PASSWORD_UPDATED", userMessage: "Contraseña actualizada correctamente." };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const st = err?.response?.status || 500;
    const bodyUp = err?.response?.data || {};
    throw mapApiUniError({ action: "update_password", status: st, body: bodyUp, fallbackMessage: err.message });
  }
}

module.exports = {
  ApiError,
  loginService,
  changePasswordService,
  validateTempPasswordService,
  updatePasswordService,
};
