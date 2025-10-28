// src/controllers/admin/justification/index.js
const path = require("path");
const fs = require("fs");
const {
  listJustificationsService,
  getJustificationService,
  updateJustificationStatusService,
} = require("../../../services/admin/justification");

// Utilidades de upload (mismo middleware; no habilita subida aquí)
const uploadUtils = require("../../../middlewares/upload");
const { UPLOADS_DIR, detectMimeFromFileSync } = uploadUtils;

function sanitizeFilename(name) {
  return String(name || "").replace(/[\/\\]+/g, "");
}

/* ========== EXISTENTES ========== */
async function list(req, res) {
  try {
    const { type, status, createdAtStart, createdAtEnd, search } = req.body || {};
    const qp = req.query || {};
    const bp = req.body || {};

    const page = parseInt(qp.page ?? bp.page ?? 1);
    const pageSize = parseInt(qp.pageSize ?? bp.pageSize ?? 10);
    const sortBy = qp.sortBy ?? bp.sortBy ?? "createdAt";
    const sortOrder = (qp.sortOrder ?? bp.sortOrder ?? "desc").toLowerCase();

    const result = await listJustificationsService({
      filters: { type, status, createdAtStart, createdAtEnd, search },
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Error en list controller:", err);
    res.status(500).json({ error: "Error al listar justificaciones." });
  }
}

async function get(req, res) {
  try {
    const { id } = req.params;
    const justification = await getJustificationService(id);

    if (!justification)
      return res.status(404).json({ error: "Justificación no encontrada." });

    res.json(justification);
  } catch (err) {
    console.error("❌ Error en get controller:", err);
    res.status(500).json({ error: "Error al obtener la justificación." });
  }
}

/* ========== NUEVO: Descarga segura (solo lectura) ========== */
async function download(req, res, next) {
  try {
    const { id } = req.params;
    const j = await getJustificationService(id);

    if (!j) return res.status(404).json({ error: "Justificación no encontrada." });
    if (!j.documentFilename && !j.documentUrl) {
      return res.status(404).json({ error: "La justificación no tiene documento adjunto." });
    }

    // Resolver nombre de archivo en disco
    let filename = j.documentFilename;
    if (!filename && j.documentUrl) {
      const base = String(j.documentUrl || "").split("/").pop();
      filename = sanitizeFilename(base);
    }
    if (!filename) {
      return res.status(404).json({ error: "No se pudo determinar el archivo del adjunto." });
    }

    const absPath = path.resolve(UPLOADS_DIR, filename);

    // Seguridad: debe estar dentro de UPLOADS_DIR
    if (!absPath.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(400).json({ error: "Ruta inválida." });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "Archivo no encontrado en servidor." });
    }

    // Verificar MIME real por firma binaria
    const detected = detectMimeFromFileSync(absPath);
    if (!detected) {
      return res.status(415).json({ error: "No se pudo determinar el tipo del archivo (posible corrupción)." });
    }
    if (j.documentMime && j.documentMime !== detected) {
      return res.status(409).json({
        error: "El tipo real del archivo no coincide con el registrado.",
        registrado: j.documentMime,
        detectado: detected,
      });
    }

    const downloadName =
      `justificacion_${sanitizeFilename(j.employeeRut || "rut")}_${sanitizeFilename(j.type || "doc")}.${detected === "application/pdf" ? "pdf" : detected === "image/png" ? "png" : "jpg"}`;

    res.setHeader("Content-Type", detected);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    const stat = fs.statSync(absPath);
    res.setHeader("Content-Length", stat.size);

    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error("❌ Error en admin download controller:", err);
    next(err);
  }
}

/* ========== Update blindado: NO permite tocar documento ========== */
async function update(req, res) {
  try {
    const { id } = req.params;

    // Solo permitimos estado y campos de revisión
    const { status, reviewerComment, reviewerCause } = req.body || {};

    // ⚠️ Bloqueo explícito: ignorar cualquier intento de tocar el documento
    // (por si algún cliente intenta enviar estos campos)
    delete req.body?.documentUrl;
    delete req.body?.documentFilename;
    delete req.body?.documentMime;
    delete req.body?.file;

    const reviewerId =
      req.user?.userId || req.user?.id || req.user?.sub || null;

    if (!reviewerId) {
      return res
        .status(401)
        .json({ error: "Usuario revisor no identificado o sin sesión activa." });
    }

    const updated = await updateJustificationStatusService(id, {
      status,
      reviewerId,
      reviewerCause,
      reviewerComment,
    });

    res.json({
      message: "Justificación actualizada correctamente.",
      data: updated,
    });
  } catch (err) {
    console.error("❌ Error en update controller:", err);
    res.status(500).json({
      error: "Error interno al actualizar la justificación.",
      details: err.message,
    });
  }
}

module.exports = {
  list,
  get,
  update,    // ← solo estado/comentarios
  download,  // ← solo descarga
};
