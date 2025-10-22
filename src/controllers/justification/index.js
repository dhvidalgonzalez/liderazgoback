const {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
} = require("../../services/justification");

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

    // Filtros opcionales
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
      return res
        .status(404)
        .json({ error: "Justificación no encontrada" });
    }

    return res.json(justification);
  } catch (err) {
    console.error("❌ Error en get controller:", err);
    next(err);
  }
}

/**
 * 🔹 Crea una nueva justificación
 */
async function create(req, res, next) {
  try {
    const file = req.file;
    const documentUrl = file ? `/uploads/${file.filename}` : null;

    const { file: _, startDate, endDate, employeePosition, ...rest } = req.body;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (
      !parsedStartDate ||
      !parsedEndDate ||
      isNaN(parsedStartDate) ||
      isNaN(parsedEndDate)
    ) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }

    const data = {
      ...rest,
      employeePosition,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      documentUrl,
      creatorId: req.user.userId,
    };

    const justification = await createJustificationService(data);
    return res.status(201).json(justification);
  } catch (err) {
    console.error("❌ Error en create controller:", err);
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

module.exports = {
  list,
  get,
  create,
  update,
  remove,
};
