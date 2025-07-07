const prisma = require("../../db/client");

async function listJustificationsService(creatorId) {
  return await prisma.justification.findMany({
    where: { creatorId }, // 👈 aplica el filtro
    orderBy: { createdAt: "desc" },
  });
}

async function getJustificationService(id) {
  return await prisma.justification.findUnique({
    where: { id },
  });
}

async function createJustificationService(data) {
  console.log("🚀 ~ createJustificationService ~ data:", data);
  return await prisma.justification.create({
    data,
  });
}

async function updateJustificationStatusService(id, status, reviewerId) {
  return await prisma.justification.update({
    where: { id },
    data: { status, reviewerId },
  });
}

async function deleteJustificationService(id) {
  return await prisma.justification.delete({
    where: { id },
  });
}

module.exports = {
  listJustificationsService,
  getJustificationService,
  createJustificationService,
  updateJustificationStatusService,
  deleteJustificationService,
};
