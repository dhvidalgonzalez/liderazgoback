const express = require("express");
const {
  list,
  get,
  create,
  update,
  remove,
} = require("../../controllers/justification");

const router = express.Router();
const upload = require("../../middlewares/upload");

// 🔹 GET /justification?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/", list);

// 🔹 GET /justification/:id
router.get("/:id", get);

// 🔹 POST /justification
router.post("/", upload.single("file"), create);

// 🔹 PUT /justification/:id/status
router.put("/:id/status", update);

// 🔹 DELETE /justification/:id
router.delete("/:id", remove);

module.exports = router;
