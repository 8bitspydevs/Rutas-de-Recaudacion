import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import machinesRouter from './routes/machines.js';
import recordsRouter from './routes/records.js';
import routeRunsRouter from './routes/routeRuns.js';
import maintenanceRouter from './routes/maintenance.js';
import { CONFIG } from './config.js';
import { requireAuth } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Permite localhost Y cualquier IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|(192\.168|10\.\d+|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+)(:\d+)?$/;
app.use(cors({ origin: (origin, cb) => cb(null, !origin || LOCAL_ORIGIN.test(origin)) }));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Rutas públicas
app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Rutas protegidas — requieren JWT válido
app.use('/api/machines', requireAuth, machinesRouter);
app.use('/api/records', requireAuth, recordsRouter);
app.use('/api/route-runs', requireAuth, routeRunsRouter);
app.use('/api/maintenance', requireAuth, maintenanceRouter);
app.get('/api/config', requireAuth, (_req, res) => res.json(CONFIG));
app.get('/', (_req, res) => res.send('SEPRISA API is running. Use /api/health for health check.'));

app.listen(PORT, () => {
  console.log(`[server] SEPRISA API corriendo en http://localhost:${PORT}`);
});
