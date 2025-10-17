const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { faker } = require("@faker-js/faker");

async function main() {


  // Creamos 10 usuarios
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        rut:
          faker.string.uuid().slice(0, 8) +
          "-" +
          Math.floor(Math.random() * 10),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        role: i === 1 ? "ADMIN" : "USER",
      },
    });

    console.log(`👤 Created user ${user.name}`);

    // Creamos 10 justificaciones por usuario
    for (let j = 1; j <= 10; j++) {
      const justification = await prisma.justification.create({
        data: {
          employeeNombre: faker.person.fullName(),
          employeeRut:
            faker.string.uuid().slice(0, 8) +
            "-" +
            Math.floor(Math.random() * 10),
          employeeEmail: faker.internet.email(),
          employeeSapCode: faker.string.alphanumeric(8),
          employeeGerencia: faker.commerce.department(),

          startDate: faker.date.recent({ days: 30 }),
          endDate: faker.date.soon({ days: 5 }),
          type: faker.helpers.arrayElement([
            "MEDICAL",
            "VACATION",
            "LEGAL",
            "ACTIVIDAD",
            "COMISION",
            "OTHER",
          ]),
          description: faker.lorem.sentence(),
          documentUrl: faker.internet.url(),
          status: faker.helpers.arrayElement([
            "PENDING",
            "APPROVED",
            "REJECTED",
          ]),

          creatorId: user.id,
          reviewerId: i === 1 ? user.id : null,
          reviewedAt: new Date(),
        },
      });

      console.log(`📄 Created justification ${j} for ${user.name}`);
    }
  }

  console.log("✅ Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
