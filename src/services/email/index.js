const axios = require("axios");

/**
 * 🧩 Genera cuerpo HTML del correo de reestablecimiento de contraseña.
 * Replica el formato original PHP con link visible de validación.
 * 
 * @param {string} codigo - Código de validación (por ejemplo: "U3622")
 * @param {string} nombre - Nombre completo del usuario
 * @returns {string} - HTML completo del correo
 */
function buildRecoveryEmailTemplate(codigo, nombre = "Usuario") {
  const url = `https://portaldet.codelco.cl/CapitalHumano/valida.php?Codigo=${encodeURIComponent(
    codigo
  )}`;

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reestablecimiento de contraseña</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f9f9f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" style="width:100%;max-width:700px;min-width:300px;border:none;border-spacing:0;text-align:center;font-size:14px;line-height:22px;color:#363636;margin:auto;background-color:#ffffff;border:1px solid #f3f3f3;">
      <tr>
        <td style="margin:auto;text-align:center;">
          <img alt="BannerCH" src="cid:BannerCH" width="700" border="0" style="display:block;max-width:900px;min-width:300px;width:100%;">
        </td>
      </tr>
      <tr>
        <td style="padding:20px 40px;text-align:left;">
          <p style="font-size:16px;color:#333;">Estimado(a) <b>${nombre}</b>:</p>
          <p style="font-size:15px;color:#555;">
            Si solicitaste un reestablecimiento de contraseña, usa el siguiente enlace de confirmación para completar el proceso.<br><br>
            Si no solicitaste esto, puedes ignorar este correo electrónico.
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${url}" 
              style="background-color:#f47600;color:#fff;padding:12px 25px;text-decoration:none;border-radius:4px;font-weight:bold;">
              Validar solicitud
            </a>
          </div>
          <p style="font-size:14px;color:#666;text-align:center;">
            También puedes copiar y pegar este enlace en tu navegador:<br>
            <a href="${url}" style="color:#f47600;">${url}</a>
          </p>
          <p style="font-size:13px;color:#777;text-align:center;margin-top:40px;">
            Código de verificación: <b>${codigo}</b>
          </p>
        </td>
      </tr>
      <tr>
        <td style="text-align:center;">
          <img alt="FooterCH" src="cid:FooterCH" width="700" border="0" style="display:block;max-width:900px;min-width:300px;width:100%;">
        </td>
      </tr>
      <tr>
        <td style="padding:15px;text-align:center;font-size:11px;color:#999;">
          © GSYS - Gerencia de Servicios y Suministros<br>
          Este correo ha sido generado automáticamente, por favor no lo responda.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * 📧 Envía un correo a través del API interno EMAIL_API_URL
 * 
 * @param {string|string[]} to - Destinatario(s)
 * @param {string} subject - Asunto
 * @param {string} htmlBody - Cuerpo HTML
 * @param {string[]} [cc] - Copias
 * @param {string[]} [bcc] - Copias ocultas
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function sendEmail(to, subject, htmlBody, cc = [], bcc = []) {
  const EMAIL_API_URL = process.env.EMAIL_API_URL;

  if (!EMAIL_API_URL) {
    throw new Error("EMAIL_API_URL no está definida en las variables de entorno");
  }

  const payload = {
    destinatarios: Array.isArray(to) ? to : [to],
    subject,
    body: htmlBody,
    cc,
    cco: bcc,
  };

  try {
    console.log("📤 Enviando correo vía:", EMAIL_API_URL);
    console.log("📧 Destinatarios:", payload.destinatarios);

    const response = await axios.post(EMAIL_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Correo enviado correctamente:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error al enviar correo:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendEmail,
  buildRecoveryEmailTemplate,
};
