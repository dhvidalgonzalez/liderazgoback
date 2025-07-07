require("module-alias/register");

const express = require("express");
const cors = require("cors");
const path = require("path"); // ✅ Importa path para archivos estáticos
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

// ✅ Habilita CORS para el frontend en localhost:3003
app.use(
  cors({
    origin: "http://localhost:3003",
    credentials: true, // si necesitas enviar cookies o headers de autenticación
  })
);

// ✅ Permite recibir JSON
app.use(express.json());

// ✅ Sirve archivos estáticos desde /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Agrupa las rutas bajo /api
app.use("/api", routes);

// ✅ Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;
