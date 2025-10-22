const express = require("express");
const { login, logout, changePassword } = require("../../controllers/login");

const router = express.Router();

// 🔐 Login / Logout
router.post("/", login);
router.post("/logout", logout);

// 🔁 Cambio de contraseña (SOLO solicitar correo con código)
//    Ruta pública (no requiere JWT)
router.post("/change-password/request-code", changePassword);

module.exports = router;
