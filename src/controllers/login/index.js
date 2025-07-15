const { loginService } = require("../../services/login");

const jwtExpiry = process.env.JWT_EXPIRY;

async function login(req, res, next) {
  try {
    const { rut, clave } = req.body;

    if (!rut || !clave) {
      return res.status(400).json({ error: "RUT y clave son requeridos" });
    }

    const { token, payload } = await loginService(rut, clave);
    console.log("🚀 ~ login ~ token:", token)
   
    const isProduction = false;
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction,
      maxAge: jwtExpiry,
      domain: isProduction ? "tudominio.com" : undefined,
    });

    res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
}



function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.status(200).json({ success: true, message: "Sesión cerrada exitosamente" });
}


module.exports = { login, logout };
