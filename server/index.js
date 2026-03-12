import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import machinesRouter from './routes/machines.js';
import recordsRouter from './routes/records.js';
import routeRunsRouter from './routes/routeRuns.js';
import { CONFIG } from './config.js';
import { requireAuth } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Rutas públicas
app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Rutas protegidas — requieren JWT válido
app.use('/api/machines', requireAuth, machinesRouter);
app.use('/api/records', requireAuth, recordsRouter);
app.use('/api/route-runs', requireAuth, routeRunsRouter);
app.get('/api/config', requireAuth, (_req, res) => res.json(CONFIG));
app.get('/', (_req, res) => res.send('SEPRISA API is running. Use /api/health for health check.'));

app.listen(PORT, () => {
  console.log(`[server] SEPRISA API corriendo en http://localhost:${PORT}`);
});
