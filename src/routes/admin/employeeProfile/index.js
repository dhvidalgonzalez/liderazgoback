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

/**
 * 📦 Rutas base: /api/admin/employee-profiles
 * -----------------------------------------------------
 * ⚠️ IMPORTANTE:
 * - Las rutas más específicas (como /rut/:rut) deben declararse ANTES
 *   que las rutas dinámicas (/:id), para evitar conflictos con Express.
 * - Se agregan logs de depuración para confirmar la ejecución del flujo.
 */

// 🧭 Log inicial para verificar montaje
console.log("🧭 [Router] EmployeeProfile routes mounted at /api/admin/employee-profiles");

// ✅ Buscar perfil por RUT (debe ir antes de /:id)
router.get("/rut/:rut", (req, res, next) => {
  console.log("➡️ [GET] /rut/:rut -> getByRut()");
  getByRut(req, res, next);
});

// ✅ Obtener todos los perfiles
router.get("/", (req, res, next) => {
  console.log("➡️ [GET] / -> list()");
  list(req, res, next);
});

// ✅ Obtener perfil por ID
router.get("/:id", (req, res, next) => {
  console.log("➡️ [GET] /:id -> get()");
  get(req, res, next);
});

// ✅ Crear nuevo perfil
router.post("/", (req, res, next) => {
  console.log("➡️ [POST] / -> create()");
  create(req, res, next);
});

// ✅ Actualizar perfil existente
router.put("/:id", (req, res, next) => {
  console.log("➡️ [PUT] /:id -> update()");
  update(req, res, next);
});

// ✅ Eliminar perfil
router.delete("/:id", (req, res, next) => {
  console.log("➡️ [DELETE] /:id -> remove()");
  remove(req, res, next);
});

module.exports = router;
