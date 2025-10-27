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
  if (/^\d{1,3}(\.\d{3})*-[0-9K]$/.test(s)) return s; // ya correcto

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
// 🔁 Envoltura con token y reintento
// ============================================================
async function withTokenRetry(callback) {
  if (!tokenCache) tokenCache = await getToken();
  try {
    return await callback(tokenCache);
  } catch (err) {
    const status = err.response?.status || 500;
    const body = err.response?.data || {};
    console.error("[APIUNI] Error:", status, body);
    throw err;
  }
}

// ============================================================
// 🔐 Login
// ============================================================
async function loginService(rut, clave) {
  const loginPayload = { usuario: rut, clave, aplicacion: parseInt(loginAppId, 10) };

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
    // 1️⃣ Solicitar código
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

    return { success: true, mensaje: "Código enviado correctamente.", detalle: data.detalle };
  } catch (err) {
    const status = err.response?.status || 500;
    const body = err.response?.data || {};
    const detalle = body?.detalle || body?.mensaje || err.message;

    console.error("[request-code] Error status:", status);
    console.error("[request-code] Error data:", body);

    // 🧩 Si la API devuelve mensaje legible
    if (body?.mensaje || body?.detalle) {
      return {
        success: false,
        status,
        mensaje: body?.mensaje || "Error",
        detalle,
        vigencia: body?.vigencia || null,
      };
    }

    // Código existente
    const detNorm = normalizeTxt(detalle);
    if (status === 409 || detNorm.includes("ya existe") || detNorm.includes("vigente")) {
      return {
        success: false,
        reason: "codigo_existente",
        detalle,
        vigencia: body?.vigencia || null,
      };
    }

    return {
      success: false,
      status,
      reason: "error_general",
      detalle,
    };
  }
}

module.exports = { loginService, changePasswordService };
