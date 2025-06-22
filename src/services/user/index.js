const prisma = require("../../db/client");

async function listUsersService() {
  return prisma.user.findMany();
}

async function getUserService(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

async function createUserService(data) {
  return prisma.user.create({
    data,
  });
}

async function updateUserService(id, data) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

async function deleteUserService(id) {
  return prisma.user.delete({
    where: { id },
  });
}

module.exports = {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService,
};
