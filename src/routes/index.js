const express = require("express");
const userRoutes = require("./user");
const justificationRoutes = require("./justification");
const adminJustificationRoutes = require("./admin/justification");
const loginRoutes = require("./login");
const trabajadorRoutes = require("./trabajador");
const employeeProfileRoutes = require("./admin/employeeProfile"); // ✅ nuevo import

const verifyJWT = require("../middlewares/authentication");

const router = express.Router();

// ✅ Rutas públicas (sin autenticación)
router.use("/login", loginRoutes);

// 🔐 Middleware de autenticación para rutas protegidas
router.use(verifyJWT);

// 🔐 Rutas protegidas (requieren token JWT válido)
router.use("/user", userRoutes);
router.use("/justification", justificationRoutes);
router.use("/trabajador", trabajadorRoutes);

router.use("/admin/justification", adminJustificationRoutes);
router.use("/admin/employee-profiles", employeeProfileRoutes); // ✅ nueva ruta protegida

module.exports = router;
