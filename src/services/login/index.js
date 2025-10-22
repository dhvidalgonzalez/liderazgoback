const axios = require("axios");
const https = require("https");
const jwt = require("jsonwebtoken");
const { getOrCreateUserService } = require("../user");

// ==============================
// ⚙️ Variables de entorno
// ==============================
const usuarioApiUni = process.env.APIUNI_USER;
const claveApiUni = process.env.APIUNI_PASSWORD;
const tokenAppId = process.env.TOKEN_APP_ID;
const loginAppId = process.env.LOGIN_APP_ID;
const apiBaseUrl = process.env.APIUNI_BASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiry = process.env.JWT_EXPIRY;

let tokenCache = null;

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
      aplicacion: tokenAppId,
    },
    {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
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
// 🔐 Servicio de login
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
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
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
// 🔄 Solicitar envío de correo con código (ÚNICO PASO)
// ============================================================
async function changePasswordService(rut) {
  console.log("🚀 ~ changePasswordService ~ rut:", rut)
  const payload = { rutfull: rut, idAdmAplicacion: parseInt(loginAppId) };
  console.log("🚀 ~ changePasswordService ~ payload:", payload)

  try {
    const response = await withTokenRetry((token) =>
      axios.post(`${apiBaseUrl}/ControlAcceso/CodigoSeguridad_Nuevo`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      })
    );
    console.log("🚀 ~ changePasswordService ~ response:", response)

    const data = response?.data || {};
    if (data.mensaje === "OK") {
      return { success: true };
    }

    const detalle = (data.detalle || "").toLowerCase();
    if (detalle.includes("ya existe") || detalle.includes("vigente")) {
      return { success: false, reason: "codigo_existente", vigencia: data.vigencia || data.detalle };
    }
    if (detalle.includes("correo") || detalle.includes("email")) {
      return { success: false, reason: "email_failed", detalle: data.detalle };
    }
    return { success: false, reason: "error_general", detalle: data.detalle };
  } catch (err) {
    // Si la API externa devuelve 409/4xx con semántica de "código activo"
    const status = err.response?.status;
    const detalle = err.response?.data?.detalle || err.message;
    if (status === 409) {
      return { success: false, reason: "codigo_existente", vigencia: err.response?.data?.vigencia };
    }
    return { success: false, reason: "error_general", detalle };
  }
}

module.exports = { loginService, changePasswordService };
