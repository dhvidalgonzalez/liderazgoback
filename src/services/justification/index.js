const prisma = require("../../db/client");

/**
 * 🔹 Lista todas las justificaciones creadas por un usuario
 */
async function listJustificationsService(creatorId) {
  return await prisma.justification.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
    include: {
      employeeProfile: true,
      creator: true,
      reviewer: true,
    },
  });
}

/**
 * 🔹 Obtiene una justificación por su ID
 */
async function getJustificationService(id) {
  return await prisma.justification.findUnique({
    where: { id },
    include: {
      employeeProfile: true,
      creator: true,
      reviewer: true,
    },
  });
}

/**
 * 🔹 Crea una justificación conectando automáticamente el perfil por RUT
 */
async function createJustificationService(data) {
 

  if (!data.employeeRut) {
    throw new Error("Falta el RUT del empleado (employeeRut)");
  }

  // Buscar el perfil del empleado por RUT
  const profile = await prisma.employeeProfile.findUnique({
    where: { rut: data.employeeRut },
  });

  if (!profile) {
    throw new Error(`No se encontró un perfil con el RUT ${data.employeeRut}`);
  }

  // Crear la justificación conectando el perfil automáticamente
  return await prisma.justification.create({
    data: {
      employeeNombre: data.employeeNombre,
      employeeRut: data.employeeRut,
      employeeEmail: data.employeeEmail || "",
      employeeSapCode: data.employeeSapCode || "",
      employeeGerencia: data.employeeGerencia || "",
      employeeEmpresa: data.employeeEmpresa || "",
      employeePosition: data.employeePosition || "",

      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      type: data.type,
      description: data.description || "",
      documentUrl: data.documentUrl || null,

      creator: {
        connect: { id: data.creatorId },
      },

      employeeProfile: {
        connect: { id: profile.id },
      },
    },
  });
}

/**
 * 🔹 Actualiza el estado de una justificación (revisión)
 */
async function updateJustificationStatusService(id, status, reviewerId) {
  return await prisma.justification.update({
    where: { id },
    data: {
      status,
      reviewerId,
      reviewedAt: new Date(),
    },
  });
}

/**
 * 🔹 Elimina una justificación
 */
async function deleteJustificationService(id) {
  return await prisma.justification.delete({
    where: { id },
  });
}

module.exports = {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
};
