const { loginService, changePasswordService } = require("../../services/login");

// 🔐 Iniciar sesión
async function login(req, res, next) {
  try {
    const { rut, clave } = req.body;
    if (!rut || !clave) {
      return res.status(400).json({ error: "RUT y clave son requeridos" });
    }

    const { token } = await loginService(rut, clave);

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "Lax",
      maxAge: 2 * 60 * 60 * 1000, // 2h
    });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

// 🚪 Cerrar sesión
function logout(req, res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Strict",
  });
  res.status(200).json({ success: true, message: "Sesión cerrada exitosamente" });
}

// 🔁 Solicitar código/correo para cambio de contraseña (ÚNICO PASO)
// 🔁 Solicitar código de recuperación
async function changePassword(req, res, next) {
  try {
    const { rut } = req.body;

    if (!rut) {
      return res.status(400).json({ error: "El RUT es requerido" });
    }

    const result = await changePasswordService(rut);

    if (result.success) {
      return res
        .status(200)
        .json({ success: true, message: "Correo enviado con éxito" });
    }

    if (result.reason === "codigo_existente") {
      return res.status(409).json({
        error: "Ya existe un código activo",
        vigencia: result.vigencia,
      });
    }

    if (result.reason === "email_failed") {
      return res.status(502).json({
        error: "Error al enviar el correo",
        detalle: result.detalle || "Fallo al enviar el correo de recuperación",
      });
    }

    return res.status(500).json({
      error: "No se pudo solicitar el código",
      detalle: result.detalle || "Error desconocido",
    });
  } catch (err) {
    console.error("❌ Error en controlador changePassword:", err.message);
    next(err);
  }
}

module.exports = { login, logout, changePassword };
