const {
  listEmployeeProfilesService,
  getEmployeeProfileService,
  createEmployeeProfileService,
  updateEmployeeProfileService, // ✅ usamos el servicio
  deleteEmployeeProfileService,
  getEmployeeProfileByRutService,
} = require("../../../services/admin/employeeProfile");

// 🔹 Listar todos los perfiles (con posibles filtros)
async function list(req, res, next) {
  try {
    const filters = req.query;
    const profiles = await listEmployeeProfilesService(filters);
    res.json(profiles);
  } catch (err) {
    next(err);
  }
}

// 🔹 Obtener un perfil por ID
async function get(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await getEmployeeProfileService(id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// 🔹 Crear un nuevo perfil
async function create(req, res, next) {
  try {
    const { startDate, endDate, ...rest } = req.body;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (!parsedStartDate || !parsedEndDate || isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }

    const data = {
      ...rest,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    };

    const profile = await createEmployeeProfileService(data);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
}

// 🔹 Actualizar un perfil existente
async function update(req, res, next) {
  try {
    const { startDate, endDate, ...rest } = req.body;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "El campo id es requerido" });
    }

    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    const data = {
      ...rest,
      ...(parsedStartDate && { startDate: parsedStartDate }),
      ...(parsedEndDate && { endDate: parsedEndDate }),
    };

    const updatedProfile = await updateEmployeeProfileService(id, data); // ✅ nuevo servicio

    res.json(updatedProfile);
  } catch (err) {
    next(err);
  }
}

// 🔹 Eliminar un perfil
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await deleteEmployeeProfileService(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// 🔹 Obtener por RUT
async function getByRut(req, res, next) {
  try {
    const { rut } = req.params;
    const profile = await getEmployeeProfileByRutService(rut);
    res.json({ exists: !!profile, profile });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  getByRut,
};
