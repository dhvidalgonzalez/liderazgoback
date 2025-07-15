require("dotenv").config();
require("module-alias/register");

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

// 🧁 Parse cookies
app.use(cookieParser());

// 🌐 CORS
app.use(
  cors({
    origin: "http://localhost:3003",
    credentials: true,
  })
);

// 🧠 JSON parsing
app.use(express.json());

// 🧾 Log
app.use((req, res, next) => {
  console.log("📥 Solicitud recibida:");
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// 📂 Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🧭 Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ mensaje: "Backend responde correctamente" });
});

// ✅ Usa rutas con lógica protegida dentro
app.use("/api", routes);

// ❌ Not Found
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// 🛠 Error handler
app.use(errorHandler);

module.exports = app;
