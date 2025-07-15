const crypto = require("crypto");

// Genera una clave de 256 bits (32 bytes), ideal para HMAC-SHA256 (HS256)
const secret = crypto.randomBytes(32).toString("base64");

console.log("✅ Clave JWT generada:");
console.log(secret);
