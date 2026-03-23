import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: join(__dirname, '../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `rec_${Date.now()}${extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const router = Router();

function formatRecord(r) {
  const preCalc  = r.rre_pre_calc   ?? 0;
  const mntoTotal = r.rre_mnto_total ?? 0;
  const diff = mntoTotal - preCalc;
  return {
    id: r.rre_id,
    machine: r.maq_id,
    location: r.lgr_nombre ?? '',
    preCalc,
    fisico: mntoTotal,
    status: diff !== 0 ? `Descuadre (${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('es-PY')} Gs.)` : 'OK',
    date: r.rre_timestamp?.slice(0, 10) ?? '',
    contEntrada: r.rre_cont_entrada,
    contSalida: r.rre_cont_salida,
    contDigital: r.rre_cont_rec_digital,
    contPozo: r.rre_cont_rec_pozo,
    contReal: r.rre_cont_real,
    contRealDif: r.rre_cont_real_dif,
    contPremioEntrada: r.rre_cont_premio_entrada,
    contPremioSalida: r.rre_cont_premio_salida,
    contPremioStockAct: r.rre_cont_premio_stock_act,
    contPremioStockAdd: r.rre_cont_premio_stock_add,
    contJuegosUtilizados: r.rre_cont_juegos_utilizados,
    mntoLocatario: r.rre_mnto_locatario,
    mntoCasa: r.rre_mnto_casa,
    mntoRecaudador: r.rre_mnto_recaudador,
    mntoTotal: r.rre_mnto_total,
  };
}

const SELECT_RECORD = `
  SELECT r.*, l.lgr_nombre
  FROM rec_registro r
  LEFT JOIN lugar l ON r.lgr_id = l.lgr_id
`;

// GET /api/records?machineId=xxx
router.get('/', (req, res) => {
  const { machineId } = req.query;
  const rows = machineId
    ? db.prepare(SELECT_RECORD + ' WHERE r.maq_id = ? ORDER BY r.rre_id DESC').all(machineId)
    : db.prepare(SELECT_RECORD + ' ORDER BY r.rre_id DESC').all();
  res.json(rows.map(formatRecord));
});

// POST /api/records
router.post('/', (req, res) => {
  const {
    machine, lgrId,
    preCalc, fisico,
    contEntrada, contSalida, contDigital, contPozo,
    contReal, contRealDif,
    contPremioEntrada, contPremioSalida, contPremioStockAct, contPremioStockAdd,
    contJuegosUtilizados,
    mntoLocatario, mntoCasa, mntoRecaudador, mntoTotal,
    rutId,
  } = req.body;

  const result = db.prepare(`
    INSERT INTO rec_registro (
      maq_id, lgr_id, route_run_id,
      rre_pre_calc,
      rre_cont_entrada, rre_cont_salida, rre_cont_rec_digital, rre_cont_rec_pozo,
      rre_cont_real, rre_cont_real_dif,
      rre_cont_premio_entrada, rre_cont_premio_salida,
      rre_cont_premio_stock_act, rre_cont_premio_stock_add,
      rre_cont_juegos_utilizados,
      rre_mnto_locatario, rre_mnto_casa, rre_mnto_recaudador, rre_mnto_total
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    machine, lgrId ?? null, rutId ?? null,
    preCalc ?? 0,
    contEntrada ?? 0, contSalida ?? 0, contDigital ?? 0, contPozo ?? 0,
    contReal ?? 0, contRealDif ?? 0,
    contPremioEntrada ?? 0, contPremioSalida ?? 0,
    contPremioStockAct ?? 0, contPremioStockAdd ?? 0,
    contJuegosUtilizados ?? 0,
    mntoLocatario ?? 0, mntoCasa ?? 0, mntoRecaudador ?? 0, fisico ?? mntoTotal ?? 0,
  );

  const r = db.prepare(SELECT_RECORD + ' WHERE r.rre_id = ?').get(result.lastInsertRowid);
  res.status(201).json(formatRecord(r));
});

// POST /api/records/:id/images
router.post('/:id/images', upload.single('photo'), (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  const rimPath = `/uploads/${req.file.filename}`;
  const result = db.prepare(
    'INSERT INTO rec_img (rim_path, rim_evento, rre_id) VALUES (?, ?, ?)'
  ).run(rimPath, 'evidencia', id);

  res.status(201).json({ id: result.lastInsertRowid, path: rimPath });
});

export default router;
