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
 * ✅ Sanitize filename to avoid path traversal (no slashes)
 */
function sanitizeFilename(name) {
  return String(name || "").replace(/[\/\\]+/g, "");
}

/**
 * 🔹 Crea una nueva justificación
 *    - Verifica archivo por firma binaria
 *    - Guarda documentFilename/documentMime + documentUrl (compat)
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
        // limpiar archivo inválido
        try { fs.unlinkSync(absPath); } catch {}
        return res.status(400).json({ error: "Archivo inválido o corrupto" });
      }

      // 3) Debe estar en lista permitida (config)
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
      // compat + nuevos:
      documentUrl,
      documentFilename,
      documentMime,
      creatorId: req.user.userId,
    };

    const justification = await createJustificationService(data);
    return res.status(201).json(justification);
  } catch (err) {
    console.error("❌ Error en create controller:", err);
    // Si algo falla y hay archivo, no lo dejamos huérfano
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
 * 🔽 Descarga segura del documento
 *  - Verifica existencia
 *  - Verifica firma binaria coincide con lo guardado
 *  - Sirve con cabeceras adecuadas
 */
async function download(req, res, next) {
  try {
    const { id } = req.params;
    const j = await getJustificationService(id);

    if (!j) return res.status(404).json({ error: "Justificación no encontrada" });

    if (!j.documentFilename && !j.documentUrl) {
      return res.status(404).json({ error: "La justificación no tiene documento adjunto" });
    }

    // Resolvemos nombre de archivo en disco
    let filename = j.documentFilename;
    if (!filename && j.documentUrl) {
      // /uploads/<nombre>
      const base = String(j.documentUrl || "").split("/").pop();
      filename = sanitizeFilename(base);
    }

    if (!filename) {
      return res.status(404).json({ error: "No se pudo determinar el archivo del adjunto" });
    }

    const absPath = path.resolve(UPLOADS_DIR, filename);

    // Chequeo de contención: el archivo debe estar DENTRO de UPLOADS_DIR
    if (!absPath.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(400).json({ error: "Ruta inválida" });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "Archivo no encontrado en servidor" });
    }

    // Detectamos MIME real
    const detected = detectMimeFromFileSync(absPath);
    if (!detected) {
      return res.status(415).json({ error: "No se pudo determinar el tipo del archivo (posible corrupción)" });
    }

    // Si hay documentMime guardado, lo comparamos
    if (j.documentMime && j.documentMime !== detected) {
      return res.status(409).json({
        error: "El tipo real del archivo no coincide con el registrado",
        registrado: j.documentMime,
        detectado: detected,
      });
    }

    // Nombre de descarga legible (si tenemos employeeNombre/ type / fechas)
    const downloadName =
      `justificacion_${sanitizeFilename(j.employeeRut || "rut")}_${sanitizeFilename(j.type || "doc")}.${detected === "application/pdf" ? "pdf" : detected === "image/png" ? "png" : "jpg"}`;

    res.setHeader("Content-Type", detected);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    const stat = fs.statSync(absPath);
    res.setHeader("Content-Length", stat.size);

    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error("❌ Error en download controller:", err);
    next(err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  download, // nuevo
};
