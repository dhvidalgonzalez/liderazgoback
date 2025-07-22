const express = require("express");
const {
  list,
  get,
  create,
  update,
  remove,
  getByRut,
} = require("../../../controllers/admin/employeeProfile");

const router = express.Router();

// 📄 GET /employee-profiles?search=vidal
router.get("/", list);

// 📄 GET /employee-profiles/:id
router.get("/:id", get);

// 📄 POST /employee-profiles
router.post("/", create);

// 📄 PUT /employee-profiles/:id
router.put("/:id", update);


// 🗑️ DELETE /employee-profiles/:id
router.delete("/:id", remove);

router.get("/rut/:rut", getByRut);

module.exports = router;
