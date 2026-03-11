# SEPRISA – Sistema de Gestión y Recaudación

App de gestión de máquinas recreativas (grúas, pelucheras, monedas) con rutas de recaudación geolocalizadas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Backend | Express 4 + better-sqlite3 |
| Mapa | Leaflet.js + OSRM (ruteo) + OpenStreetMap |
| DB | SQLite (`server/seprisa.db`) |

## Funcionalidades

- **Dashboard** – KPIs, últimos registros de recaudación, estado de máquinas
- **Máquinas** – Listado con estado/ubicación, creación de nuevas máquinas, edición inline
- **Rutas de Recaudación** – Mapa interactivo con selección de paradas, optimización de orden (nearest-neighbor), inicio/fin de ruta con tracking de distancia y tiempo
- **Registro de Recaudación** – Formulario de cobranza por máquina (contadores, montos, fotos)
- **Roles** – `admin` (dashboard completo) / `terreno` (app móvil recaudador)

## Instalación

```bash
cd pos-app
npm install
```

## Desarrollo

```bash
# Backend (puerto 3001)
npm run server:dev

# Frontend (puerto 5174)
npm run dev
```

Usuarios por defecto: `admin / admin` · `terreno / terreno`

## Estructura

```
pos-app/
├── server/
│   ├── index.js          # Express entry point
│   ├── db.js             # SQLite schema + seed
│   └── routes/
│       ├── machines.js   # CRUD máquinas + meta (tipos, lugares)
│       ├── records.js    # Registros de recaudación
│       └── routeRuns.js  # Ejecuciones de rutas
└── src/
    ├── App.jsx           # Routing, auth, state global
    ├── api.js            # Capa de fetch hacia el backend
    └── MapView.jsx       # Mapa + optimización de ruta
```

## API REST (puerto 3001)

```
GET    /api/machines
POST   /api/machines
PATCH  /api/machines/:id
DELETE /api/machines/:id
GET    /api/machines/meta/tipos
GET    /api/machines/meta/lugares
POST   /api/machines/meta/lugares

GET    /api/records?machineId=
POST   /api/records

GET    /api/route-runs?status=
POST   /api/route-runs
PATCH  /api/route-runs/:id
PATCH  /api/route-runs/:id/stops/:stopId
```
