const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const {
  listJustificationsService,
  getJustificationService,
  updateJustificationStatusService,
} = require("../../../services/admin/justification");

// Usa el mismo middleware de uploads (solo para resolver rutas)
const uploadUtils = require("../../../middlewares/upload");
const { UPLOADS_DIR } = uploadUtils;

/* ==========================
 * Helpers
 * ========================== */
function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function toSafe(s) {
  return stripDiacritics(s)
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
function fmtDate(d) {
  const dt = new Date(d);
  const z = (n) => String(n).padStart(2, "0");
  return isNaN(+dt) ? "" : `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}

/** Normaliza fechas YYYY-MM-DD a bordes de día local (00:00:00 y 23:59:59.999) */
function normalizeDateRange(createdAtStart, createdAtEnd) {
  let start = null, end = null;
  if (createdAtStart) {
    start = new Date(`${createdAtStart}T00:00:00`);
    if (isNaN(+start)) start = null;
  }
  if (createdAtEnd) {
    end = new Date(`${createdAtEnd}T23:59:59.999`);
    if (isNaN(+end)) end = null;
  }
  return { start, end };
}

/* ========== LISTAR ========== */
async function list(req, res) {
  try {
    const qp = req.query || {};


    const bp = req.body || {};
    const type           = qp.type           ?? bp.type           ?? "";
    const status         = qp.status         ?? bp.status         ?? "";
    const createdAtStart = qp.createdAtStart ?? bp.createdAtStart ?? "";
    const createdAtEnd   = qp.createdAtEnd   ?? bp.createdAtEnd   ?? "";
    const search         = qp.search         ?? bp.search         ?? "";

    const sortBy    = qp.sortBy    ?? bp.sortBy    ?? "createdAt";
    const sortOrder = (qp.sortOrder ?? bp.sortOrder ?? "desc").toLowerCase();

    const page     = parseInt(qp.page     ?? bp.page     ?? 1);
    const pageSize = parseInt(qp.pageSize ?? bp.pageSize ?? 10);

    const { start, end } = normalizeDateRange(createdAtStart, createdAtEnd);

    const result = await listJustificationsService({
      filters: {
        type,
        status,
        search,
        createdAtStart: start ? start.toISOString() : "",
        createdAtEnd:   end   ? end.toISOString()   : "",
      },
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Error en list controller (admin):", err);
    res.status(500).json({ error: "Error al listar justificaciones." });
  }
}

/* ========== OBTENER ========== */
async function get(req, res) {
  try {
    const { id } = req.params;
    const justification = await getJustificationService(id);
    if (!justification) return res.status(404).json({ error: "Justificación no encontrada." });
    res.json(justification);
  } catch (err) {
    console.error("❌ Error en get controller (admin):", err);
    res.status(500).json({ error: "Error al obtener la justificación." });
  }
}

/* ========== DESCARGA DOCUMENTO ========== */
async function download(req, res, next) {
  try {
    const { id } = req.params;
    const j = await getJustificationService(id);
    if (!j) return res.status(404).json({ error: "Justificación no encontrada." });

    if (!j.documentFilename && !j.documentUrl) {
      return res.status(404).json({ error: "La justificación no tiene documento adjunto." });
    }

    const sanitize = (s) => String(s || "").replace(/[\/\\]+/g, "");
    let filename = j.documentFilename;
    if (!filename && j.documentUrl) filename = sanitize(String(j.documentUrl).split("/").pop());
    if (!filename) return res.status(404).json({ error: "No se pudo determinar el archivo del adjunto." });

    const absPath = path.resolve(UPLOADS_DIR, filename);
    if (!absPath.startsWith(path.resolve(UPLOADS_DIR))) return res.status(400).json({ error: "Ruta inválida." });
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: "Archivo no encontrado en servidor." });

    const baseRut   = toSafe(j.employeeRut || "rut");
    const baseNom   = toSafe(j.employeeNombre || "trabajador");
    const baseFecha = fmtDate(j.startDate || j.createdAt || Date.now());
    const baseType  = toSafe(j.type || "doc");
    const ext       = path.extname(absPath) || "";

    const MAX = 150;
    let niceName = `justificacion_${baseRut}_${baseNom}_${baseFecha}_${baseType}${ext}`;
    if (niceName.length > MAX) {
      const stem = `justificacion_${baseRut}_${baseNom}`.slice(0, 60);
      niceName = `${stem}_${baseFecha}_${baseType}${ext}`;
    }

    res.setHeader("Content-Encoding", "identity");
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");
    return res.download(absPath, niceName, (err) => err && next(err));
  } catch (err) {
    console.error("❌ Error en admin download controller:", err);
    next(err);
  }
}

/* ========== UPDATE (sin tocar documento) ========== */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { status, reviewerComment, reviewerCause } = req.body || {};
    delete req.body?.documentUrl;
    delete req.body?.documentFilename;
    delete req.body?.documentMime;
    delete req.body?.file;

    const reviewerId = req.user?.userId || req.user?.id || req.user?.sub || null;
    if (!reviewerId) {
      return res.status(401).json({ error: "Usuario revisor no identificado o sin sesión activa." });
    }

    const updated = await updateJustificationStatusService(id, {
      status,
      reviewerId,
      reviewerCause,
      reviewerComment,
    });

    res.json({ message: "Justificación actualizada correctamente.", data: updated });
  } catch (err) {
    console.error("❌ Error en update controller (admin):", err);
    res.status(500).json({ error: "Error interno al actualizar la justificación.", details: err.message });
  }
}

/* ========== EXPORTAR EXCEL (respeta filtros EXACTOS) ========== */
/* ========== EXPORTAR EXCEL (mismo comportamiento que la vista) ========== */
async function exportExcel(req, res) {
  try {
    const qp = req.query || {};
    const bp = req.body || {};

    const type           = qp.type           ?? bp.type           ?? "";
    const status         = qp.status         ?? bp.status         ?? "";
    const createdAtStart = qp.createdAtStart ?? bp.createdAtStart ?? "";
    const createdAtEnd   = qp.createdAtEnd   ?? bp.createdAtEnd   ?? "";
    const search         = qp.search         ?? bp.search         ?? "";
    const sortBy         = qp.sortBy         ?? bp.sortBy         ?? "createdAt";
    const sortOrder      = (qp.sortOrder     ?? bp.sortOrder      ?? "desc").toLowerCase();

    // 🔒 Rango (mismos bordes de día que usa la vista)
    const { start, end } = normalizeDateRange(createdAtStart, createdAtEnd);

    // 👇 Traemos TODO con los filtros "globales" (type/status/search)...
    //    pero SIN pasar createdAtStart/End al servicio.
    const result = await listJustificationsService({
      filters: {
        type,
        status,
        search,
        createdAtStart: "",  // ← no filtramos en BD
        createdAtEnd:   "",  // ← no filtramos en BD
      },
      page: 1,
      pageSize: 250000,
      sortBy,
      sortOrder,
    });

    // Soporta varios formatos de salida del servicio
    const all =
      (Array.isArray(result) && result) ||
      result?.items ||
      result?.rows ||
      result?.data ||
      [];

    // ✅ Aplica el filtro de fechas en memoria (igual que la vista)
    const rows = all.filter((j) => {
      const created = j?.createdAt ? new Date(j.createdAt) : null;
      if (!created || Number.isNaN(+created)) return false;
      return (!start || created >= start) && (!end || created <= end);
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Justificaciones");

    ws.columns = [
      { header: "ID",                   key: "id", width: 36 },
      { header: "Creado",               key: "createdAt", width: 18 },
      { header: "Inicio",               key: "startDate", width: 18 },
      { header: "Término",              key: "endDate", width: 18 },
      { header: "Estado",               key: "status", width: 14 },
      { header: "Tipo",                 key: "type", width: 18 },

      { header: "Trabajador Nombre",    key: "employeeNombre", width: 28 },
      { header: "Trabajador RUT",       key: "employeeRut", width: 16 },
      { header: "Trabajador Email",     key: "employeeEmail", width: 28 },
      { header: "Trabajador SAP",       key: "employeeSapCode", width: 16 },
      { header: "Trabajador Gerencia",  key: "employeeGerencia", width: 22 },
      { header: "Trabajador Empresa",   key: "employeeEmpresa", width: 22 },
      { header: "Trabajador Cargo",     key: "employeePosition", width: 22 },

      { header: "EmployeeProfile ID",   key: "employeeProfileId", width: 36 },
      { header: "Descripción",          key: "description", width: 50 },

      { header: "Documento URL",        key: "documentUrl", width: 30 },
      { header: "Documento Nombre",     key: "documentFilename", width: 32 },
      { header: "Documento MIME",       key: "documentMime", width: 20 },

      { header: "Revisado En",          key: "reviewedAt", width: 18 },
      { header: "Reviewer ID",          key: "reviewerId", width: 36 },
      { header: "Motivo Revisor",       key: "reviewerCause", width: 24 },
      { header: "Comentario Revisor",   key: "reviewerComment", width: 40 },

      { header: "Creador ID",           key: "creatorId", width: 36 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const j of rows) {
      ws.addRow({
        id: j.id || "",
        createdAt: fmtDate(j.createdAt),
        startDate: fmtDate(j.startDate),
        endDate: fmtDate(j.endDate),
        status: j.status || "",
        type: j.type || "",

        employeeNombre: j.employeeNombre || "",
        employeeRut: j.employeeRut || "",
        employeeEmail: j.employeeEmail || "",
        employeeSapCode: j.employeeSapCode || "",
        employeeGerencia: j.employeeGerencia || "",
        employeeEmpresa: j.employeeEmpresa || "",
        employeePosition: j.employeePosition || "",

        employeeProfileId: j.employeeProfileId || "",
        description: j.description || "",

        documentUrl: j.documentUrl || "",
        documentFilename: j.documentFilename || "",
        documentMime: j.documentMime || "",

        reviewedAt: fmtDate(j.reviewedAt),
        reviewerId: j.reviewerId || "",
        reviewerCause: j.reviewerCause || "",
        reviewerComment: j.reviewerComment || "",

        creatorId: j.creatorId || "",
      });
    }

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

    const safeType  = toSafe(type || "todos");
    const safeStat  = toSafe(status || "todos");
    const safeStart = createdAtStart ? String(createdAtStart) : "inicio";
    const safeEnd   = createdAtEnd ? String(createdAtEnd) : "hoy";
    const fileName  = `justificaciones_${safeType}_${safeStat}_${safeStart}_a_${safeEnd}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Error exportando Excel (admin):", err);
    res.status(500).json({ error: "Error al exportar Excel.", details: err.message });
  }
}

module.exports = {
  list,
  get,
  update,       // estado/comentarios
  download,     // descarga de adjunto
  exportExcel,  // exportación Excel con filtros
};
