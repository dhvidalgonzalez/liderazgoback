const jwt = require("jsonwebtoken");


const jwtSecret  = process.env.JWT_SECRET ;

function verifyJWT(req, res, next) {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNmM3MTRhMS0xYTdkLTQzNjktYjBkMi1kNWM1MmE1ZWY2OGUiLCJpYXQiOjE3NTI1OTE1MTIsImV4cCI6MTc1MjY3NzkxMn0.nQA9fydjDF8VLrv1fTsOSObFm7AkzKOeI6wBFwL6_dM"//req.cookies?.token;
  console.log("🚀 ~ verifyJWT ~ token:", token)


  if (!token) {
    return res.status(401).json({ message: "No autorizado: token no presente" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret );
    req.user = decoded; // Adjunta el payload al request
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}

module.exports = verifyJWT;
