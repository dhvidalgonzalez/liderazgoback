const {
  listEmployeeProfiles,
  getEmployeeProfile,
  createEmployeeProfile,
  updateEmployeeProfile,
  deleteEmployeeProfile,
  getEmployeeProfileByRut, // nuevo servicio
} = require("../services/employeeProfile");

async function list(req, res, next) {
  try {
    const employees = await listEmployeeProfiles();
    res.json(employees);
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    const { id } = req.params;
    const employee = await getEmployeeProfile(id);

    if (!employee) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    res.json(employee);
  } catch (error) {
    next(error);
  }
}

// NUEVO: Buscar por rut
async function getByRut(req, res, next) {
  try {
    const { rut } = req.params;

    const employee = await getEmployeeProfileByRut(rut);
  

    if (!employee) {
      return res.status(404).json({ message: "Empleado no encontrado con ese RUT" });
    }

    res.json(employee);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const newEmployee = await createEmployeeProfile(req.body);
    res.status(201).json(newEmployee);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;

    const employeeExists = await getEmployeeProfile(id);

    if (!employeeExists) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const updatedEmployee = await updateEmployeeProfile(id, req.body);
    res.json(updatedEmployee);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const employeeExists = await getEmployeeProfile(id);
    if (!employeeExists) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    await deleteEmployeeProfile(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  get,
  getByRut, // exportamos el nuevo controlador
  create,
  update,
  remove,
};
