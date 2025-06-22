const express = require("express");
const userRoutes = require("./user");
const justificationRoutes = require("./justification");

const router = express.Router();

// Rutas agrupadas por recurso
router.use("/user", userRoutes);
router.use("/justification", justificationRoutes);

module.exports = router;
