import { Router } from 'express';
import db from '../db.js';

const router = Router();

function formatRun(run) {
  const stops = db.prepare(`
    SELECT s.*, l.lgr_nombre as location, t.tmq_desc as type, l.lgr_lat as lat, l.lgr_lng as lng
    FROM route_run_stops s
    JOIN maquina m ON s.machine_id = m.maq_id
    LEFT JOIN lugar l ON m.lgr_id = l.lgr_id
    LEFT JOIN tipomaquina t ON m.tmq_id = t.tmq_id
    WHERE s.route_run_id = ? ORDER BY s.stop_order
  `).all(run.id);

  return {
    id: run.id,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    status: run.status,
    totalDistance: run.total_distance,
    totalTime: run.total_time,
    stops: stops.map(s => ({
      id: s.id,
      machineId: s.machine_id,
      location: s.location,
      type: s.type,
      stopOrder: s.stop_order,
      status: s.status,
      visitedAt: s.visited_at,
      coords: s.lat && s.lng ? [s.lat, s.lng] : null,
    })),
  };
}

// GET /api/route-runs?status=active
router.get('/', (req, res) => {
  const { status } = req.query;
  const runs = status
    ? db.prepare('SELECT * FROM route_runs WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare('SELECT * FROM route_runs ORDER BY id DESC').all();
  res.json(runs.map(formatRun));
});

// GET /api/route-runs/:id
router.get('/:id', (req, res) => {
  const run = db.prepare('SELECT * FROM route_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'No encontrado' });
  res.json(formatRun(run));
});

// POST /api/route-runs — body: { machineIds: ['MQR-001', 'MQC-005', ...] }
router.post('/', (req, res) => {
  const { machineIds } = req.body;
  if (!machineIds?.length) return res.status(400).json({ error: 'machineIds requerido' });

  const create = db.transaction(() => {
    const result = db.prepare('INSERT INTO route_runs DEFAULT VALUES').run();
    const runId = result.lastInsertRowid;

    const insertStop = db.prepare(
      'INSERT INTO route_run_stops (route_run_id, machine_id, stop_order) VALUES (?, ?, ?)'
    );
    machineIds.forEach((id, i) => insertStop.run(runId, id, i));

    return db.prepare('SELECT * FROM route_runs WHERE id = ?').get(runId);
  });

  res.status(201).json(formatRun(create()));
});

// PATCH /api/route-runs/:id — body: { status, totalDistance, totalTime }
router.patch('/:id', (req, res) => {
  const { status, totalDistance, totalTime } = req.body;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE route_runs SET
      status = COALESCE(?, status),
      total_distance = COALESCE(?, total_distance),
      total_time = COALESCE(?, total_time),
      completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `).run(status ?? null, totalDistance ?? null, totalTime ?? null, completedAt, req.params.id);

  const run = db.prepare('SELECT * FROM route_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'No encontrado' });
  res.json(formatRun(run));
});

// PATCH /api/route-runs/:id/stops/:stopId — body: { status: 'done'|'failed' }
router.patch('/:id/stops/:stopId', (req, res) => {
  const { status } = req.body;
  const visitedAt = new Date().toISOString();

  db.prepare('UPDATE route_run_stops SET status = ?, visited_at = ? WHERE id = ? AND route_run_id = ?')
    .run(status, visitedAt, req.params.stopId, req.params.id);

  const run = db.prepare('SELECT * FROM route_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'No encontrado' });
  res.json(formatRun(run));
});

export default router;
