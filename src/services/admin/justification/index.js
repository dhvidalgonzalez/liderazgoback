const prisma = require("../../../db/client");

// 🔹 Lista justificaciones con filtros (para el admin)
async function listJustificationsService(filters = {}) {
  const { type, status, createdAtStart, createdAtEnd, search } = filters;

  const where = {};

  if (type) where.type = type;
  if (status) where.status = status;

  if (createdAtStart || createdAtEnd) {
    where.createdAt = {};
    if (createdAtStart) where.createdAt.gte = new Date(createdAtStart);
    if (createdAtEnd) where.createdAt.lte = new Date(createdAtEnd);
  }

  if (search) {
    where.OR = [
      { employeeNombre: { contains: search, mode: "insensitive" } },
      { employeeRut: { contains: search, mode: "insensitive" } },
    ];
  }

  return await prisma.justification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

// 🔹 Obtener una justificación por ID
async function getJustificationService(id) {
  return await prisma.justification.findUnique({
    where: { id },
  });
}

// 🔹 Actualizar el estado de una justificación
async function updateJustificationStatusService(id, status, reviewerId) {
  return await prisma.justification.update({
    where: { id },
    data: { status, reviewerId },
  });
}

module.exports = {
  listJustificationsService,
  getJustificationService,
  updateJustificationStatusService,
};
