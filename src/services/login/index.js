const axios = require("axios");
const https = require("https");
const jwt = require("jsonwebtoken");
const { getOrCreateUserService } = require("../user");

// Variables de entorno
const usuarioApiUni = process.env.APIUNI_USER;
const claveApiUni = process.env.APIUNI_PASSWORD;
const tokenAppId = process.env.TOKEN_APP_ID;
const loginAppId = process.env.LOGIN_APP_ID;
const apiBaseUrl = process.env.APIUNI_BASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiry = process.env.JWT_EXPIRY;

let tokenCache = null;

// 🔑 Obtener token para consumir servicios
async function getToken() {
  console.log("🔑 Solicitando nuevo token...");

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
  console.log("✅ Token obtenido correctamente");
  return tokenCache;
}

// 🔐 Servicio de login desacoplado
async function loginService(rut, clave) {
  if (!tokenCache) await getToken();

  const loginPayload = {
    usuario: rut,
    clave,
    aplicacion: loginAppId,
  };

  const response = await axios.post(
    `${apiBaseUrl}/ControlAcceso/Login`,
    loginPayload,
    {
      headers: {
        Authorization: `Bearer ${tokenCache}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    }
  );

  const remoteUser = response.data?.[0];
  console.log("🚀 ~ loginService ~ remoteUser:", remoteUser);

  if (!remoteUser?.existecuenta) {
    const err = new Error("Cuenta no existe o sin acceso");
    err.status = 401;
    throw err;
  }

  // 🔁 get or create en base local
  const localUser = await getOrCreateUserService({
    rut: remoteUser.rutfull,
    name: remoteUser.nombrefull,
  });

  // 🔐 Generar token con solo el id local
  const token = jwt.sign({ userId: localUser.id }, jwtSecret, {
    expiresIn: jwtExpiry,
  });

  return { token };
}

module.exports = {
  loginService,
};
