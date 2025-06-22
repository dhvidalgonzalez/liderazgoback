const request = require("supertest");
const app = require("@src/app");

describe("User Routes", () => {
  let createdUser;

  it("should create a user (POST /api/users)", async () => {
    const res = await request(app).post("/api/users").send({
      rut: "12345678-9",
      name: "Test User",
      email: "testuser@example.com",
      password: "secret123",
      role: "USER",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe("testuser@example.com");

    createdUser = res.body;
  });

  it("should fetch all users (GET /api/users)", async () => {
    const res = await request(app).get("/api/users");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((u) => u.id === createdUser.id)).toBeDefined();
  });

  it("should get a user by ID (GET /api/users/:id)", async () => {
    const res = await request(app).get(`/api/users/${createdUser.id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe("testuser@example.com");
  });

  it("should update a user (PUT /api/users/:id)", async () => {
    const res = await request(app)
      .put(`/api/users/${createdUser.id}`)
      .send({ name: "Updated User" });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Updated User");
  });

  it("should delete a user (DELETE /api/users/:id)", async () => {
    const res = await request(app).delete(`/api/users/${createdUser.id}`);

    expect(res.statusCode).toBe(204);
  });
});
