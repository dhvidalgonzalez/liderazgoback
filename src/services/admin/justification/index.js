const prisma = require("../../../db/client");

/** 🔢 Helper interno por si alguien llama el servicio con page/pageSize "raros" */
function toIntOrDefault(value, def) {
  if (value === undefined || value === null || value === "") return def;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || !Number.isFinite(n)) return def;
  return n;
}

/**
 * 🔹 Lista justificaciones con filtros + paginación/orden/búsqueda
 */
async function listJustificationsService(params = {}) {
  let {
    filters = {},
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  // 🛡️ Blindaje suave de paginación (por si viene string o NaN desde otro caller)
  page = toIntOrDefault(page, 1);
  pageSize = toIntOrDefault(pageSize, 10);
  if (page <= 0) page = 1;
  if (pageSize <= 0) pageSize = 10;

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
      // 🆕 Creador: para poder mostrar su nombre/RUT en app y Excel
      creator: { select: { id: true, name: true, rut: true, email: true } },
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
      // 🆕 También traemos creator aquí por si lo necesitas en el detalle
      creator: { select: { id: true, name: true, rut: true, email: true } },
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
