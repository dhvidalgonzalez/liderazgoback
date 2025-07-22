const axios = require("axios");

/**
 * Envía un correo usando el API interno definido por EMAIL_API_URL
 * @param {string|string[]} to - Correo o lista de correos destinatarios
 * @param {string} subject - Asunto del correo
 * @param {string} htmlBody - Cuerpo HTML del correo
 * @param {string[]} [cc] - Correos en copia
 * @param {string[]} [bcc] - Correos en copia oculta
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function sendEmail(to, subject, htmlBody, cc = [], bcc = []) {
  const EMAIL_API_URL = process.env.EMAIL_API_URL;

  if (!EMAIL_API_URL) {
    throw new Error("EMAIL_API_URL no está definida en el entorno");
  }

  const payload = {
    destinatarios: Array.isArray(to) ? to : [to],
    subject,
    body: htmlBody,
    cc,
    cco: bcc,
  };

  try {
    const response = await axios.post(EMAIL_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error al enviar correo:", error.message);
    throw error;
  }
}

module.exports = sendEmail;
