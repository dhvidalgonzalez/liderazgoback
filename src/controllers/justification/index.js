const {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
} = require("../../services/justification");

async function list(req, res, next) {
  try {
    const justifications = await listJustificationsService();
    console.log("🚀 ~ list ~ justifications:", justifications);
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
    const data = {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    };
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
