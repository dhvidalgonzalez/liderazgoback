const prisma = require("../../../db/client");

// 🔹 Listar todos los perfiles de empleados (opcional: filtros)
async function listEmployeeProfilesService(filters = {}) {
  const { empresa, gerencia, name, rut, isActive } = filters;

  return await prisma.employeeProfile.findMany({
    where: {
      ...(empresa && { empresa: { contains: empresa, mode: "insensitive" } }),
      ...(gerencia && { gerencia: { contains: gerencia, mode: "insensitive" } }),
      ...(name && { name: { contains: name, mode: "insensitive" } }),
      ...(rut && { rut: { contains: rut, mode: "insensitive" } }),
      ...(isActive !== undefined && { isActive: isActive === "true" }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}


// 🔹 Obtener un perfil por ID
async function getEmployeeProfileService(id) {
  return await prisma.employeeProfile.findUnique({
    where: { id },
  });
}

// 🔹 Crear un nuevo perfil de empleado
async function createEmployeeProfileService(data) {
  return await prisma.employeeProfile.create({
    data,
  });
}

// 🔹 Actualizar un perfil de empleado
async function updateEmployeeProfileService(id, data) {
  return await prisma.employeeProfile.update({
    where: { id },
    data,
  });
}

// 🔹 Eliminar un perfil de empleado
async function deleteEmployeeProfileService(id) {
  return await prisma.employeeProfile.delete({
    where: { id },
  });
}

// src/services/admin/employeeProfile/getByRut.js
async function getEmployeeProfileByRutService(rut) {
  return await prisma.employeeProfile.findUnique({
    where: { rut },
  });
}




module.exports = {
  listEmployeeProfilesService,
  getEmployeeProfileService,
  createEmployeeProfileService,
  updateEmployeeProfileService,
  deleteEmployeeProfileService,
  getEmployeeProfileByRutService,
};
