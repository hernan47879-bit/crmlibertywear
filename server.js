const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Claves públicas de estado sincronizadas del sistema Liberty Wear
const ALLOWED_KEYS = new Set([
  'liberty_wear_products',
  'crm_leads',
  'liberty_wear_clientes',
  'presupuestos',
  'liberty_wear_pedidos_control',
  'liberty_wear_order_notes',
  'liberty_wear_users',
  'ventas',
  'liberty_wear_tercerizados_seeded_v1'
]);

// Clave interna privada en la Base de Datos para la Contraseña Maestra (nunca se envía en GET /api/state)
const MASTER_PASSWORD_DB_KEY = 'liberty_wear_master_password_secret';
const DEFAULT_MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'LIBERTY2026';

// Configuración de Base de Datos PostgreSQL (Railway provee DATABASE_URL automáticamente)
let pool = null;
const LOCAL_FALLBACK_FILE = path.join(__dirname, 'data_store.json');

if (process.env.DATABASE_URL) {
  const isLocalDb =
    process.env.DATABASE_URL.includes('localhost') ||
    process.env.DATABASE_URL.includes('127.0.0.1');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDb ? false : { rejectUnauthorized: false }
  });
}

async function initDatabase() {
  if (!pool) {
    console.log('ℹ️ Sin DATABASE_URL: usando almacenamiento local en data_store.json');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS liberty_wear_store (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla PostgreSQL "liberty_wear_store" verificada y lista.');
  } catch (err) {
    console.error('❌ Error al inicializar la tabla en PostgreSQL:', err.message);
  }
}

function readLocalFallback() {
  try {
    if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error leyendo fallback local:', e.message);
  }
  return {};
}

function writeLocalFallback(dataObj) {
  try {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(dataObj, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando fallback local:', e.message);
  }
}

// Obtiene la Contraseña Maestra vigente (prioriza la variable de entorno MASTER_PASSWORD de Railway)
async function getEffectiveMasterPassword() {
  if (process.env.MASTER_PASSWORD && String(process.env.MASTER_PASSWORD).trim() !== '') {
    return String(process.env.MASTER_PASSWORD).trim();
  }
  try {
    if (pool) {
      const res = await pool.query('SELECT value FROM liberty_wear_store WHERE key = $1', [MASTER_PASSWORD_DB_KEY]);
      if (res.rows.length > 0 && res.rows[0].value && res.rows[0].value.secret) {
        return String(res.rows[0].value.secret);
      }
    } else {
      const localData = readLocalFallback();
      if (localData[MASTER_PASSWORD_DB_KEY] && localData[MASTER_PASSWORD_DB_KEY].secret) {
        return String(localData[MASTER_PASSWORD_DB_KEY].secret);
      }
    }
  } catch (e) {}
  return DEFAULT_MASTER_PASSWORD;
}

// Endpoint para verificar la Contraseña Maestra de forma segura en el servidor (sin exponerla al navegador)
app.post('/api/verify-master-password', async (req, res) => {
  try {
    const candidate = req.body && req.body.masterPassword !== undefined ? String(req.body.masterPassword) : '';
    const effective = await getEffectiveMasterPassword();
    const isValid = Boolean(candidate && candidate === effective);
    return res.json({
      ok: true,
      valid: isValid,
      managedByRailwayEnv: Boolean(process.env.MASTER_PASSWORD && String(process.env.MASTER_PASSWORD).trim() !== '')
    });
  } catch (err) {
    return res.status(500).json({ ok: false, valid: false, error: err.message });
  }
});

// Endpoint para cambiar la Contraseña Maestra (si no está fijada por variable de entorno en Railway)
app.post('/api/change-master-password', async (req, res) => {
  try {
    if (process.env.MASTER_PASSWORD && String(process.env.MASTER_PASSWORD).trim() !== '') {
      return res.status(400).json({
        ok: false,
        error: 'La Contraseña Maestra está alojada y protegida en las Variables de Railway (MASTER_PASSWORD). Para cambiarla, modificala directamente desde el panel Variables de tu proyecto en Railway.'
      });
    }

    const currentPassword = req.body && req.body.currentMasterPassword ? String(req.body.currentMasterPassword) : '';
    const newPassword = req.body && req.body.newMasterPassword ? String(req.body.newMasterPassword).trim() : '';

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ ok: false, error: 'La nueva Contraseña Maestra debe tener al menos 4 caracteres.' });
    }

    const effective = await getEffectiveMasterPassword();
    if (currentPassword !== effective) {
      return res.status(403).json({ ok: false, error: 'La Contraseña Maestra actual ingresada es incorrecta.' });
    }

    if (pool) {
      await pool.query(
        `INSERT INTO liberty_wear_store (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [MASTER_PASSWORD_DB_KEY, JSON.stringify({ secret: newPassword })]
      );
    } else {
      const current = readLocalFallback();
      current[MASTER_PASSWORD_DB_KEY] = { secret: newPassword };
      writeLocalFallback(current);
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint de estado / salud del servidor y base de datos
app.get('/api/health', async (req, res) => {
  if (!pool) {
    return res.json({ ok: true, mode: 'local_file', databaseConnected: false });
  }
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, mode: 'postgresql', databaseConnected: true });
  } catch (err) {
    return res.status(500).json({ ok: false, mode: 'postgresql', databaseConnected: false, error: err.message });
  }
});

// Obtener todo el estado almacenado en la Base de Datos (excluyendo la clave privada de Contraseña Maestra)
app.get('/api/state', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT key, value, updated_at FROM liberty_wear_store WHERE key != $1', [MASTER_PASSWORD_DB_KEY]);
      const data = {};
      let latestUpdate = null;
      for (const row of result.rows) {
        if (ALLOWED_KEYS.has(row.key)) {
          data[row.key] = row.value;
          if (!latestUpdate || new Date(row.updated_at) > new Date(latestUpdate)) {
            latestUpdate = row.updated_at;
          }
        }
      }
      return res.json({ ok: true, mode: 'postgresql', updatedAt: latestUpdate, data });
    } else {
      const raw = readLocalFallback();
      const data = {};
      for (const k of Object.keys(raw)) {
        if (ALLOWED_KEYS.has(k)) data[k] = raw[k];
      }
      return res.json({ ok: true, mode: 'local_file', updatedAt: new Date().toISOString(), data });
    }
  } catch (err) {
    console.error('Error en GET /api/state:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Guardar / actualizar una o múltiples claves en la Base de Datos
app.post('/api/state', async (req, res) => {
  const payload = req.body && req.body.data ? req.body.data : req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ ok: false, error: 'Formato de datos inválido' });
  }

  const entries = Object.entries(payload).filter(([k]) => ALLOWED_KEYS.has(k));
  if (entries.length === 0) {
    return res.json({ ok: true, savedKeys: [] });
  }

  try {
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const [key, value] of entries) {
          await client.query(
            `INSERT INTO liberty_wear_store (key, value, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (key)
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [key, JSON.stringify(value)]
          );
        }
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
      return res.json({ ok: true, mode: 'postgresql', savedKeys: entries.map(([k]) => k) });
    } else {
      const current = readLocalFallback();
      for (const [key, value] of entries) {
        current[key] = value;
      }
      writeLocalFallback(current);
      return res.json({ ok: true, mode: 'local_file', savedKeys: entries.map(([k]) => k) });
    }
  } catch (err) {
    console.error('Error en POST /api/state:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Servir archivos estáticos y la aplicación principal LIBERTY WEAR - Sistema.html
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'LIBERTY WEAR - Sistema.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'LIBERTY WEAR - Sistema.html'));
});

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Liberty Wear activo en el puerto ${PORT}`);
  });
});
