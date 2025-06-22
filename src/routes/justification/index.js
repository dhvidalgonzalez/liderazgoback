const express = require("express");
const {
  list,
  get,
  create,
  update,
  remove,
} = require("../../controllers/justification");

const router = express.Router();

router.get("/", list); // GET /justifications
router.get("/:id", get); // GET /justifications/:id
router.post("/", create); // POST /justifications
router.put("/:id/status", update); // PUT /justifications/:id/status
router.delete("/:id", remove); // DELETE /justifications/:id

module.exports = router;
