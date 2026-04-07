const jwt = require("jsonwebtoken");
const {
  loginService,
  changePasswordService,
  validateTempPasswordService,
  updatePasswordService,
} = require("../../services/login");

// =========================
// Helpers login dummy
// =========================
function getLoginMode() {
  return (process.env.LOGIN_MODE || "real").toLowerCase();
}

function isDummyLoginEnabled() {
  const mode = getLoginMode();
  return mode === "dev" || mode === "prod" || mode === "dummy";
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "dummy-dev-secret";
}

function buildDummyUser(req) {
  const mode = getLoginMode();
  const body = req.body || {};

  return {
    rut: body?.rut || "11111111-1",
    rutfull: body?.rut || "11111111-1",
    nombre: mode === "prod" ? "Usuario Dummy Producción" : "Usuario Dummy Desarrollo",
    nombrefull:
      mode === "prod" ? "Usuario Dummy Producción" : "Usuario Dummy Desarrollo",
    correo:
      mode === "prod"
        ? "dummy-prod@local.test"
        : "dummy-dev@local.test",
    perfil:
      mode === "prod"
        ? "prod"
        : "dev",
    accesotemporal: 1,
    dummyLogin: true,
  };
}

function buildDummyToken(user) {
  const mode = getLoginMode();

  const payload = {
    sub: user.rut,
    rut: user.rut,
    rutfull: user.rutfull,
    nombre: user.nombre,
    nombrefull: user.nombrefull,
    perfil: user.perfil,
    dummyLogin: true,
    loginMode: mode,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "2h",
  });
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    maxAge: 2 * 60 * 60 * 1000, // 2h
  });
}

// 🔐 Iniciar sesión
async function login(req, res, next) {
  try {
    const { rut, clave } = req.body;

    if (!rut || !clave) {
      return res.status(400).json({ error: "RUT y clave son requeridos" });
    }

    // =========================
    // Login dummy por flag
    // LOGIN_MODE=real -> login real
    // LOGIN_MODE=dev/prod/dummy -> login dummy
    // =========================
    if (isDummyLoginEnabled()) {
      const dummyUser = buildDummyUser(req);
      const token = buildDummyToken(dummyUser);

      setAuthCookie(res, token);

      return res.status(200).json({
        success: true,
        dummyLogin: true,
        mode: getLoginMode(),
        user: dummyUser,
      });
    }

    const result = await loginService(rut, clave);

    // ⚠️ Si requiere recambio (accesotemporal=0), NO seteamos cookie:
    if (result?.needsPasswordChange) {
      return res.status(200).json({
        success: true,
        requirePasswordChange: true,
        tempAccess: true,
        user: {
          rutfull: result?.remoteUser?.rutfull,
          nombre: result?.remoteUser?.nombrefull,
        },
        message: "Acceso temporal detectado. Debes cambiar tu contraseña.",
      });
    }

    // flujo normal
    const { token } = result;
    setAuthCookie(res, token);

    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

// 🚪 Cerrar sesión
function logout(req, res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Strict",
  });
  return res
    .status(200)
    .json({ success: true, message: "Sesión cerrada exitosamente" });
}

// 🔁 Solicitar código de recuperación (envía correo)
async function changePassword(req, res, next) {
  try {
    const { rut } = req.body;
    if (!rut) {
      return res.status(400).json({ error: "El RUT es requerido" });
    }

    const result = await changePasswordService(rut);

    // 1) Caso éxito: código generado (proveedor respondió OK)
    if (result?.success) {
      return res.status(200).json({
        success: true,
        codeAlreadySent: false,
        message: result.detalle || "Correo enviado con éxito",
        detalle: result.detalle,
        vigencia: result.vigencia,
      });
    }

    // 2) Caso idempotente: YA EXISTE CÓDIGO vigente → 200 OK
    if (result?.reason === "codigo_existente") {
      return res.status(200).json({
        success: true,
        codeAlreadySent: true,
        message: "Ya existe un código vigente.",
        detalle: result.detalle,
        vigencia: result.vigencia,
      });
    }

    // 3) Error al enviar correo
    if (result?.reason === "email_failed") {
      return res.status(502).json({
        error: "Error al enviar el correo",
        detalle: result.detalle || "Fallo al enviar el correo de recuperación",
      });
    }

    // 4) Desconocido
    return res.status(500).json({
      error: "No se pudo solicitar el código",
      detalle: result?.detalle || "Error desconocido",
    });
  } catch (err) {
    console.error("❌ Error en controlador changePassword:", err?.message);
    return next(err);
  }
}

// ✅ Validar clave temporal (login con temporal)
async function validateTempPassword(req, res, next) {
  try {
    const { rut, tempPassword } = req.body;
    if (!rut || !tempPassword) {
      return res
        .status(400)
        .json({ error: "RUT y clave temporal son requeridos" });
    }

    const result = await validateTempPasswordService(rut, tempPassword);

    if (result.valid) {
      return res.status(200).json({
        success: true,
        accesotemporal: result.accesotemporal,
        user: result.user,
      });
    }

    if (result.reason === "bad_credentials") {
      return res.status(401).json({ error: "Clave temporal inválida" });
    }
    if (result.reason === "no_account") {
      return res.status(404).json({ error: "Cuenta no existe o sin acceso" });
    }

    return res.status(result.status || 500).json({
      error: "No se pudo validar la clave temporal",
      detalle: result.detalle,
    });
  } catch (err) {
    return next(err);
  }
}

// 🔒 Confirmar cambio: actualizar contraseña definitiva
async function finalizeChangePassword(req, res, next) {
  try {
    const { rut, newPassword } = req.body;
    if (!rut || !newPassword) {
      return res
        .status(400)
        .json({ error: "RUT y nueva contraseña son requeridos" });
    }

    const upd = await updatePasswordService(rut, newPassword);

    if (upd.success) {
      return res.status(200).json({
        success: true,
        message: upd.detalle || "Contraseña actualizada",
      });
    }

    if (/igual a anterior/i.test(upd.detalle || "")) {
      return res.status(409).json({ error: "Clave nueva igual a anterior." });
    }
    if (/no cumple requisitos/i.test(upd.detalle || "")) {
      return res.status(422).json({
        error:
          "Clave no cumple requisitos mínimos. Debe incluir algún caracter especial . , ; : * / + - = @ # $",
      });
    }

    return res
      .status(upd.status || 500)
      .json({ error: "Error al actualizar contraseña", detalle: upd.detalle });
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({ error: err.message });
    }
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  changePassword,
  validateTempPassword,
  finalizeChangePassword,
};