const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function solicitarCodigo(rut) {
  // === Paso 1: Obtener token ===
  const tokenResp = await axios.post(
    "https://appdetprod.codelco.cl:91/apiuni/ControlAcceso/Token_Obtener",
    {
      rutfull: "0",
      usuariosistema: "sismicidad",
      clave: ";m6,=-jhVn*Ñqz--B+",
      aplicacion: 3, // igual que PHP
    },
    {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      httpsAgent,
    }
  );

  const token = tokenResp.data.token;
  console.log("✅ Token obtenido:", token);

  // === Paso 2: Solicitar código ===
  const payload = {
    rutfull: rut,
    idAdmAplicacion: 58, // ⚠️ misma constante que 'numeroAplicacion' en PHP
  };

  console.log("📤 Enviando solicitud:", payload);

  const codigoResp = await axios.post(
    "https://appdetprod.codelco.cl:91/apiuni/ControlAcceso/CodigoSeguridad_Nuevo",
    payload,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      httpsAgent,
    }
  );

  console.log("✅ Respuesta del servidor:", codigoResp.data);
  return codigoResp.data;
}

// Ejecutar prueba directa
(async () => {
  try {
    const rut = "18.387.239-7";
    const data = await solicitarCodigo(rut);
    console.log("💌 Resultado final:", data);
  } catch (e) {
    console.error("❌ Error al solicitar código:", e.response?.data || e.message);
  }
})();
