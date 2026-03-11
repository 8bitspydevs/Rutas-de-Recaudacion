import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'seprisa.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- ─── Tablas de referencia ─────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS lugar (
    lgr_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    lgr_nombre    TEXT NOT NULL,
    lgr_direccion TEXT,
    lgr_img       TEXT,
    lgr_lat       REAL,
    lgr_lng       REAL
  );

  CREATE TABLE IF NOT EXISTS usuario (
    usu_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    usu_nombre TEXT NOT NULL,
    usu_user   TEXT NOT NULL UNIQUE,
    usu_pass   TEXT NOT NULL,
    usu_rol    TEXT NOT NULL DEFAULT 'terreno'
  );

  CREATE TABLE IF NOT EXISTS vehiculo (
    vei_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    vei_modelo     TEXT NOT NULL,
    vei_km_inicial REAL DEFAULT 0,
    vei_km_actual  REAL DEFAULT 0,
    usu_id         INTEGER REFERENCES usuario(usu_id)
  );

  CREATE TABLE IF NOT EXISTS tipomaquina (
    tmq_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    tmq_desc TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categoria (
    cat_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_nombre     TEXT NOT NULL,
    cat_nvl        INTEGER DEFAULT 1,
    cat_padre      INTEGER REFERENCES categoria(cat_id),
    cat_inventario INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS producto (
    pro_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pro_nombre    TEXT NOT NULL,
    pro_descrip   TEXT,
    pro_codbarra  TEXT,
    pro_observ    TEXT,
    emp_id        INTEGER,
    imp_id        INTEGER,
    pro_preciodet REAL DEFAULT 0,
    pro_preciomay REAL DEFAULT 0,
    pro_costo     REAL DEFAULT 0,
    pro_costomp   REAL DEFAULT 0,
    pro_pack      INTEGER DEFAULT 1,
    cat_id        INTEGER REFERENCES categoria(cat_id),
    pro_vigente   INTEGER DEFAULT 1,
    pro_vigencia  TEXT
  );

  -- ─── Entidad principal: Máquina ───────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS maquina (
    maq_id       TEXT PRIMARY KEY,
    pro_id       INTEGER REFERENCES producto(pro_id),
    maq_fechacre TEXT DEFAULT (date('now')),
    tmq_id       INTEGER REFERENCES tipomaquina(tmq_id),
    lgr_id       INTEGER REFERENCES lugar(lgr_id),
    maq_status   TEXT DEFAULT 'ok'
  );

  -- ─── Rutas y logística ────────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS ruta (
    rut_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    vei_id     INTEGER REFERENCES vehiculo(vei_id),
    lgr_id     INTEGER REFERENCES lugar(lgr_id),
    rut_fecha  TEXT DEFAULT (datetime('now')),
    rut_km_ini REAL DEFAULT 0,
    rut_km_fin REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS log_ruta (
    lrt_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    rut_id         INTEGER REFERENCES ruta(rut_id),
    lrt_timestamp  TEXT DEFAULT (datetime('now')),
    lrt_coordenada TEXT,
    lrt_evento     TEXT,
    lgr_id         INTEGER REFERENCES lugar(lgr_id)
  );

  CREATE TABLE IF NOT EXISTS maq_gastos (
    gsq_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    maq_id          TEXT REFERENCES maquina(maq_id),
    rut_id          INTEGER REFERENCES ruta(rut_id),
    gsq_timestamp   TEXT DEFAULT (datetime('now')),
    gsq_coordenada  TEXT,
    gsq_descripcion TEXT,
    gsq_monto       REAL DEFAULT 0
  );

  -- ─── Registros de recaudación ─────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS rec_registro (
    rre_id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    maq_id                    TEXT REFERENCES maquina(maq_id),
    lgr_id                    INTEGER REFERENCES lugar(lgr_id),
    rre_timestamp             TEXT DEFAULT (datetime('now')),
    rre_coordenada            TEXT,
    rut_id                    INTEGER REFERENCES ruta(rut_id),
    rre_cont_entrada          INTEGER DEFAULT 0,
    rre_cont_salida           INTEGER DEFAULT 0,
    rre_cont_dif              INTEGER DEFAULT 0,
    rre_cont_rec_digital      INTEGER DEFAULT 0,
    rre_cont_rec_pozo         INTEGER DEFAULT 0,
    rre_cont_real             INTEGER DEFAULT 0,
    rre_cont_real_dif         INTEGER DEFAULT 0,
    rre_cont_premio_entrada   INTEGER DEFAULT 0,
    rre_cont_premio_salida    INTEGER DEFAULT 0,
    rre_cont_premio_stock_act INTEGER DEFAULT 0,
    rre_cont_premio_stock_add INTEGER DEFAULT 0,
    rre_cont_juegos_utilizados INTEGER DEFAULT 0,
    rre_mnto_locatario        REAL DEFAULT 0,
    rre_mnto_casa             REAL DEFAULT 0,
    rre_mnto_recaudador       REAL DEFAULT 0,
    rre_mnto_total            REAL DEFAULT 0,
    rre_pre_calc              REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rec_img (
    rim_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    rim_path   TEXT NOT NULL,
    rim_evento TEXT,
    rim_obs    TEXT,
    rre_id     INTEGER REFERENCES rec_registro(rre_id)
  );

  -- ─── Ejecución de rutas de recaudación (feature app) ─────────────────────

  CREATE TABLE IF NOT EXISTS route_runs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at     TEXT DEFAULT (datetime('now')),
    completed_at   TEXT,
    status         TEXT DEFAULT 'active',
    total_distance REAL DEFAULT 0,
    total_time     INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS route_run_stops (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    route_run_id  INTEGER REFERENCES route_runs(id),
    machine_id    TEXT REFERENCES maquina(maq_id),
    stop_order    INTEGER,
    status        TEXT DEFAULT 'pending',
    visited_at    TEXT
  );
`);

// ─── Seed data (solo si está vacío) ──────────────────────────────────────────
const lugarCount = db.prepare('SELECT COUNT(*) as n FROM lugar').get().n;
if (lugarCount === 0) {
  db.transaction(() => {
    // Usuarios
    db.prepare('INSERT INTO usuario (usu_nombre, usu_user, usu_pass, usu_rol) VALUES (?,?,?,?)').run('Admin Central', 'admin', 'admin', 'admin');
    db.prepare('INSERT INTO usuario (usu_nombre, usu_user, usu_pass, usu_rol) VALUES (?,?,?,?)').run('Recaudador', 'terreno', 'terreno', 'terreno');

    // Tipos de máquina
    db.prepare('INSERT INTO tipomaquina (tmq_desc) VALUES (?)').run('Peluches');
    db.prepare('INSERT INTO tipomaquina (tmq_desc) VALUES (?)').run('Monedas');
    db.prepare('INSERT INTO tipomaquina (tmq_desc) VALUES (?)').run('Casitas');
    db.prepare('INSERT INTO tipomaquina (tmq_desc) VALUES (?)').run('Grúa');

    // Categorías
    db.prepare('INSERT INTO categoria (cat_nombre, cat_nvl) VALUES (?,?)').run('Juguetes', 1);
    db.prepare('INSERT INTO categoria (cat_nombre, cat_nvl) VALUES (?,?)').run('Peluches', 2);
    db.prepare('INSERT INTO categoria (cat_nombre, cat_nvl) VALUES (?,?)').run('Figuras', 2);

    // Productos
    db.prepare('INSERT INTO producto (pro_nombre, pro_preciodet, cat_id, pro_vigente) VALUES (?,?,?,?)').run('Premio Estándar', 1000, 1, 1);
    db.prepare('INSERT INTO producto (pro_nombre, pro_preciodet, cat_id, pro_vigente) VALUES (?,?,?,?)').run('Premio Premium', 2500, 2, 1);

    // Lugares con coordenadas
    db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run('Supermercado Lider', 'Av. Principal, San Lorenzo', -25.3350, -57.5310);
    db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run('Terminal Buses', 'Terminal Central, San Lorenzo', -25.3480, -57.5200);
    db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run('Mall Centro', 'Centro Comercial, San Lorenzo', -25.3420, -57.5150);
    db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run('Supermercado Stock', 'Ruta 2, San Lorenzo', -25.3310, -57.5080);
    db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run('Paseo La Galería', 'Mcal. López, San Lorenzo', -25.3390, -57.5220);
    db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run('Shopping del Sol', 'Av. del Sol, Asunción', -25.2900, -57.5700);

    // Máquinas
    const ins = db.prepare('INSERT INTO maquina (maq_id, pro_id, tmq_id, lgr_id, maq_status) VALUES (?,?,?,?,?)');
    ins.run('MQR-001', 1, 1, 1, 'ok');
    ins.run('MQC-005', 1, 2, 2, 'warning');
    ins.run('MQP-012', 2, 3, 3, 'ok');
    ins.run('MQR-002', 1, 1, 1, 'ok');
    ins.run('MQC-052', 1, 2, 3, 'ok');
    ins.run('MQP-044', 2, 3, 4, 'ok');
    ins.run('MQR-031', 1, 1, 5, 'ok');
    ins.run('MQC-023', 1, 2, 5, 'ok');
    ins.run('MQR-060', 1, 1, 3, 'ok');
    ins.run('MQP-007', 2, 3, 2, 'ok');
    ins.run('MQR-015', 1, 1, 6, 'ok');
    ins.run('MQC-011', 1, 2, 6, 'ok');
    ins.run('MQP-020', 2, 3, 4, 'ok');

    // Registros de recaudación de ejemplo
    const insR = db.prepare(`
      INSERT INTO rec_registro
        (maq_id, lgr_id, rre_cont_entrada, rre_cont_salida, rre_mnto_total, rre_pre_calc, rre_cont_real_dif)
      VALUES (?,?,?,?,?,?,?)
    `);
    insR.run('MQR-001', 1, 150, 140, 45000, 45000, 0);
    insR.run('MQC-005', 2, 80,  75,  12500, 15000, -2500);
    insR.run('MQP-012', 3, 200, 195, 89000, 89000, 0);
    insR.run('MQR-001', 1, 140, 132, 42000, 42000, 0);
    insR.run('MQR-002', 1, 155, 148, 38500, 38500, 0);
    insR.run('MQC-052', 3, 90,  88,  83000, 83000, 0);
    insR.run('MQP-044', 4, 60,  58,  18000, 18000, 0);
    insR.run('MQR-031', 5, 170, 163, 61000, 62500, -1500);
    insR.run('MQC-023', 5, 120, 116, 47000, 47000, 0);
    insR.run('MQR-060', 3, 148, 143, 56000, 56000, 0);
    insR.run('MQP-007', 2, 180, 174, 72000, 72000, 0);
    insR.run('MQR-015', 6, 100, 95,  29000, 29000, 0);
    insR.run('MQC-011', 6, 130, 122, 51500, 54000, -2500);
    insR.run('MQP-020', 4, 230, 225, 91500, 91500, 0);
    insR.run('MQR-001', 1, 142, 136, 45000, 45000, 0);
  })();

  console.log('[db] Seed data insertado.');
}

export default db;
