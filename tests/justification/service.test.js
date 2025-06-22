const {
  createJustification,
  getAllJustifications,
  getJustificationById,
  updateJustificationStatus,
  deleteJustification,
} = require("@services/justification");

const { createUser, deleteUser } = require("@services/user");

describe("Justification Service", () => {
  let testUser;
  let createdJustification;

  beforeAll(async () => {
    // Create a user to associate with justifications
    testUser = await createUser({
      rut: "99999999-9",
      name: "Justifier",
      email: "justifier@example.com",
      password: "testing123",
      role: "USER",
    });
  });

  it("should create a justification", async () => {
    createdJustification = await createJustification({
      userId: testUser.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000), // +1 day
      type: "MEDICAL",
      description: "Medical leave",
    });

    expect(createdJustification).toHaveProperty("id");
    expect(createdJustification.type).toBe("MEDICAL");
    expect(createdJustification.status).toBe("PENDING");
  });

  it("should fetch all justifications", async () => {
    const justifications = await getAllJustifications();
    expect(Array.isArray(justifications)).toBe(true);
    expect(
      justifications.find((j) => j.id === createdJustification.id)
    ).toBeDefined();
  });

  it("should fetch a justification by ID", async () => {
    const justification = await getJustificationById(createdJustification.id);
    expect(justification).not.toBeNull();
    expect(justification.userId).toBe(testUser.id);
  });

  it("should update the justification status", async () => {
    const updated = await updateJustificationStatus(
      createdJustification.id,
      "APPROVED",
      testUser.id
    );

    expect(updated.status).toBe("APPROVED");
    expect(updated.reviewerId).toBe(testUser.id);
  });

  it("should delete the justification", async () => {
    await deleteJustification(createdJustification.id);
    const deleted = await getJustificationById(createdJustification.id);
    expect(deleted).toBeNull();
  });

  afterAll(async () => {
    await deleteUser(testUser.id);
  });
});
