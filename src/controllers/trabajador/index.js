const {
  listGerencias,
  listEmpresas,
  listTrabajadores
} = require("../../services/trabajador");

async function listGerenciasController(req, res, next) {
  try {
    const gerencias = await listGerencias();
    res.json(gerencias);
  } catch (err) {
    next(err);
  }
}

async function listEmpresasController(req, res, next) {
  try {
    const empresas = await listEmpresas();
    res.json(empresas);
  } catch (err) {
    next(err);
  }
}

async function listTrabajadoresController(req, res, next) {
  try {
    // ✅ Leer filtros desde el body (POST)
    const { rut, nombre, gerencia, empresa } = req.body;

    console.log("📥 Filtros recibidos:");
    if (rut) console.log("   🔹 rut:", rut);
    if (nombre) console.log("   🔹 nombre:", nombre);
    if (gerencia) console.log("   🔹 gerencia:", gerencia);
    if (empresa) console.log("   🔹 empresa:", empresa);

    const filtros = { rut, nombre, gerencia, empresa };

    const trabajadores = await listTrabajadores(filtros);

    return res.status(200).json(trabajadores);
  } catch (err) {
    console.error("❌ Error en listTrabajadoresController:", err);
    return next(err);
  }
}

module.exports = {
  listGerenciasController,
  listEmpresasController,
  listTrabajadoresController
};
