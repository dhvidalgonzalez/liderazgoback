const axios = require("axios");

// ============================================================
// 🧩 CONFIGURACIÓN ESTÁTICA
// ============================================================
const EMAIL_API_URL = "http://10.18.18.147/API_GDI_TEST/api/Helper/enviarCorreo2"; // tu endpoint real
const DESTINATARIO = "dvida004@contratistas.codelco.cl"; // ⚠️ cámbialo por tu correo de prueba
const SUBJECT = "🔧 Prueba de envío de correo desde backend Liderazgo";
const CODIGO = "A1234"; // ejemplo de código de recuperación

// ============================================================
// 🧩 Clase MailServer (idéntica a la usada en producción)
// ============================================================
class MailServer {
  async enviarCorreo(paramsTo, subject, html, attachments) {
    try {
      const params = {
        destinatarios: Array.isArray(paramsTo) ? paramsTo : [paramsTo],
        subject: subject,
        body: html,
        cc: [],
        cco: [],
        attachments: attachments || [],
      };

      console.log("📤 Enviando correo vía:", EMAIL_API_URL);
      console.log("📧 Destinatarios:", params.destinatarios);

      const headers = {
        "Content-Type": "application/json",
      };

      const response = await axios.post(EMAIL_API_URL, params, { headers });

      console.log("✅ Respuesta del servidor:");
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error al enviar correo:", error.response?.data || error.message);
      throw error;
    }
  }
}

// ============================================================
// 🧩 Generador del cuerpo HTML (sendCodePass)
// ============================================================
function generarCuerpoHTML(codigo) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reestablecimiento de contraseña</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color:#f9f9f9; margin:0; padding:0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:auto;background-color:#fff;border:1px solid #e5e5e5;">
      <tr>
        <td style="background-color:#f47600;height:5px;"></td>
      </tr>
      <tr>
        <td align="center" style="padding:20px;">
          <h2 style="margin:0;color:#000;">Reestablecimiento de contraseña</h2>
          <p style="font-size:16px;color:#666;">Su código de verificación es:</p>
          <h1 style="color:#f47600;margin:10px 0;">${codigo}</h1>
          <p style="font-size:14px;color:#666;">
            Ingrese este código en la aplicación de Hormigones para continuar con el proceso de recuperación de contraseña.
          </p>
          <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
          <p style="font-size:12px;color:#999;">
            Si usted no ha solicitado este código, ignore este mensaje.
          </p>
          <p style="font-size:11px;color:#bbb;margin-top:30px;">
            © GSYS - Gerencia de Servicios y Suministros<br>
            Este correo se ha generado automáticamente, por favor no lo responda.
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

// ============================================================
// 🧪 EJECUCIÓN DIRECTA DEL TEST
// ============================================================
(async () => {
  try {
    const mailServer = new MailServer();
    const html = generarCuerpoHTML(CODIGO);

    console.log("🚀 Iniciando prueba de envío de correo...");
    console.log("📩 Asunto:", SUBJECT);
    console.log("📧 Destinatario:", DESTINATARIO);

    await mailServer.enviarCorreo(DESTINATARIO, SUBJECT, html);

    console.log("✅ Correo enviado correctamente al destinatario.");
  } catch (error) {
    console.error("❌ Error general:", error.message);
  }
})();
