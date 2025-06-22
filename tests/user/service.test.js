const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("@src/services/user"); // assuming you're using path alias

describe("User Service", () => {
  let createdUser;

  it("should create a user", async () => {
    createdUser = await createUser({
      rut: "12345678-9",
      name: "John Doe",
      email: "john.doe@example.com",
      password: "securepassword123",
      role: "ADMIN", // from Role enum
    });

    expect(createdUser).toHaveProperty("id");
    expect(createdUser.email).toBe("john.doe@example.com");
    expect(createdUser.role).toBe("ADMIN");
  });

  it("should fetch all users", async () => {
    const users = await getAllUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.some((u) => u.id === createdUser.id)).toBe(true);
  });

  it("should fetch a user by ID", async () => {
    const user = await getUserById(createdUser.id);
    expect(user).not.toBeNull();
    expect(user.name).toBe("John Doe");
  });

  it("should update a user", async () => {
    const updated = await updateUser(createdUser.id, {
      name: "Johnny Updated",
    });
    expect(updated.name).toBe("Johnny Updated");
  });

  it("should delete a user", async () => {
    await deleteUser(createdUser.id);
    const user = await getUserById(createdUser.id);
    expect(user).toBeNull();
  });
});
