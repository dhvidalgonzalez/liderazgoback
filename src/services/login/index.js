const axios = require("axios");
const https = require("https");
const jwt = require("jsonwebtoken");
// ⚠️ Si tienes un módulo de email, puedes importarlo dentro de changePasswordService cuando lo uses
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
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
// 🔐 Servicio de login (manteniendo loginPayload intacto)
// ============================================================
async function loginService(rut, clave) {
  const loginPayload = {
    usuario: rut,
    clave,
    aplicacion: loginAppId,
  };

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

  // Usuario local (si lo necesitas para tu BD)
  const localUser = await getOrCreateUserService({
    rut: remoteUser.rutfull,
    name: remoteUser.nombrefull,
  });

  // Armar payload del JWT con los datos que quieres tener disponibles en el frontend (vía /me)
  const payload = {
    userId: localUser.id,
    rut: remoteUser.rutfull,
    nombre: remoteUser.nombrefull,
    admin: remoteUser.admin,
    perfiles: remoteUser.aplicacionDetalle || [],
    nivelAcceso: remoteUser.idAdmNivelAcceso || [],
  };

  // ⚠️ Mantengo tu uso de jwtExpiry como lo tenías (no cambio semántica)
  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiry,
  });

  return { token, localUser, remoteUser };
}

// ============================================================
// 🔄 Recuperación de contraseña (si lo usas)
// ============================================================
async function changePasswordService(rut) {
  const payload = {
    rutfull: rut,
    idAdmAplicacion: parseInt(loginAppId),
  };

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

  const data = response?.data;

  if (data.mensaje !== "OK") {
    return { success: false, reason: "error_general", detalle: data.detalle };
  }

  // Si más adelante reactivas envío de correo, puedes requerir el módulo aquí:
  // const sendEmail = require("../email");
  // ... y continuar

  return { success: true };
}

// ============================================================
// 📦 Exportar servicios
// ============================================================
module.exports = {
  loginService,
  changePasswordService,
};
