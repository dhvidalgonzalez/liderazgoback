const {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService,
} = require("../../services/user");

async function list(req, res, next) {
  try {
    const users = await listUsersService();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const { id } = req.params;
    const user = await getUserService(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { rut, name, email, password, role } = req.body;
    const user = await createUserService({ rut, name, email, password, role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;
    const user = await updateUserService(id, data);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await deleteUserService(id);
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
