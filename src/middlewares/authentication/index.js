const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

function verifyJWT(req, res, next) {
  // 1) Buscar cookie httpOnly "token"
  let token = req.cookies?.token;

  // 2) Si no hay cookie, revisar Authorization: Bearer <token>
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
  }

  if (!token) {
    return res.status(401).json({ message: "No autorizado: token no presente" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // payload del token para las rutas protegidas
    next();
  } catch (err) {
    console.error("❌ JWT inválido:", err.message);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}

module.exports = verifyJWT;
