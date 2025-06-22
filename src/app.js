require("module-alias/register");

const express = require("express");
const cors = require("cors"); // ✅ Importa CORS
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

app.use(express.json());

// Todas las rutas agrupadas bajo /api
app.use("/api", routes);

// Middleware para manejar errores
app.use(errorHandler);

module.exports = app;
