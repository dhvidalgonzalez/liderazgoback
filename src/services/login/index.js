const axios = require("axios");
const https = require("https");
const jwt = require("jsonwebtoken");
const { getOrCreateUserService } = require("../user");
const sendEmail = require("../email"); // tu helper de correo

// ==============================
// ⚙️ Variables de entorno
// ==============================
const usuarioApiUni = process.env.APIUNI_USER;
const claveApiUni   = process.env.APIUNI_PASSWORD;
const tokenAppId    = process.env.TOKEN_APP_ID;     // 3 (general)
const loginAppId    = process.env.LOGIN_APP_ID;     // 58 (tu app)
const apiBaseUrl    = process.env.APIUNI_BASE_URL;  // ej: https://appdetprod.codelco.cl:91/apiuni
const jwtSecret     = process.env.JWT_SECRET;
const jwtExpiry     = process.env.JWT_EXPIRY;
const validateBase  = (process.env.RECOVERY_VALIDATE_BASE_URL || "").replace(/\/+$/, "");

let tokenCache = null;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ---------------------------
// Helpers
// ---------------------------
function normalizeTxt(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// calcula DV del RUT (mismo algoritmo que tu PHP)
function calcDv(numStr) {
  let sum = 0, mult = 2;
  for (let i = numStr.length - 1; i >= 0; i--) {
    sum += parseInt(numStr[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}

// si viene 12345678 o 18387239, arma 18387239-K; si ya viene 12.345.678-9, limpia puntos y deja DV en mayúscula
function formatRutForApi(raw) {
  if (!raw) return raw;
  const s = raw.toString().trim().toUpperCase();
  // Si ya trae guion y DV
  if (/^\d{1,9}-[0-9K]$/.test(s.replace(/\./g, ""))) {
    const sinPuntos = s.replace(/\./g, "");
    const [num, dv] = sinPuntos.split("-");
    return `${num}-${dv.toUpperCase()}`;
  }
  // Si es solo dígitos, calculamos DV
  const onlyDigits = s.replace(/\D/g, "");
  if (onlyDigits && /^\d{7,9}$/.test(onlyDigits)) {
    return `${onlyDigits}-${calcDv(onlyDigits)}`;
  }
  // Pasaporte u otro ID no RUT: lo dejamos tal cual
  return s;
}

// intenta extraer un código desde el detalle ("Código: ABC123", etc.)
function extractCodeFromDetalle(detalle) {
  if (typeof detalle !== "string") return null;
  const m =
    detalle.match(/cod(?:igo)?:\s*([A-Za-z0-9\-_.]+)/i) ||
    detalle.match(/([A-Za-z0-9]{4,})$/);
  return m ? m[1] : null;
}

// ============================================================
// 🔑 Obtener token del servicio externo
// ============================================================
async function getToken() {
  const res = await axios.post(
    `${apiBaseUrl}/ControlAcceso/Token_Obtener`,
    {
      rutfull: "0",
      usuariosistema: usuarioApiUni,
      clave: claveApiUni,
      aplicacion: tokenAppId, // app general (3)
    },
    {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      httpsAgent,
    }
  );
  tokenCache = res.data.token;
  return tokenCache;
}

// ============================================================
// 🔁 Ejecuta llamada API con token y renueva si expira
// ============================================================
async function withTokenRetry(callback) {
  if (!tokenCache) tokenCache = await getToken();
  try {
    return await callback(tokenCache);
  } catch (err) {
    const status = err.response?.status;
    const detalle = err.response?.data?.detalle?.toLowerCase?.() || "";
    const isExpired =
      status === 401 ||
      (status === 400 && (detalle.includes("token expirado") || detalle.includes("token inválido")));
    if (isExpired) {
      tokenCache = await getToken();
      return await callback(tokenCache);
    }
    throw err;
  }
}

// ============================================================
// 🔐 Servicio de login (NO TOCAR)
// ============================================================
async function loginService(rut, clave) {
  const loginPayload = { usuario: rut, clave, aplicacion: loginAppId };

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
  if (!remoteUser?.existecuenta) {
    const err = new Error("Cuenta no existe o sin acceso");
    err.status = 401;
    throw err;
  }

  const localUser = await getOrCreateUserService({
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

  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiry });
  return { token, localUser, remoteUser };
}

// ============================================================
// 📧 Correo vigente de la persona
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
// 🔄 Solicitar envío de correo con código (flujo completo)
//   1) Normaliza RUT y pide código a API (idAdmAplicacion = LOGIN_APP_ID)
//   2) Obtiene correo vigente
//   3) Envía el email con link/código
// ============================================================
async function changePasswordService(rut) {
  const rutfull = formatRutForApi(rut);
  const payload = { rutfull, idAdmAplicacion: parseInt(loginAppId) };

  console.log("[request-code] payload:", payload, "baseUrl:", apiBaseUrl);

  try {
    // 1) Solicitar código
    const response = await withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/CodigoSeguridad_Nuevo`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent,
      })
    );

    const data = response?.data || {};
    console.log("[request-code] api response:", data);

    if (data.mensaje !== "OK") {
      // Propaga el detalle REAL para que lo veas en el front/log
      return {
        success: false,
        reason: "error_general",
        detalle: data.detalle || "No se generó código.",
      };
    }

    // Extraer código del detalle (si viene)
    const code = extractCodeFromDetalle(data.detalle);

    // 2) Obtener correo vigente
    let persona;
    try {
      persona = await getCorreoVigente(rutfull);
    } catch (e) {
      console.error("[request-code] error Correo_Vigente:", e?.response?.data || e.message);
      return {
        success: false,
        reason: "email_failed",
        detalle: "No fue posible obtener el correo vigente del usuario.",
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

    // 3) Armar y enviar correo
    const link = code && validateBase ? `${validateBase}?Codigo=${encodeURIComponent(code)}` : null;
    const subject = "Reestablecimiento de contraseña";
    const html = `
      <table role="presentation" style="width:100%;max-width:700px;border:1px solid #f3f3f3;color:#363636;font-size:14px;line-height:22px">
        <tr><td style="padding:20px">
          <p>Estimado(a) ${nombre},</p>
          <p>Se solicitó el reestablecimiento de su contraseña.</p>
          ${
            link
              ? `<p>Para validar esta solicitud, haga clic aquí: <a href="${link}">Validar</a></p>`
              : code
                ? `<p>Use este código para validar su solicitud: <b>${code}</b></p>`
                : `<p>Su solicitud fue creada correctamente.</p>`
          }
          <p>Si usted no solicitó este proceso, puede ignorar este correo.</p>
        </td></tr>
      </table>
    `.trim();

    try {
      await sendEmail(to, subject, html);
    } catch (e) {
      console.error("❌ Error al enviar correo:", e?.response?.data || e.message);
      return {
        success: false,
        reason: "email_failed",
        detalle: e?.response?.data || e.message || "Fallo al enviar el correo de recuperación",
      };
    }

    return { success: true };
  } catch (err) {
    const status = err.response?.status;
    const body   = err.response?.data;

    console.error("[request-code] error status:", status);
    console.error("[request-code] error data:", body);

    // Detecta formato de RUT como causa frecuente
    if (
      status === 400 &&
      normalizeTxt(body?.detalle || "").includes("no se genero codigo") &&
      /^\d+$/.test((rut || "").toString().trim())
    ) {
      return {
        success: false,
        reason: "formato_rut",
        detalle: "El RUT debe incluir dígito verificador (ej. 18387239-7).",
      };
    }

    // Código ya vigente
    const detNorm = normalizeTxt(body?.detalle || err.message);
    if (status === 409 || detNorm.includes("ya existe") || detNorm.includes("vigente")) {
      return {
        success: false,
        reason: "codigo_existente",
        vigencia: body?.vigencia || body?.detalle,
      };
    }

    return { success: false, reason: "error_general", detalle: body?.detalle || err.message };
  }
}

module.exports = { loginService, changePasswordService };
