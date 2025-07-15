const {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
} = require("../../services/justification");

async function list(req, res, next) {
  try {
    const  creatorId  = req.user.userId;

    if (!creatorId) {
      return res.status(400).json({ error: "Falta el parámetro creatorId" });
    }

    const justifications = await listJustificationsService(creatorId); // 👈 pasa el ID

    res.json(justifications);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const { id } = req.params;
    const justification = await getJustificationService(id);
    res.json(justification);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const file = req.file;
    const documentUrl = file ? `/uploads/${file.filename}` : null;
    const { file: _, startDate, endDate, ...rest } = req.body;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }

    // 👇 Inyecta el ID del usuario autenticado desde el token
    const data = {
      ...rest,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      documentUrl,
      creatorId: req.user.userId,
    };
    console.log("🚀 ~ create ~ data.eq.user.userId:", req.user.userId)

    const justification = await createJustificationService(data);
    res.status(201).json(justification);
  } catch (err) {
    next(err);
  }
}


async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewerId } = req.body;
    const justification = await updateJustificationStatusService(
      id,
      status,
      reviewerId
    );
    res.json(justification);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await deleteJustificationService(id);
    res.status(204).end();
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
};
