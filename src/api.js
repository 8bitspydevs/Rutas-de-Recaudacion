const BASE = 'http://localhost:3001/api';

async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json();
}

// Machines
export const getMachines = () => request('/machines');
export const getMachine = (id) => request(`/machines/${id}`);
export const createMachine = (data) => request('/machines', { method: 'POST', body: JSON.stringify(data) });
export const updateMachine = (id, data) => request(`/machines/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteMachine = (id) => request(`/machines/${id}`, { method: 'DELETE' });

// Machine meta
export const getTipos = () => request('/machines/meta/tipos');
export const getLugares = () => request('/machines/meta/lugares');
export const createLugar = (data) => request('/machines/meta/lugares', { method: 'POST', body: JSON.stringify(data) });

// Records
export const getRecords = (machineId) => request(machineId ? `/records?machineId=${machineId}` : '/records');
export const createRecord = (data) => request('/records', { method: 'POST', body: JSON.stringify(data) });

// Route Runs
export const getRouteRuns = (status) => request(status ? `/route-runs?status=${status}` : '/route-runs');
export const getRouteRun = (id) => request(`/route-runs/${id}`);
export const createRouteRun = (machineIds) => request('/route-runs', { method: 'POST', body: JSON.stringify({ machineIds }) });
export const updateRouteRun = (id, data) => request(`/route-runs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const updateStop = (runId, stopId, status) => request(`/route-runs/${runId}/stops/${stopId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
