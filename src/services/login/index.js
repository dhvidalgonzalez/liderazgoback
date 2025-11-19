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
 * ✅ Normaliza la semántica real:
 * - API devuelve accesotemporal = 0  => requiere cambio
 * - API devuelve accesotemporal = 1  => ya cambió / acceso normal
 */
function needsPasswordChange(value) {
  // Consideramos sólo "0" o 0 como requiere cambio. Todo lo demás => no requiere.
  if (value === 0) return true;
  if (typeof value === "string" && value.trim() === "0") return true;
  return false;
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
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
    const detalle = err?.response?.data?.detalle || err?.response?.data?.mensaje || "";
    const st = err?.response?.status;

    // Reintentar si token inválido/expirado (algunos back devuelven 401/403 o 400 con texto)
    if (
      st && (st === 401 || st === 403) ||
      /token\s*expirado|inv[áa]lido/i.test(detalle)
    ) {
      tokenCache = await getToken();
      return callback(tokenCache);
    }

    console.error("[APIUNI] Error:", st || 500, err?.response?.data || err.message);
    throw err;
  }
}


// ============================================================
// 🔐 Login
// ============================================================
async function loginService(rut, clave) {
  const rutfull = formatRutForApi(rut);
  const loginPayload = {
    usuario: rutfull,
    clave,
    aplicacion: parseInt(loginAppId, 10),
  };

  const response = await withTokenRetry((token) =>
    axios.post(`${apiBaseUrl}/ControlAcceso/Login`, loginPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      httpsAgent,
    })
  );

  const remoteUser = response.data?.[0];
  console.log("🚀 ~ loginService ~ remoteUser:", remoteUser);
  if (!remoteUser?.existecuenta) {
    const err = new Error("Cuenta no existe o sin acceso");
    err.status = 401;
    throw err;
  }

  // 👇 Regla correcta: 0 => requiere cambio; 1 => normal
  const mustChange = needsPasswordChange(remoteUser?.accesotemporal);
  console.log("🔎 accesotemporal:", remoteUser?.accesotemporal, "=> mustChange:", mustChange);

  // 🔐 Solo emitimos token si NO requiere cambio
  let token = null;
  let localUser = null;
  if (!mustChange) {
    localUser = await getOrCreateUserService({
      rut: remoteUser.rutfull,
      name: remoteUser.nombrefull,
    });

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
    token,                  // null si debe cambiar
    localUser,              // null si debe cambiar
    remoteUser,
    needsPasswordChange: mustChange, // ✅ bandera clara para el controller
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
// 🔄 Solicitar código y enviar correo
// ============================================================
async function changePasswordService(rutInput) {
  const rutfull = formatRutForApi(rutInput);
  const payload = { rutfull, idAdmAplicacion: parseInt(loginAppId, 10) };

  console.log("📤 Solicitando código para:", rutfull);

  try {
    const resp = await withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/CodigoSeguridad_Nuevo`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      })
    );

    const data = resp?.data || {};
    console.log("✅ Respuesta APIUNI:", data);

    if (data.mensaje !== "OK") {
      throw new Error(data.detalle || "No se generó código.");
    }

    // 2️⃣ Obtener correo vigente
    let persona = {};
    try {
      persona = await getCorreoVigente(rutfull);
    } catch (e) {
      console.error("❌ Error obteniendo correo vigente:", e?.response?.data || e.message);
      return {
        success: false,
        reason: "email_failed",
        detalle: "No fue posible obtener el correo del usuario.",
      };
    }

    const to = persona?.email || persona?.correo || persona?.mail;
    const nombre = persona?.nombrefull || "Usuario";

    if (!to) {
      return {
        success: false,
        reason: "email_failed",
        detalle: "No se encontró correo vigente para el usuario.",
      };
    }

    // 3️⃣ Enviar correo
    const codigo = extractCode(data.detalle);
    const subject = "Clave Única DET - Reestablecimiento de Contraseña";
    const html = buildRecoveryEmailTemplate(codigo, nombre);

    await sendEmail(to, subject, html);
    console.log("✅ Correo enviado correctamente a:", to);

    return {
      success: true,
      mensaje: "Código enviado correctamente.",
      detalle: data.detalle,
      vigencia: data.vigencia || null, // <- propagamos si viene
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const body = err.response?.data || {};
    const detalle = body?.detalle || body?.mensaje || err.message;
    const detNorm = normalizeTxt(detalle);

    console.error("[request-code] Error status:", status);
    console.error("[request-code] Error data:", body);

    // 🟢 1) Caso idempotente (NO es error lógico)
    //    API suele devolver 400 con "Ya existe otro código de recuperación" + vigencia
    if (
      status === 400 &&
      ( /ya existe/.test(detNorm) || /vigent/.test(detNorm) ) // “vigente”
    ) {
      return {
        success: false,
        reason: "codigo_existente",
        detalle: body?.detalle || detalle,
        vigencia: body?.vigencia || null,
      };
    }

    // 🔴 2) Fallas de correo detectables (a veces API manda 400 “no hay correo”)
    if (status === 400 && /correo/.test(detNorm)) {
      return {
        success: false,
        reason: "email_failed",
        detalle: body?.detalle || detalle,
        status: 502,
      };
    }

    // 🟠 3) Cualquier otro caso, lo mapeamos como error general
    return {
      success: false,
      status,
      reason: "error_general",
      detalle,
      vigencia: body?.vigencia || null,
    };
  }
}


// ============================================================
// ✅ Validar clave temporal (login con temporal)
// ============================================================
async function validateTempPasswordService(rutInput, tempPassword) {
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

    const data = resp?.data?.[0];
    console.log("🚀 ~ validateTempPasswordService ~ data:", data);
    if (!data?.existecuenta) {
      return { valid: false, reason: "no_account" };
    }

    return {
      valid: true,
      // aquí devolvemos el valor crudo por si lo quieres loguear, 
      // pero la UI sólo necesita saber si validó o no.
      accesotemporal: data?.accesotemporal ?? null,
      user: {
        rutfull: data?.rutfull,
        nombre: data?.nombrefull,
      },
    };
  } catch (err) {
    const status = err?.response?.status || 500;
    const detalle = err?.response?.data?.detalle || err.message;
    if (status === 401 || /credencial|clave|contraseñ/i.test(detalle)) {
      return { valid: false, reason: "bad_credentials", detalle };
    }
    return { valid: false, reason: "error", status, detalle };
  }
}

// ============================================================
// 🔒 Finalizar cambio: actualizar contraseña definitiva
// ============================================================
async function updatePasswordService(rutInput, newPassword) {
  const rutfull = formatRutForApi(rutInput);

  // Misma política que el PHP (incluye especial . , ; : * / + - = @ # $)
  const policy =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,;:*\/+\-=@#$])[A-Za-z\d.,;:*\/+\-=@#$]+$/;
  if (!policy.test(newPassword) || newPassword.length < 8) {
    const err = new Error(
      "Clave no cumple requisitos mínimos. Debe incluir algún caracter especial . , ; : * / + - = @ # $"
    );
    err.status = 422;
    throw err;
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
    return {
      success: data?.mensaje === "OK" || /guardado/i.test(data?.detalle || ""),
      mensaje: data?.mensaje,
      detalle: data?.detalle,
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const detalle = err.response?.data?.detalle || err.message;
    return { success: false, status, detalle };
  }
}

module.exports = {
  loginService,
  changePasswordService,
  validateTempPasswordService,
  updatePasswordService,
};
