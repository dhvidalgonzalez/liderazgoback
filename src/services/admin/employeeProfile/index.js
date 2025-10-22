const prisma = require("../../../db/client");

/* --------------------------------------------
   Helper: normalizar DateTime para Prisma
   Acepta: Date | number(timestamp) | 'YYYY-MM-DD' | ISO string
   - Si no viene valor -> undefined (Prisma ignora el campo)
   - 'YYYY-MM-DD' -> inicio/fin del día en hora local
--------------------------------------------- */
const toDateTime = (val, { endOfDay = false } = {}) => {
  if (val == null || val === "") return undefined;
  if (val instanceof Date) return val;

  if (typeof val === "number") {
    const d = new Date(val);
    if (isNaN(d.getTime())) throw new Error(`Fecha inválida (timestamp): ${val}`);
    return d;
  }

  const s = String(val).trim();

  // 'YYYY-MM-DD' => local time (sin 'Z')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
    const d = new Date(`${s}${suffix}`);
    if (isNaN(d.getTime())) throw new Error(`Fecha inválida (YYYY-MM-DD): ${val}`);
    return d;
  }

  const d = new Date(s); // ISO u otros parseables
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: ${val}`);
  return d;
};

/**
 * 📋 Listar perfiles con paginación, búsqueda y orden
 * params: { page, pageSize, search, sortBy, sortOrder, filters }
 */
async function listEmployeeProfilesService(params = {}) {
  const {
    page = 1,
    pageSize = 10,
    search = "",
    sortBy = "name",
    sortOrder = "asc",
    filters = {},
  } = params;

  const ALLOWED_SORT_FIELDS = new Set([
    "name",
    "rut",
    "email",
    "sapCode",
    "gerencia",
    "empresa",
    "position",
    "startDate",
    "endDate",
    "isActive",
  ]);

  const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "name";
  const safeSortOrder = sortOrder === "desc" ? "desc" : "asc";

  const whereSearch =
    search && search.trim().length > 0
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { rut: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { empresa: { contains: search, mode: "insensitive" } },
            { gerencia: { contains: search, mode: "insensitive" } },
            { position: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

  const whereFilters = {
    ...(typeof filters.isActive === "boolean" ? { isActive: filters.isActive } : {}),
    ...(filters.empresa ? { empresa: { equals: filters.empresa } } : {}),
    ...(filters.gerencia ? { gerencia: { equals: filters.gerencia } } : {}),
  };

  const where = { AND: [whereSearch, whereFilters] };

  const totalItems = await prisma.employeeProfile.count({ where });

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

  const data = await prisma.employeeProfile.findMany({
    where,
    orderBy: { [safeSortBy]: safeSortOrder },
    skip,
    take: pageSize,
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

/** 🔍 Obtener un perfil por ID */
async function getEmployeeProfileService(id) {
  return prisma.employeeProfile.findUnique({ where: { id } });
}

/** 🔍 Buscar un perfil por RUT */
async function getEmployeeProfileByRutService(rut) {
  return prisma.employeeProfile.findUnique({ where: { rut } });
}

/** ➕ Crear un nuevo perfil de empleado (normaliza fechas) */
async function createEmployeeProfileService(data) {
  return prisma.employeeProfile.create({
    data: {
      rut: data.rut,
      name: data.name,
      email: data.email ?? null,
      sapCode: data.sapCode ?? null,
      gerencia: data.gerencia ?? null,
      empresa: data.empresa ?? null,
      position: data.position ?? null,
      startDate: toDateTime(data.startDate, { endOfDay: false }),
      endDate: toDateTime(data.endDate, { endOfDay: true }),
      isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    },
  });
}

/** ✏️ Actualizar un perfil existente (normaliza fechas) */
async function updateEmployeeProfileService(id, data) {
  return prisma.employeeProfile.update({
    where: { id },
    data: {
      rut: data.rut,
      name: data.name,
      email: data.email ?? null,
      sapCode: data.sapCode ?? null,
      gerencia: data.gerencia ?? null,
      empresa: data.empresa ?? null,
      position: data.position ?? null,
      // undefined => Prisma no toca el campo
      startDate: toDateTime(data.startDate, { endOfDay: false }),
      endDate: toDateTime(data.endDate, { endOfDay: true }),
      isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
    },
  });
}

/** 🔁 Upsert por RUT (crea o actualiza, sobrescribiendo con los datos recibidos) */
async function upsertEmployeeProfileByRutService(data) {
  const payload = {
    rut: data.rut,
    name: data.name,
    email: data.email ?? null,
    sapCode: data.sapCode ?? null,
    gerencia: data.gerencia ?? null,
    empresa: data.empresa ?? null,
    position: data.position ?? null,
    startDate: toDateTime(data.startDate, { endOfDay: false }),
    endDate: toDateTime(data.endDate, { endOfDay: true }),
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
  };

  return prisma.employeeProfile.upsert({
    where: { rut: data.rut },
    create: payload,
    update: payload, // sobrescribe con datos más recientes
  });
}

/** 🔴 Eliminar un perfil (protegiendo relaciones) */
async function deleteEmployeeProfileService(id) {
  try {
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
  upsertEmployeeProfileByRutService,
};
