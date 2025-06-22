const request = require("supertest");
const app = require("@src/app");

describe("Justification Routes", () => {
  let user;
  let justification;

  beforeAll(async () => {
    // Create a user first to assign to justification
    const res = await request(app).post("/api/users").send({
      rut: "98765432-1",
      name: "Justification Tester",
      email: "tester@example.com",
      password: "test1234",
      role: "USER",
    });
    user = res.body;
  });

  it("should create a justification (POST /api/justifications)", async () => {
    const res = await request(app)
      .post("/api/justifications")
      .send({
        userId: user.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
        type: "PERSONAL",
        description: "Family issue",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.type).toBe("PERSONAL");

    justification = res.body;
  });

  it("should fetch all justifications (GET /api/justifications)", async () => {
    const res = await request(app).get("/api/justifications");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((j) => j.id === justification.id)).toBeDefined();
  });

  it("should update justification status (PUT /api/justifications/:id/status)", async () => {
    const res = await request(app)
      .put(`/api/justifications/${justification.id}/status`)
      .send({
        status: "APPROVED",
        reviewerId: user.id,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("should delete a justification (DELETE /api/justifications/:id)", async () => {
    const res = await request(app).delete(
      `/api/justifications/${justification.id}`
    );
    expect(res.statusCode).toBe(204);
  });

  afterAll(async () => {
    await request(app).delete(`/api/users/${user.id}`);
  });
});
