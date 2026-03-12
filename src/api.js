const BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'seprisa_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        clearToken();
        window.dispatchEvent(new Event('auth:logout'));
        throw new Error('No autenticado');
    }
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json();
}

// Auth
export const login = async (user, pass) => {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass }),
    });
    if (!res.ok) throw new Error('Credenciales inválidas');
    const data = await res.json();
    setToken(data.token);
    return data;
};

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
export const uploadRecordImage = (recordId, file) => {
    const form = new FormData();
    form.append('photo', file);
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return fetch(`${BASE}/records/${recordId}/images`, { method: 'POST', headers, body: form }).then(async r => {
        if (r.status === 401) { clearToken(); window.dispatchEvent(new Event('auth:logout')); throw new Error('No autenticado'); }
        if (!r.ok) throw new Error(`Upload error ${r.status}`);
        return r.json();
    });
};

// Config
export const getConfig = () => request('/config');

// Route Runs
export const getRouteRuns = (status) => request(status ? `/route-runs?status=${status}` : '/route-runs');
export const getRouteRun = (id) => request(`/route-runs/${id}`);
export const createRouteRun = (machineIds) => request('/route-runs', { method: 'POST', body: JSON.stringify({ machineIds }) });
export const updateRouteRun = (id, data) => request(`/route-runs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const updateStop = (runId, stopId, status) => request(`/route-runs/${runId}/stops/${stopId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
