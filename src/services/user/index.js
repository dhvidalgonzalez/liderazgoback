const prisma = require("../../db/client");

async function listUsersService() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
  });
}

async function getUserService(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

async function createUserService(data) {
  return prisma.user.create({
    data: {
      rut: data.rut.trim().toUpperCase(),
      name: data.name.trim(),
      email: data.email || null,
      password: data.password || "placeholder",
      role: data.role || "USER",
    },
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

async function getOrCreateUserService({ rut, name }) {
  const rutNormalized = rut.trim().toUpperCase();

  try {
    let user = await prisma.user.findUnique({ where: { rut: rutNormalized } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          rut: rutNormalized,
          name: name.trim(),
          role: "USER",
        },
      });
      console.log(`🆕 Usuario creado: ${user.name} (${user.rut})`);
    } else {
      console.log(`✅ Usuario existente: ${user.name} (${user.rut})`);
    }

    return user;
  } catch (err) {
    console.error("❌ Error en getOrCreateUserService:", err);
    throw err;
  }
}

module.exports = {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService,
  getOrCreateUserService,
};
