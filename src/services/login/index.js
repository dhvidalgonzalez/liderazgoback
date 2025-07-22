const axios = require("axios");
const https = require("https");
const jwt = require("jsonwebtoken");
const sendEmail = require("../email");
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

// 🔑 Obtener token
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

// 🔁 Ejecuta una llamada API con token y maneja renovación si falla por 401
async function withTokenRetry(callback) {
  if (!tokenCache) {
    tokenCache = await getToken();
  }

  try {
    return await callback(tokenCache);
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn("🔁 Token expirado. Renovando...");
      tokenCache = await getToken();
      return await callback(tokenCache);
    }
    throw err;
  }
}

// 🔐 Login desacoplado
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

  const localUser = await getOrCreateUserService({
    rut: remoteUser.rutfull,
    name: remoteUser.nombrefull,
  });

  const token = jwt.sign({ userId: localUser.id }, jwtSecret, {
    expiresIn: jwtExpiry,
  });

  return { token };
}

// 🔄 Recuperación de contraseña y envío de correo
async function changePasswordService(rut) {
  console.log("🚀 ~ changePasswordService ~ rut:", rut);

  const payload = {
    rutfull: rut,
    idAdmAplicacion: parseInt(loginAppId),
  };

  let data;
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
    data = response?.data;
  } catch (error) {
    if (
      error.response?.status === 400 &&
      error.response?.data?.detalle?.includes("Ya existe otro código de recuperación")
    ) {
      return {
        success: false,
        reason: "codigo_existente",
        vigencia: error.response?.data?.vigencia,
      };
    }
    throw error; // otro error inesperado
  }

  if (data.mensaje !== "OK") {
    return { success: false, reason: "error_general", detalle: data.detalle };
  }

  const datosPersona = await withTokenRetry((token) =>
  axios.post(`${apiBaseUrl}/Persona/Correo_Vigente`, { rutfull: rut }, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  })
  );


  const usuarioData = datosPersona.data;
  const email = usuarioData.email;
  const nombre = usuarioData?.nombrefull;
  const codigo = data.detalle?.split(":")[1]?.trim();
  const url = `https://portaldet.codelco.cl/CapitalHumano/valida.php?Codigo=${codigo}`;

  const html = `
    <table role="presentation" style="width:100%;max-width:700px; font-family:sans-serif;">
      <tr>
        <td>
          <p>Estimado(a) ${nombre},</p>
          <p>Si solicitaste un reestablecimiento de contraseña, utiliza el siguiente enlace para continuar:</p>
          <p><a href="${url}">Validar</a></p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </td>
      </tr>
    </table>
  `;

  const subject = "Clave Única DET - Reestablecimiento de Contraseña";

  try {
    await sendEmail(email, subject, html);
    return { success: true };
  } catch (emailError) {
    console.error("❌ Error al enviar el correo:", emailError.message);
    return {
      success: false,
      reason: "email_failed",
      detalle: emailError.message || "Fallo al enviar el correo",
    };
  }
}



module.exports = {
  loginService,
  changePasswordService,
};
