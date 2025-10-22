const {
  listJustificationsService,
  getJustificationService,
  updateJustificationStatusService,
} = require("../../../services/admin/justification");

/**
 * 🔹 Listar justificaciones (Admin)
 * - Admite filtros: type, status, createdAtStart, createdAtEnd, search
 * - Soporta paginación y orden opcional
 */
async function list(req, res, next) {
  try {
    const {
      type,
      status,
      createdAtStart,
      createdAtEnd,
      search,
    } = req.body || {};

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

/**
 * 🔹 Obtener una justificación por ID
 */
async function get(req, res, next) {
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

/**
 * 🔹 Actualiza el estado de una justificación
 * - Determina automáticamente el reviewerId desde req.user
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewerComment, reviewerCause } = req.body;

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
  update,
};
