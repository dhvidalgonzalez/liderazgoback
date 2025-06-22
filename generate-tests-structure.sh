#!/bin/bash

# Crear estructura de carpetas
mkdir -p tests/user
mkdir -p tests/justification

# Contenido base para los tests de servicio
read -r -d '' SERVICE_CONTENT <<'EOF'
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("@services/user/user.service");

describe("User Service", () => {
  it("should run a placeholder test", () => {
    expect(true).toBe(true);
  });
});
EOF

# Contenido base para los tests de controlador
read -r -d '' CONTROLLER_CONTENT <<'EOF'
describe("Controller Tests", () => {
  it("should run a placeholder controller test", () => {
    expect(true).toBe(true);
  });
});
EOF

# Contenido base para los tests de rutas
read -r -d '' ROUTES_USER_CONTENT <<'EOF'
const request = require("supertest");
const app = require("@/src/app");

describe("User Routes", () => {
  it("GET /api/users should return 200 or 404 (if empty)", async () => {
    const res = await request(app).get("/api/users");
    expect([200, 404]).toContain(res.statusCode);
  });
});
EOF

read -r -d '' ROUTES_JUSTIFICATION_CONTENT <<'EOF'
const request = require("supertest");
const app = require("@/src/app");

describe("Justification Routes", () => {
  it("GET /api/justifications should return 200 or 404 (if empty)", async () => {
    const res = await request(app).get("/api/justifications");
    expect([200, 404]).toContain(res.statusCode);
  });
});
EOF

# Crear archivos para USER
echo "$SERVICE_CONTENT" > tests/user/service.test.js
echo "$CONTROLLER_CONTENT" > tests/user/controller.test.js
echo "$ROUTES_USER_CONTENT" > tests/user/routes.test.js

# Crear archivos para JUSTIFICATION
echo "$SERVICE_CONTENT" > tests/justification/service.test.js
echo "$CONTROLLER_CONTENT" > tests/justification/controller.test.js
echo "$ROUTES_JUSTIFICATION_CONTENT" > tests/justification/routes.test.js

echo "✅ Test files created under 'tests/' directory:"
tree tests
