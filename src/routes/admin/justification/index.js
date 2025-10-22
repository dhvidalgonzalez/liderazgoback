const express = require("express");
const {
  list,
  get,
  update,
} = require("../../../controllers/admin/justification");

const router = express.Router();

/**
 * 📦 Rutas base: /api/admin/justifications
 * -----------------------------------------------------
 * - Listado admite filtros en body (POST) o solo query (GET):
 *   Query: ?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
 *   Body (opcional en POST): { type, status, createdAtStart, createdAtEnd, search }
 * - Mantengo POST por compatibilidad y agrego GET para clientes REST.
 */

// ✅ Listar con filtros + paginación (GET o POST)
router.get("/", list);   // GET /admin/justifications
router.post("/", list);  // POST /admin/justifications (compat)

// ✅ Obtener por ID (debe ir después del "/")
router.get("/:id", get); // GET /admin/justifications/:id

// ✅ Actualizar estado
router.put("/:id/status", update); // PUT /admin/justifications/:id/status

module.exports = router;
