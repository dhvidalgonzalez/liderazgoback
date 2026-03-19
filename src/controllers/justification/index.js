// controllers/justification/index.js
const path = require("path");
const fs = require("fs");
const { Prisma } = require("@prisma/client");

const {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
} = require("../../services/justification");

// Utilidades de upload (compat con export default + props)
const uploadUtils = require("../../middlewares/upload");
const { UPLOADS_DIR, ALLOWED_MIME, detectMimeFromFileSync } = uploadUtils;

/* ==========================
 * Helpers filename seguros
 * ========================== */
function sanitizeFilename(name) {
  return String(name || "").replace(/[\/\\]+/g, "");
}

function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toSafe(s) {
  return stripDiacritics(s)
    .replace(/[^\w\s.-]/g, "") // quita caracteres raros
    .replace(/\s+/g, "_")      // espacios -> _
    .replace(/_+/g, "_")       // colapsa múltiples _
    .replace(/^_+|_+$/g, "")   // trim _
    .toLowerCase();
}

function fmtDate(d) {
  const dt = new Date(d);
  const z = (n) => String(n).padStart(2, "0");
  return isNaN(+dt) ? "fecha" : `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}

/* ==========================
 * Normalizadores de datos
 * ========================== */
const normalizeRut = (rut) =>
  rut ? String(rut).replace(/\./g, "").trim().toUpperCase() : "";

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
};

const normalizeSapCode = (value) => {
  // Acepta number | string | null | undefined => retorna string | null
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
};

const normalizeRequiredString = (value, fieldName = "field") => {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`El campo ${fieldName} es obligatorio`);
  return s;
};

const parseDateOrThrow = (value, fieldName) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Fecha inválida en ${fieldName}`);
  return d;
};

/* ==========================
 * Manejador de errores Prisma
 * ========================== */
function handleControllerError(err, res, next) {
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message: "Datos inválidos para Justification.",
      type: "PrismaClientValidationError",
      detail: err.message,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Conflicto de datos (restricción única).",
        type: "PrismaClientKnownRequestError",
        code: err.code,
        meta: err.meta,
      });
    }
    return res.status(400).json({
      message: "Error en la operación con base de datos.",
      type: "PrismaClientKnownRequestError",
      code: err.code,
      meta: err.meta,
    });
  }

  return next(err);
}

/**
 * 🔹 Lista todas las justificaciones del usuario autenticado
 *    (sin paginación, con filtro opcional de fechas)
 */
async function list(req, res, next) {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      return res.status(400).json({
        error: "Falta el parámetro creatorId (token inválido o ausente)",
      });
    }

    const { startDate, endDate } = req.query;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const justifications = await listJustificationsService(creatorId, filters);
    return res.json(justifications);
  } catch (err) {
    console.error("❌ Error en list controller:", err);
    handleControllerError(err, res, next);
  }
}

/**
 * 🔹 Obtiene una justificación por ID
 */
async function get(req, res, next) {
  try {
    const { id } = req.params;
    const justification = await getJustificationService(id);

    if (!justification) {
      return res.status(404).json({ error: "Justificación no encontrada" });
    }

    return res.json(justification);
  } catch (err) {
    console.error("❌ Error en get controller:", err);
    handleControllerError(err, res, next);
  }
}

/**
 * 🔹 Crea una nueva justificación
 *    - Verifica archivo por firma binaria
 *    - Guarda documentFilename/documentMime + documentUrl (compat)
 *    - Normaliza campos snapshot del trabajador (incluye employeeSapCode)
 */
