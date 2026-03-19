const prisma = require("../../db/client");

/**
 * 📋 Listar todos los perfiles de empleados
 */
async function listEmployeeProfilesService() {
  return prisma.employeeProfile.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * 🔍 Obtener un perfil por ID
 */
async function getEmployeeProfileService(id) {
  return prisma.employeeProfile.findUnique({
    where: { id },
  });
}

/**
 * 🔍 Buscar un perfil por RUT (opcionalmente útil para sincronización)
 */
async function getEmployeeProfileByRutService(rut) {
  return prisma.employeeProfile.findUnique({
    where: { rut },
  });
}

/**
 * ➕ Crear un nuevo perfil de empleado
 */
async function createEmployeeProfileService(data) {
  return prisma.employeeProfile.create({
    data: {
      rut: data.rut,
      name: data.name,
      email: data.email || null,
      sapCode: data.sapCode || null,
      gerencia: data.gerencia || null,
      empresa: data.empresa || null,
      position: data.position || null,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * ✏️ Actualizar un perfil existente
 */
async function updateEmployeeProfileService(id, data) {
  return prisma.employeeProfile.update({
    where: { id },
    data: {
      rut: data.rut,
      name: data.name,
      email: data.email || null,
      sapCode: data.sapCode || null,
      gerencia: data.gerencia || null,
      empresa: data.empresa || null,
      position: data.position || null,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive,
    },
  });
}

/**
 * 🔴 Eliminar un perfil (solo si no tiene justificaciones asociadas)
 */
async function deleteEmployeeProfileService(id) {
  try {
    // Comprueba si existen justificaciones asociadas
    const count = await prisma.justification.count({
      where: { employeeProfileId: id },
    });

    if (count > 0) {
      throw new Error("No se puede eliminar: existen justificaciones asociadas.");
    }

    return prisma.employeeProfile.delete({ where: { id } });
  } catch (err) {
    console.error("❌ Error al eliminar perfil de empleado:", err);
    throw err;
  }
}

module.exports = {
  listEmployeeProfilesService,
  getEmployeeProfileService,
  getEmployeeProfileByRutService,
  createEmployeeProfileService,
  updateEmployeeProfileService,
  deleteEmployeeProfileService,
};
