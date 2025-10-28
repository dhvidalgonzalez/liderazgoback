// src/services/admin/justification/index.js
const prisma = require("../../../db/client");

/**
 * 🔹 Lista justificaciones con filtros + paginación/orden/búsqueda
 */
async function listJustificationsService(params = {}) {
  const {
    filters = {},
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const { type, status, createdAtStart, createdAtEnd, search } = filters;

  const ALLOWED_SORT_FIELDS = new Set([
    "createdAt",
    "updatedAt",
    "status",
    "type",
    "employeeNombre",
    "employeeRut",
  ]);

  const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  // Construcción del filtro dinámico
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

  const totalItems = await prisma.justification.count({ where });
  if (totalItems === 0) {
    return {
      data: [],
      pagination: {
        page: 1,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const skip = (currentPage - 1) * pageSize;

  const data = await prisma.justification.findMany({
    where,
    orderBy: { [safeSortBy]: safeSortOrder },
    skip,
    take: pageSize,
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
      employeeProfile: { select: { id: true, name: true, empresa: true } },
    },
  });

  return {
    data,
    pagination: {
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    },
  };
}

/**
 * 🔹 Obtener una justificación por ID (incluye campos de documento)
 */
async function getJustificationService(id) {
  if (!id) throw new Error("Falta el ID de la justificación.");

  return await prisma.justification.findUnique({
    where: { id },
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
      employeeProfile: true,
    },
  });
}

/**
 * 🔹 (Opcional) Solo metadatos del documento para verificación/descarga
 *     Útil si quieres un endpoint /verify o checks rápidos sin traer relaciones.
 */
async function getJustificationDocumentMetaService(id) {
  if (!id) throw new Error("Falta el ID de la justificación.");

  return await prisma.justification.findUnique({
    where: { id },
    select: {
      id: true,
      employeeRut: true,
      type: true,
      documentUrl: true,
      documentFilename: true,
      documentMime: true,
      updatedAt: true,
    },
  });
}

/**
 * 🔹 Actualizar estado + comentarios/causa del revisor
 */
async function updateJustificationStatusService(id, payload) {
  const { status, reviewerId, reviewerComment = null, reviewerCause = null } =
    payload;

  if (!id || !status || !reviewerId) {
    throw new Error("Faltan parámetros requeridos para la actualización.");
  }

  return await prisma.justification.update({
    where: { id },
    data: {
      status,
      reviewerId,
      reviewerComment,
      reviewerCause,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      reviewer: { select: { id: true, name: true } },
    },
  });
}

module.exports = {
  listJustificationsService,
  getJustificationService,
  getJustificationDocumentMetaService, // ← opcional, no rompe nada
  updateJustificationStatusService,
};
