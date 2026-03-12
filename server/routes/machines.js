import { Router } from 'express';
import db from '../db.js';

const router = Router();

const SELECT_MACHINE = `
  SELECT m.maq_id, m.maq_status, m.maq_fechacre,
         t.tmq_desc as type,
         l.lgr_nombre as location, l.lgr_direccion, l.lgr_lat, l.lgr_lng,
         p.pro_nombre as producto,
         (SELECT rre_mnto_total FROM rec_registro WHERE maq_id = m.maq_id ORDER BY rre_id DESC LIMIT 1) as last_revenue
  FROM maquina m
  LEFT JOIN tipomaquina t ON m.tmq_id = t.tmq_id
  LEFT JOIN lugar l ON m.lgr_id = l.lgr_id
  LEFT JOIN producto p ON m.pro_id = p.pro_id
`;

function formatMachine(m) {
  return {
    id: m.maq_id,
    type: m.type ?? '',
    location: m.location ?? '',
    direccion: m.lgr_direccion ?? '',
    status: m.maq_status,
    lastRevenue: m.last_revenue ? `$${Number(m.last_revenue).toLocaleString('es-PY')}` : null,
    producto: m.producto ?? null,
    fechaCreacion: m.maq_fechacre,
    coords: m.lgr_lat && m.lgr_lng ? [m.lgr_lat, m.lgr_lng] : null,
  };
}

// GET /api/machines
router.get('/', (_req, res) => {
  const machines = db.prepare(SELECT_MACHINE + ' ORDER BY m.maq_id').all();
  res.json(machines.map(formatMachine));
});

// GET /api/machines/:id
router.get('/:id', (req, res) => {
  const m = db.prepare(SELECT_MACHINE + ' WHERE m.maq_id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Máquina no encontrada' });
  res.json(formatMachine(m));
});

// POST /api/machines — body: { id, tmqId, lgrId, proId?, status? }
router.post('/', (req, res) => {
  const { id, tmqId, lgrId, proId, status } = req.body;
  if (!id || !tmqId || !lgrId) return res.status(400).json({ error: 'id, tmqId y lgrId son requeridos' });

  db.prepare('INSERT INTO maquina (maq_id, tmq_id, lgr_id, pro_id, maq_status) VALUES (?,?,?,?,?)')
    .run(id, tmqId, lgrId, proId ?? null, status ?? 'ok');

  const m = db.prepare(SELECT_MACHINE + ' WHERE m.maq_id = ?').get(id);
  res.status(201).json(formatMachine(m));
});

// PATCH /api/machines/:id
router.patch('/:id', (req, res) => {
  const { tmqId, lgrId, proId, status } = req.body;
  db.prepare(`
    UPDATE maquina SET
      tmq_id     = COALESCE(?, tmq_id),
      lgr_id     = COALESCE(?, lgr_id),
      pro_id     = COALESCE(?, pro_id),
      maq_status = COALESCE(?, maq_status)
    WHERE maq_id = ?
  `).run(tmqId ?? null, lgrId ?? null, proId ?? null, status ?? null, req.params.id);

  const m = db.prepare(SELECT_MACHINE + ' WHERE m.maq_id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Máquina no encontrada' });
  res.json(formatMachine(m));
});

// DELETE /api/machines/:id — cascade-deletes dependent rows
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const exists = db.prepare('SELECT 1 FROM maquina WHERE maq_id = ?').get(id);
  if (!exists) return res.status(404).json({ error: 'Máquina no encontrada' });

  db.transaction(() => {
    db.prepare('DELETE FROM rec_img WHERE rre_id IN (SELECT rre_id FROM rec_registro WHERE maq_id = ?)').run(id);
    db.prepare('DELETE FROM rec_registro WHERE maq_id = ?').run(id);
    db.prepare('DELETE FROM maq_gastos WHERE maq_id = ?').run(id);
    db.prepare('DELETE FROM route_run_stops WHERE machine_id = ?').run(id);
    db.prepare('DELETE FROM maquina WHERE maq_id = ?').run(id);
  })();

  res.json({ ok: true });
});

// ─── Lookup tables ────────────────────────────────────────────────────────────

// GET /api/machines/meta/tipos
router.get('/meta/tipos', (_req, res) => {
  res.json(db.prepare('SELECT tmq_id as id, tmq_desc as desc FROM tipomaquina ORDER BY tmq_id').all());
});

// GET /api/machines/meta/lugares
router.get('/meta/lugares', (_req, res) => {
  res.json(db.prepare('SELECT lgr_id as id, lgr_nombre as nombre, lgr_direccion as direccion, lgr_lat as lat, lgr_lng as lng FROM lugar ORDER BY lgr_nombre').all());
});

// POST /api/machines/meta/lugares
router.post('/meta/lugares', (req, res) => {
  const { nombre, direccion, lat, lng } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  const result = db.prepare('INSERT INTO lugar (lgr_nombre, lgr_direccion, lgr_lat, lgr_lng) VALUES (?,?,?,?)').run(nombre, direccion ?? null, lat ?? null, lng ?? null);
  res.status(201).json({ id: result.lastInsertRowid, nombre, direccion, lat, lng });
});

export default router;
