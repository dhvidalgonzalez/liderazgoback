const express = require("express");
const {
  list,
  get,
  update,
  download,
  exportExcel,
} = require("../../../controllers/admin/justification");

const router = express.Router();

/** Base: /api/admin/justification  (puedes montar también en plural si quieres) */

// Listado (GET/POST)
router.get("/", list);
router.post("/", list);

// Exportar (soporta GET y POST; y tu FE usa POST)
router.get("/export", exportExcel);
router.post("/export", exportExcel);
router.get("/export/excel", exportExcel);   // compat extra
router.post("/export/excel", exportExcel);  // compat extra

// Documento
router.get("/:id/document", download);

// Detalle y estado
router.get("/:id", get);
router.put("/:id/status", update);

module.exports = router;
