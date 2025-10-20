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

// 🔒 Lista de orígenes permitidos
const allowedOrigins = [
  "http://localhost:3003",
  "https://appdetdesa.codelco.cl", // prod (reverse proxy)
];

// 🔧 CORS dinámico por origen + preflight
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header("Origin");
  let corsOptions;

  // Permite si no hay Origin (p.ej. curl) o si está en la whitelist
  if (!origin || allowedOrigins.includes(origin)) {
    corsOptions = {
      origin: true,              // refleja el Origin recibido
      credentials: true,         // necesario para cookies
      methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
      allowedHeaders: ["Content-Type","Authorization"],
    };
  } else {
    corsOptions = { origin: false }; // bloquea CORS
  }

  callback(null, corsOptions);
};

// 🧁 Cookies
app.use(cookieParser());

// 🌐 CORS
app.use(cors(corsOptionsDelegate));
// Preflight para cualquier ruta
app.options("*", cors(corsOptionsDelegate));

// 🧠 JSON & forms
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🧾 Log simple
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// 📂 Archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🧭 Ping
app.get("/api/test", (req, res) => {
  res.json({ mensaje: "✅ Backend responde correctamente" });
});

// ✅ Rutas principales (login público, el resto protegido desde /routes)
app.use("/api", routes);

// 🔒 /api/me (lee cookie JWT y devuelve usuario)
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
    return res.status(403).json({ loggedIn: false, message: "Token inválido o expirado" });
  }
});

// 🚪 Cerrar sesión (borra cookie)
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
  });
  res.json({ ok: true, message: "Sesión cerrada correctamente" });
});

// ❌ Not Found
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// 🛠️ Error handler
app.use(errorHandler);

module.exports = app;
