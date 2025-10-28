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

// Compat: el middleware exporta default (upload) y props.
// Aquí tomamos el default para no romper nada existente.
const upload = require("../../middlewares/upload");

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
