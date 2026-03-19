const express = require("express");

// 📦 Imports de rutas
const userRoutes = require("./user");
const justificationRoutes = require("./justification");
const adminJustificationRoutes = require("./admin/justification");
const loginRoutes = require("./login");
const trabajadorRoutes = require("./trabajador");
const employeeProfileRoutes = require("./admin/employeeProfile");

const verifyJWT = require("../middlewares/authentication");

const router = express.Router();

/**
 * 🌐 RUTAS PÚBLICAS
 * (no requieren autenticación)
 */
router.use("/login", loginRoutes);

/**
 * 🔒 MIDDLEWARE GLOBAL DE AUTENTICACIÓN
 * Todas las rutas definidas después de este punto
 * requieren un token JWT válido.
 */
router.use(verifyJWT);

/**
 * 🔐 RUTAS PROTEGIDAS
 */
router.use("/user", userRoutes);
router.use("/justification", justificationRoutes);
router.use("/trabajador", trabajadorRoutes);

// 👇 Secciones de administración
router.use("/admin/justification", adminJustificationRoutes);

router.use("/admin/employee-profiles", employeeProfileRoutes);

module.exports = router;
