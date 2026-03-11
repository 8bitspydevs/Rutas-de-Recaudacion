import express from 'express';
import cors from 'cors';
import machinesRouter from './routes/machines.js';
import recordsRouter from './routes/records.js';
import routeRunsRouter from './routes/routeRuns.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

app.use('/api/machines', machinesRouter);
app.use('/api/records', recordsRouter);
app.use('/api/route-runs', routeRunsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[server] SEPRISA API corriendo en http://localhost:${PORT}`);
});
