// controllers/justification/index.js
const path = require("path");
const fs = require("fs");
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
    next(err);
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
    next(err);
  }
}

/**
 * 🔹 Crea una nueva justificación
 *    - Verifica archivo por firma binaria
 *    - Guarda documentFilename/documentMime + documentUrl (compat)
 */
async function create(req, res, next) {
  const file = req.file;
  console.log("🚀 ~ create ~ file:", file)
  try {
    let documentUrl = null;
    let documentFilename = null;
    let documentMime = null;

    if (file) {
      // 1) Ruta absoluta del archivo subido
      const absPath = path.resolve(UPLOADS_DIR, sanitizeFilename(file.filename));
      console.log("🚀 ~ create ~ absPath:", absPath)

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

    const {
      file: _omitFile,
      startDate,
      endDate,
      employeePosition,
      ...rest
    } = req.body;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (!parsedStartDate || !parsedEndDate || isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }

    const data = {
      ...rest,
      employeePosition,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      documentUrl,
      documentFilename,
      documentMime,
      creatorId: req.user.userId,
    };
    console.log("🚀 ~ create ~ data:", data)

    const justification = await createJustificationService(data);
    return res.status(201).json(justification);
  } catch (err) {
    console.error("❌ Error en create controller:", err);
    if (file) {
      const absPath = path.resolve(UPLOADS_DIR, sanitizeFilename(file.filename));
      try { fs.unlinkSync(absPath); } catch {}
    }
    next(err);
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
    next(err);
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
    next(err);
  }
}

/**
 * 🔽 Descarga segura del documento (con nombre “bonito”)
 */
// controllers/justification/index.js (fragmento)


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
    next(err);
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
