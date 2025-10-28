// routes/login.js
const express = require("express");
const {
  login,
  logout,
  changePassword,            // request-code
  validateTempPassword,      // validate-temp
  finalizeChangePassword,    // confirm
} = require("../../controllers/login");

const router = express.Router();

// 🔐 Login / Logout
router.post("/", login);
router.post("/logout", logout);

// 🔁 Cambio de contraseña (públicos)
router.post("/change-password/request-code", changePassword);        // envía correo con código/temporal
router.post("/change-password/validate-temp", validateTempPassword); // valida clave temporal con login
router.post("/change-password/confirm", finalizeChangePassword);     // actualiza clave definitiva

module.exports = router;
