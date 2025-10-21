const {
  listEmployeeProfilesService,
  getEmployeeProfileService,
  getEmployeeProfileByRutService,
  createEmployeeProfileService,
  updateEmployeeProfileService,
  deleteEmployeeProfileService,
} = require("../../../services/admin/employeeProfile");

// 📋 Listar todos los empleados
async function list(req, res, next) {
  try {
    const employees = await listEmployeeProfilesService();
    res.json(employees);
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

    const employee = await getEmployeeProfileByRutService(rut.trim().toUpperCase());

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

    const updatedEmployee = await updateEmployeeProfileService(id, data);
    res.json(updatedEmployee);
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
};
