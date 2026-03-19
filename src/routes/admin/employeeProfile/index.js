const express = require("express");
const {
  list,
  get,
  create,
  update,
  remove,
  getByRut,
  upsertByRut, // 👈 nuevo
} = require("../../../controllers/admin/employeeProfile");

const router = express.Router();

/**
 * 📦 Rutas base: /api/admin/employee-profiles
 * -----------------------------------------------------
 * - Soporta paginación y filtros vía query:
 *   ?page=1&pageSize=10&q=texto&sortBy=name&sortOrder=asc&isActive=true&empresa=Codelco&gerencia=Chuqui
 * - /rut/:rut y /upsert-by-rut deben ir antes que /:id
 */

console.log("🧭 [Router] EmployeeProfile mounted at /api/admin/employee-profiles");

// ✅ Buscar perfil por RUT (antes de /:id)
router.get("/rut/:rut", (req, res, next) => {
  console.log("➡️ [GET] /rut/:rut -> getByRut()");
  getByRut(req, res, next);
});

// ✅ Upsert por RUT (crear/actualizar con defaults de fechas)
router.post("/upsert-by-rut", (req, res, next) => {
  console.log("➡️ [POST] /upsert-by-rut -> upsertByRut()");
  upsertByRut(req, res, next);
});

// ✅ Listar (paginado por query)
router.get("/", (req, res, next) => {
  console.log("➡️ [GET] / -> list()");
  list(req, res, next);
});

// ✅ Obtener por ID
router.get("/:id", (req, res, next) => {
  console.log("➡️ [GET] /:id -> get()");
  get(req, res, next);
});

// ✅ Crear
router.post("/", (req, res, next) => {
  console.log("➡️ [POST] / -> create()");
  create(req, res, next);
});

// ✅ Actualizar
router.put("/:id", (req, res, next) => {
  console.log("➡️ [PUT] /:id -> update()");
  update(req, res, next);
});

// ✅ Eliminar
router.delete("/:id", (req, res, next) => {
  console.log("➡️ [DELETE] /:id -> remove()");
  remove(req, res, next);
});

module.exports = router;
