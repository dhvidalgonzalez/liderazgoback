const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

function verifyJWT(req, res, next) {
  // Extraer el token desde cookies o el header Authorization
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7); // Eliminar "Bearer "
    }
  }

  console.log("🚀 ~ verifyJWT ~ token:", token);

  if (!token) {
    return res.status(401).json({ message: "No autorizado: token no presente" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // Adjunta el payload al request
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}

module.exports = verifyJWT;
