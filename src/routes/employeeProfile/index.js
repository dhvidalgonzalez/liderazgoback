const express = require("express");
const {
  list,
  get,
  create,
  update,
  remove,
  getByRut, // nuevo controlador
} = require("../../controllers/employeeProfile");

const router = express.Router();

router.get("/", list);               // GET /employeeProfiles
router.get("/:id", get);             // GET /employeeProfiles/:id
router.get("/rut/:rut", getByRut);  // GET /employeeProfiles/rut/:rut   <--- NUEVO
router.post("/", create);            // POST /employeeProfiles
router.put("/:id", update);          // PUT /employeeProfiles/:id
router.delete("/:id", remove);       // DELETE /employeeProfiles/:id

module.exports = router;
