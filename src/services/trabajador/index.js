const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Admin2020',
  server: '10.18.18.147',
  database: 'GCOV_Programacion',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function listGerencias() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT DISTINCT Gerencia
      FROM PersonalActivo
      WHERE Gerencia IS NOT NULL AND Division = 'DET'
      ORDER BY Gerencia
    `);
    await sql.close();
    return result.recordset.map(r => r.Gerencia);
  } catch (error) {
    console.error('❌ Error al listar gerencias:', error);
    throw error;
  }
}

async function listEmpresas() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT DISTINCT Empresa
      FROM PersonalActivo
      WHERE Empresa IS NOT NULL AND Division = 'DET'
      ORDER BY Empresa
    `);
    await sql.close();
    return result.recordset.map(r => r.Empresa);
  } catch (error) {
    console.error('❌ Error al listar empresas:', error);
    throw error;
  }
}

async function listTrabajadores(filters = {}) {
  const { rut, nombre, gerencia, empresa } = filters;

  try {
    const pool = await sql.connect(config);
    let query = 'SELECT * FROM PersonalActivo WHERE Division = \'DET\'';
    const request = pool.request();

    if (rut) {
      query += ' AND Rut = @rut';
      request.input('rut', sql.VarChar, rut);
    }

    if (nombre) {
      query += ' AND Nombre LIKE @nombre';
      request.input('nombre', sql.VarChar, `%${nombre}%`);
    }

    if (gerencia) {
      query += ' AND Gerencia = @gerencia';
      request.input('gerencia', sql.VarChar, gerencia);
    }

    if (empresa) {
      query += ' AND Empresa = @empresa';
      request.input('empresa', sql.VarChar, empresa);
    }

    const result = await request.query(query);
    await sql.close();
    return result.recordset;
  } catch (error) {
    console.error('❌ Error al listar trabajadores:', error);
    throw error;
  }
}

module.exports = {
  listTrabajadores,
  listGerencias,
  listEmpresas
};
