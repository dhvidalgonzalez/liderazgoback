require("dotenv").config();
require("module-alias/register");

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET;

// ============================================================
// 🌐 Lista de orígenes permitidos
// ============================================================
const allowedOrigins = [
  "http://127.0.0.1:3003",   
  "http://localhost:3003",          // desarrollo local
  "https://appdetdesa.codelco.cl",  // dominio de producción (reverse proxy)
  "https://10.18.19.27",
  "http://10.18.19.27",
];

// ============================================================
// 🔧 CORS dinámico por origen + preflight
// ============================================================
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header("Origin");
  let corsOptions;

  if (!origin || allowedOrigins.includes(origin)) {
    corsOptions = {
      origin: true, // refleja el Origin recibido
      credentials: true, // necesario para cookies httpOnly
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    };
  } else {
    corsOptions = { origin: false }; // bloquea CORS no permitido
  }

  callback(null, corsOptions);
};

// ============================================================
// 🧁 Middleware base
// ============================================================
app.use(cookieParser());
app.use(cors(corsOptionsDelegate));

// ⚙️ Preflight para TODAS las rutas (fix path-to-regexp)
app.options(/.*/, cors(corsOptionsDelegate));

// 🧠 Parse JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🧾 Log simple de requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// 📂 Archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================
// 🧭 Ping de prueba
// ============================================================
app.get("/api/test", (req, res) => {
  res.json({ mensaje: "✅ Backend responde correctamente" });
});

// ============================================================
// ✅ Rutas principales (login público, el resto protegido)
// ============================================================
app.use("/api", routes);

// ============================================================
// 🔒 /api/me - Verifica JWT desde cookie y devuelve datos usuario
// ============================================================
app.get("/api/me", (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    return res
      .status(401)
      .json({ loggedIn: false, message: "No autorizado: token no presente" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({
      loggedIn: true,
      user: {
        rut: decoded.rut,
        nombre: decoded.nombre,
        admin: decoded.admin,
        perfiles: decoded.perfiles,
        nivelAcceso: decoded.nivelAcceso,
      },
    });
  } catch (err) {
    console.error("❌ /api/me JWT inválido:", err.message);
    return res
      .status(403)
      .json({ loggedIn: false, message: "Token inválido o expirado" });
  }
});

// ============================================================
// 🚪 Cerrar sesión (elimina cookie)
// ============================================================
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction, // solo en HTTPS
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
  });
  res.json({ ok: true, message: "Sesión cerrada correctamente" });
});

// ============================================================
// ❌ Not Found
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ============================================================
// 🛠️ Error handler global
// ============================================================
app.use(errorHandler);

module.exports = app;
