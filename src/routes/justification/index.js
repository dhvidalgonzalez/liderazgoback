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

router.get("/", list); // GET /justifications
router.get("/:id", get); // GET /justifications/:id
router.post("/", upload.single("file"), create); // POST /justifications
router.put("/:id/status", update); // PUT /justifications/:id/status
router.delete("/:id", remove); // DELETE /justifications/:id

module.exports = router;
