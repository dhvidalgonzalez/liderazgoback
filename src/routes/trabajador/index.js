const express = require("express");
const {
  listGerenciasController,
  listEmpresasController,
  listTrabajadoresController
} = require("../../controllers/trabajador");

const router = express.Router();

router.post("/trabajadores", listTrabajadoresController); // GET /personal/trabajadores
router.get("/gerencias", listGerenciasController);       // GET /personal/gerencias
router.get("/empresas", listEmpresasController);         // GET /personal/empresas

module.exports = router;
