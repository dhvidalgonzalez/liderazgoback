const express = require("express");
const userRoutes = require("./user");
const justificationRoutes = require("./justification");
const adminJustificationRoutes = require("./admin/justification"); // ✅ Importar rutas admin

const router = express.Router();

// Agrupación de rutas
router.use("/user", userRoutes);
router.use("/justification", justificationRoutes);
router.use("/admin/justifications", adminJustificationRoutes); // ✅ Montar admin correctamente

module.exports = router;
