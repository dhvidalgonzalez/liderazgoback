const prisma = require("../../db/client");

// ==========================
// 🔹 Listar Justificaciones
// ==========================
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

// ==========================
// 🔹 Obtener una Justificación
// ==========================
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

// ==========================
// 🔹 Crear Justificación (con perfil obligatorio)
// ==========================
async function createJustificationService(data) {
 

  if (!data.employeeProfileId) {
    throw new Error("Falta el ID del perfil del empleado (employeeProfileId)");
  }

  const payload = {
    employeeNombre: data.employeeNombre,
    employeeRut: data.employeeRut,
    employeeEmail: data.employeeEmail || "",
    employeeSapCode: data.employeeSapCode || "",
    employeeGerencia: data.employeeGerencia || "",
    employeeEmpresa: data.employeeEmpresa || "",
    employeePosition: data.employeePosition || "",

    startDate: data.startDate,
    endDate: data.endDate,
    type: data.type,
    description: data.description || "",
    documentUrl: data.documentUrl || null,

    creator: {
      connect: { id: data.creatorId },
    },

    // ✅ Conectar siempre un perfil existente
    employeeProfile: {
      connect: { id: data.employeeProfileId },
    },
  };

  return await prisma.justification.create({ data: payload });
}

// ==========================
// 🔹 Actualizar estado de la justificación
// ==========================
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

// ==========================
// 🔹 Eliminar Justificación
// ==========================
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
