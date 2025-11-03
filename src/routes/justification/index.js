// routes/justification/index.js
const express = require("express");
const {
  list,
  get,
  create,
  update,
  remove,
  download,
} = require("../../controllers/justification");

const router = express.Router();

/**
 * Compatibilidad total con el middleware de uploads:
 * - Si el módulo exporta `default`, lo usamos.
 * - Si exporta la función directamente, también funciona.
 * Además, preserva las props adicionales (UPLOADS_DIR, etc.) ya que require(...)
 * retorna el objeto completo.
 */
const uploadModule = require("../../middlewares/upload");
const upload = uploadModule?.default || uploadModule;

// 🔹 GET /justification?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/", list);

// 🔹 GET /justification/:id
router.get("/:id", get);

// 🔹 GET /justification/:id/document  (📎 descarga segura con verificación)
router.get("/:id/document", download);

// 🔹 POST /justification  (subida con verificación posterior en controller)
router.post("/", upload.single("file"), create);

// 🔹 PUT /justification/:id/status
router.put("/:id/status", update);

// 🔹 DELETE /justification/:id
router.delete("/:id", remove);

module.exports = router;