async function create(req, res, next) {
  const file = req.file;
  try {
    let documentUrl = null;
    let documentFilename = null;
    let documentMime = null;

    if (file) {
      // 1) Ruta absoluta del archivo subido
      const absPath = path.resolve(UPLOADS_DIR, sanitizeFilename(file.filename));

      // 2) Detección MIME real (firma binaria). Si no se reconoce, error.
      const detected = detectMimeFromFileSync(absPath);
      if (!detected) {
        try { fs.unlinkSync(absPath); } catch {}
        return res.status(400).json({ error: "Archivo inválido o corrupto" });
      }

      // 3) Debe estar en lista permitida
      if (!ALLOWED_MIME.has(detected)) {
        try { fs.unlinkSync(absPath); } catch {}
        return res.status(400).json({
          error: `El archivo no es de un tipo permitido (detectado: ${detected})`,
        });
      }

      // 4) Aceptamos y persistimos
      documentFilename = file.filename; // nombre en disco
      documentMime = detected;          // tipo real
      documentUrl = `/uploads/${file.filename}`; // compat con frontend actual
    }

    // Extraemos body y normalizamos
    const {
      file: _omitFile,
      startDate,
      endDate,
      employeePosition,
      employeeRut,
      employeeNombre,
      employeeEmail,
      employeeSapCode,
      employeeGerencia,
      employeeEmpresa,
      type,
      description,
      ...rest // por compat futura
    } = req.body || {};

    // Fechas obligatorias
    const parsedStartDate = parseDateOrThrow(startDate, "startDate");
    const parsedEndDate = parseDateOrThrow(endDate, "endDate");
    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({ error: "endDate no puede ser anterior a startDate" });
    }

    // Snapshot del trabajador (normalizado)
    const normalizedPayload = {
      ...rest, // por si el service usa campos extra (no romper compat)
      employeeNombre: normalizeRequiredString(employeeNombre, "employeeNombre"),
      employeeRut: normalizeRequiredString(normalizeRut(employeeRut), "employeeRut"),
      employeeEmail: normalizeOptionalString(employeeEmail),
      employeeSapCode: normalizeSapCode(employeeSapCode), // 👈 blindado
      employeeGerencia: normalizeOptionalString(employeeGerencia),
      employeeEmpresa: normalizeOptionalString(employeeEmpresa),
      employeePosition: normalizeOptionalString(employeePosition),

      // Datos de la justificación
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      type: normalizeRequiredString(type, "type"),
      description: normalizeOptionalString(description),

      // Documento adjunto
      documentUrl,
      documentFilename,
      documentMime,

      // Usuario creador
      creatorId: req.user?.userId,
    };

    if (!normalizedPayload.creatorId) {
      // mantengo tu validación suave (como en list)
      return res.status(400).json({
        error: "Token inválido o ausente (creatorId no disponible)",
      });
    }

    const justification = await createJustificationService(normalizedPayload);
    return res.status(201).json(justification);
  } catch (err) {
    console.error("❌ Error en create controller:", err);
    if (file) {
      const absPath = path.resolve(UPLOADS_DIR, sanitizeFilename(file.filename));
      try { fs.unlinkSync(absPath); } catch {}
    }
    handleControllerError(err, res, next);
  }
}

/**
 * 🔹 Actualiza estado de revisión de una justificación
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewerId } = req.body;

    const justification = await updateJustificationStatusService(
      id,
      status,
      reviewerId
    );
    return res.json(justification);
  } catch (err) {
    console.error("❌ Error en update controller:", err);
    handleControllerError(err, res, next);
  }
}

/**
 * 🔹 Elimina una justificación
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await deleteJustificationService(id);
    return res.status(204).end();
  } catch (err) {
    console.error("❌ Error en remove controller:", err);
    handleControllerError(err, res, next);
  }
}

/**
 * 🔽 Descarga segura del documento (con nombre “bonito”)
 */
async function download(req, res, next) {
  try {
    const { id } = req.params;
    const j = await getJustificationService(id);
    if (!j) return res.status(404).json({ error: "Justificación no encontrada" });

    if (!j.documentFilename && !j.documentUrl) {
      return res.status(404).json({ error: "La justificación no tiene documento adjunto" });
    }

    const sanitize = (s) => String(s || "").replace(/[\/\\]+/g, "");

    // Resolver nombre físico en disco
    let filename = j.documentFilename;
    if (!filename && j.documentUrl) {
      filename = sanitize(String(j.documentUrl).split("/").pop());
    }
    if (!filename) {
      return res.status(404).json({ error: "No se pudo determinar el archivo" });
    }

    const absPath = path.resolve(UPLOADS_DIR, filename);
    if (!absPath.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(400).json({ error: "Ruta inválida" });
    }
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "Archivo no encontrado en servidor" });
    }

    // ===== Nombre “bonito” desde la justificación =====
    const baseRut   = toSafe(j.employeeRut || "rut");
    const baseNom   = toSafe(j.employeeNombre || "trabajador");
    const baseFecha = fmtDate(j.startDate || j.createdAt || Date.now());
    const baseType  = toSafe(j.type || "doc");
    const ext       = path.extname(absPath) || "";

    const MAX = 150; // evita nombres larguísimos
    let niceName = `justificacion_${baseRut}_${baseNom}_${baseFecha}_${baseType}${ext}`;
    if (niceName.length > MAX) {
      const stem = `justificacion_${baseRut}_${baseNom}`.slice(0, 60);
      niceName = `${stem}_${baseFecha}_${baseType}${ext}`;
    }

    // Evitar compresión/interferencia y exponer headers para el frontend
    res.setHeader("Content-Encoding", "identity");
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");

    // Deja que Express maneje el stream y Content-Length
    return res.download(absPath, niceName, (err) => err && next(err));
  } catch (err) {
    handleControllerError(err, res, next);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  download,
};
