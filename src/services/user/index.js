const prisma = require("../../db/client");

async function listUsersService() {
  return [
    {
      id: "u1",
      name: "Juan Pérez",
      rut: "12.345.678-9",
      email: "juan.perez@empresa.cl",
      sapCode: "EMP001",
      gerencia: "Gerencia 1",
    },
    {
      id: "u2",
      name: "Ana Gómez",
      rut: "11.223.334-5",
      email: "ana.gomez@empresa.cl",
      sapCode: "EMP002",
      gerencia: "Gerencia 2",
    },
    {
      id: "u3",
      name: "Carlos Sánchez",
      rut: "22.222.222-2",
      email: "carlos.sanchez@empresa.cl",
      sapCode: "EMP003",
      gerencia: "Gerencia 1",
    },
    {
      id: "u4",
      name: "María López",
      rut: "13.456.789-0",
      email: "maria.lopez@empresa.cl",
      sapCode: "EMP004",
      gerencia: "Gerencia 2",
    },
    {
      id: "u5",
      name: "Pedro Ramírez",
      rut: "10.987.654-3",
      email: "pedro.ramirez@empresa.cl",
      sapCode: "EMP005",
      gerencia: "Gerencia 3",
    },
    {
      id: "u6",
      name: "Laura Castillo",
      rut: "16.789.012-3",
      email: "laura.castillo@empresa.cl",
      sapCode: "EMP006",
      gerencia: "Gerencia 1",
    },
    {
      id: "u7",
      name: "Fernando Torres",
      rut: "15.444.333-2",
      email: "fernando.torres@empresa.cl",
      sapCode: "EMP007",
      gerencia: "Gerencia 2",
    },
    {
      id: "u8",
      name: "Daniela Rojas",
      rut: "17.123.456-7",
      email: "daniela.rojas@empresa.cl",
      sapCode: "EMP008",
      gerencia: "Gerencia 3",
    },
    {
      id: "u9",
      name: "Andrés Fuentes",
      rut: "14.999.888-6",
      email: "andres.fuentes@empresa.cl",
      sapCode: "EMP009",
      gerencia: "Gerencia 1",
    },
    {
      id: "u10",
      name: "Camila Vidal",
      rut: "18.888.777-4",
      email: "camila.vidal@empresa.cl",
      sapCode: "EMP010",
      gerencia: "Gerencia 2",
    },
  ];
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

async function getOrCreateUserService({ rut, name }) {
  let user = await prisma.user.findUnique({ where: { rut } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        rut,
        name,
        email: "", // correo falso por ahora
        password: "placeholder",            // si es requerido
        role: "USER"
      },
    });
  }

  return user;
}


module.exports = {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService,
  getOrCreateUserService,
};
