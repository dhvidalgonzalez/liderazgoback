// src/routes/admin/justification/index.js
const express = require("express");
const {
  list,
  get,
  update,
  download,
} = require("../../../controllers/admin/justification");

const router = express.Router();

/**
 * 📦 Rutas base: /api/admin/justifications
 * - GET/POST listado (compat)
 * - GET detalle
 * - GET descarga de documento
 * - PUT estado (solo estado/comentarios del revisor)
 */

// ✅ Listar con filtros + paginación (GET o POST)
router.get("/", list);    // GET /admin/justifications
router.post("/", list);   // POST /admin/justifications (compat)

// ✅ Descarga segura del documento (verifica archivo y MIME real)
router.get("/:id/document", download); // GET /admin/justifications/:id/document

// ✅ Obtener por ID
router.get("/:id", get);  // GET /admin/justifications/:id

// ✅ Actualizar estado (⚠️ solo campos de revisión; NO documento)
router.put("/:id/status", update); // PUT /admin/justifications/:id/status

module.exports = router;
