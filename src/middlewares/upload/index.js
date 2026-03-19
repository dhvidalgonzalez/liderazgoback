// middlewares/upload.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

/* ===============================
 * ⚙️ Config desde .env (con defaults)
 * =============================== */
const ENV_UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const ALLOWED_MIME_LIST = (process.env.ALLOWED_MIME || "application/pdf,image/jpeg,image/jpg,image/png")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/* ===============================
 * 📁 Carpeta absoluta de uploads
 * =============================== */
const UPLOADS_DIR = path.isAbsolute(ENV_UPLOAD_DIR)
  ? ENV_UPLOAD_DIR
  : path.resolve(process.cwd(), ENV_UPLOAD_DIR);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/* ===============================
 * ✅ MIME permitidos
 * =============================== */
const ALLOWED_MIME = new Set(ALLOWED_MIME_LIST);

/* ===============================
 * 🔠 Helpers de nombre
 * =============================== */
function slugify(name) {
  return (name || "file")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function randomHex(n = 6) {
  return crypto.randomBytes(n).toString("hex");
}

/* ===============================
 * 🔍 Detección simple por firma binaria (magic numbers)
 *    (sin dependencias nuevas)
 * =============================== */
function detectMimeByMagic(buffer) {
  if (!buffer || buffer.length < 8) return null;

  // PDF: %PDF-
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return "application/pdf";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF (E0..EF)
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  return null;
}

function detectMimeFromFileSync(filePath, maxBytes = 16) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.allocUnsafe(maxBytes);
    const bytesRead = fs.readSync(fd, buf, 0, maxBytes, 0);
    return detectMimeByMagic(buf.slice(0, bytesRead));
  } finally {
    fs.closeSync(fd);
  }
}

/* ===============================
 * 💾 Storage + filtros
 * =============================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path.basename(file.originalname || "file", ext);
    const safeBase = slugify(base).slice(0, 80) || "file";
    const stamp = Date.now();
    const rnd = randomHex(6);
    cb(null, `${stamp}-${rnd}-${safeBase}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
};

/* ===============================
 * 📦 Middleware final
 * =============================== */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024, // MB -> bytes
    files: 1,
  },
});

/* ===============================
 * 🧰 Exports (compat: default y propiedades)
 * =============================== */
module.exports = upload; // compat con router.post("/", upload.single(...))
module.exports.UPLOADS_DIR = UPLOADS_DIR;
module.exports.ALLOWED_MIME = ALLOWED_MIME;
module.exports.detectMimeFromFileSync = detectMimeFromFileSync;
