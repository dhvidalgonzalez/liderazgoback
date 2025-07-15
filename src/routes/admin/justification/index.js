const express = require("express");
const {
  list,
  get,
  update,
} = require("../../../controllers/admin/justification");

const router = express.Router();

router.post("/", list); // GET /admin/justifications con filtros
router.get("/:id", get); // GET /admin/justifications/:id
router.put("/:id/status", update); // PUT /admin/justifications/:id/status

module.exports = router;
