const {
  listJustificationsService,
  getJustificationService,
  updateJustificationStatusService,
} = require("../../../services/admin/justification");

async function list(req, res, next) {
  try {
    const {
      type,
      status,
      createdAtStart,
      createdAtEnd,
      search,
    } = req.body;

    const filters = {
      type: type || null,
      status: status || null,
      createdAtStart: createdAtStart ? new Date(createdAtStart) : null,
      createdAtEnd: createdAtEnd ? new Date(createdAtEnd) : null,
      search: search || null,
    };

    const justifications = await listJustificationsService(filters);

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

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewerComment, reviewerCause } = req.body;

    const reviewerId = req.user.userId;


    const justification = await updateJustificationStatusService(
      id,
      status,
      reviewerId,
      reviewerComment,
      reviewerCause
    );

    res.json(justification);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  update,
};
