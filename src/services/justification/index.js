// services/justification/index.js
const prisma = require("../../db/client");

/**
 * 🔹 Lista justificaciones creadas por un usuario (con filtro opcional por fecha)
 */
async function listJustificationsService(creatorId, filters = {}) {
  if (!creatorId) throw new Error("creatorId es obligatorio");

  const where = { creatorId };

  if (filters.startDate && filters.endDate) {
    where.startDate = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  } else if (filters.startDate) {
    where.startDate = { gte: new Date(filters.startDate) };
  } else if (filters.endDate) {
    where.startDate = { lte: new Date(filters.endDate) };
  }

  const data = await prisma.justification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      employeeProfile: true,
      creator: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });

  return data;
}

/**
 * 🔹 Obtiene una justificación por ID
 */
async function getJustificationService(id) {
  return prisma.justification.findUnique({
    where: { id },
    include: {
      employeeProfile: true,
      creator: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * 🔹 Crea una nueva justificación
 *    (mantiene documentUrl para compat, y agrega documentFilename/documentMime)
 */
async function createJustificationService(data) {
  if (!data.employeeRut)
    throw new Error("Falta el RUT del empleado (employeeRut)");

  const profile = await prisma.employeeProfile.findUnique({
    where: { rut: data.employeeRut },
  });

  if (!profile) {
    throw new Error(`No se encontró un perfil con el RUT ${data.employeeRut}`);
  }

  return prisma.justification.create({
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
      // compat + nuevos campos
      documentUrl: data.documentUrl || null,
      documentFilename: data.documentFilename || null,
      documentMime: data.documentMime || null,

      creator: { connect: { id: data.creatorId } },
      employeeProfile: { connect: { id: profile.id } },
      status: "PENDING",
    },
  });
}

/**
 * 🔹 Actualiza el estado de una justificación
 */
async function updateJustificationStatusService(id, status, reviewerId) {
  if (!id) throw new Error("Falta el ID de la justificación");
  if (!status) throw new Error("Debe proporcionar un nuevo estado");

  return prisma.justification.update({
    where: { id },
    data: {
      status,
      reviewerId: reviewerId || null,
      reviewedAt: new Date(),
    },
  });
}

/**
 * 🔹 Elimina una justificación
 */
async function deleteJustificationService(id) {
  if (!id) throw new Error("Falta el ID de la justificación");
  return prisma.justification.delete({ where: { id } });
}

module.exports = {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
};
