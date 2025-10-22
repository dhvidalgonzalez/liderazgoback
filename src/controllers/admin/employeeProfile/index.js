const { 
  listEmployeeProfilesService,
  getEmployeeProfileService,
  getEmployeeProfileByRutService,
  createEmployeeProfileService,
  updateEmployeeProfileService,
  deleteEmployeeProfileService,
  upsertEmployeeProfileByRutService, // 👈 nuevo
} = require("../../../services/admin/employeeProfile");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const normalizeRut = (rut) =>
  rut ? String(rut).replace(/\./g, "").trim().toUpperCase() : "";

const todayISO = () => new Date().toISOString().split("T")[0];

// 📋 Listar (paginado)
async function list(req, res, next) {
  try {
    const {
      page = "1",
      pageSize = String(DEFAULT_PAGE_SIZE),
      q = "",
      sortBy = "name",
      sortOrder = "asc",
      isActive,
      empresa,
      gerencia,
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedPageSize = Math.min(
      Math.max(parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );

    const result = await listEmployeeProfilesService({
      page: parsedPage,
      pageSize: parsedPageSize,
      search: String(q || "").trim(),
      sortBy: String(sortBy || "name"),
      sortOrder: String(sortOrder || "asc").toLowerCase() === "desc" ? "desc" : "asc",
      filters: {
        isActive:
          typeof isActive === "string"
            ? isActive.toLowerCase() === "true"
              ? true
              : isActive.toLowerCase() === "false"
              ? false
              : undefined
            : undefined,
        empresa: empresa ? String(empresa).trim() : undefined,
        gerencia: gerencia ? String(gerencia).trim() : undefined,
      },
    });

    res.json(result); // { data, pagination }
  } catch (err) {
    next(err);
  }
}

// 🔍 Obtener perfil por ID
async function get(req, res, next) {
  try {
    const { id } = req.params;
    const employee = await getEmployeeProfileService(id);

    if (!employee) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// 🔎 Obtener perfil por RUT
async function getByRut(req, res, next) {
  try {
    const { rut } = req.params;

    if (!rut) {
      return res.status(400).json({ message: "Debe proporcionar un RUT válido" });
    }

    const rutNorm = normalizeRut(rut);
    const employee = await getEmployeeProfileByRutService(rutNorm);
    console.log("🚀 ~ getByRut ~ employee:", employee)

    if (!employee) {
      return res.status(404).json({ message: "Empleado no encontrado con ese RUT" });
    }

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// ➕ Crear perfil
async function create(req, res, next) {
  try {
    const {
      rut,
      name,
      email,
      sapCode,
      gerencia,
      empresa,
      position,
      startDate,
      endDate,
      isActive,
    } = req.body;

    if (!rut || !name || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Los campos rut, name, startDate y endDate son obligatorios" });
    }

    const newEmployee = await createEmployeeProfileService({
      rut: normalizeRut(rut),
      name,
      email,
      sapCode,
      gerencia,
      empresa,
      position,
      startDate,
      endDate,
      isActive,
    });

    res.status(201).json(newEmployee);
  } catch (err) {
    next(err);
  }
}

// ✏️ Actualizar perfil existente
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;

    const employeeExists = await getEmployeeProfileService(id);
    if (!employeeExists) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const updatedEmployee = await updateEmployeeProfileService(id, {
      ...data,
      rut: data?.rut ? normalizeRut(data.rut) : employeeExists.rut,
    });
    res.json(updatedEmployee);
  } catch (err) {
    next(err);
  }
}

// 🔁 Upsert por RUT (crea si no existe / actualiza si existe) — fechas por defecto si no vienen
async function upsertByRut(req, res, next) {
  try {
    const {
      rut,
      name,
      email,
      sapCode,
      gerencia,
      empresa,
      position,
      startDate,
      endDate,
      isActive,
    } = req.body || {};

    if (!rut || !name) {
      return res
        .status(400)
        .json({ message: "Los campos rut y name son obligatorios para upsert." });
    }

    const rutNorm = normalizeRut(rut);

    // Fechas por defecto si no vienen
    let _start = startDate ? new Date(startDate) : new Date(todayISO());
    let _end = endDate ? new Date(endDate) : new Date("2099-12-31");
    if (_end < _start) _end = _start;

    const saved = await upsertEmployeeProfileByRutService({
      rut: rutNorm,
      name,
      email,
      sapCode,
      gerencia,
      empresa,
      position,
      startDate: _start,
      endDate: _end,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    res.status(200).json(saved);
  } catch (err) {
    next(err);
  }
}

// 🔴 Eliminar perfil
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const employeeExists = await getEmployeeProfileService(id);
    if (!employeeExists) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    await deleteEmployeeProfileService(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  getByRut,
  create,
  update,
  remove,
  upsertByRut, // 👈 export nuevo
};
