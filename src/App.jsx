import React, { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import MapView from './MapView';
import { getMachines, getRecords, createRecord, updateMachine, getRouteRuns, updateStop, updateRouteRun, createMachine, getTipos, getLugares, createLugar } from './api';
import './index.css';

const Icon = ({ name, size = 24, className = "" }) => {
    const componentName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const IconComponent = LucideIcons[componentName] || LucideIcons.HelpCircle;
    return <IconComponent size={size} className={className} />;
};


const RunCard = ({ run, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [processing, setProcessing] = useState(false);
    const doneStops = run.stops.filter(s => s.status === 'done').length;
    const [datePart, timePart] = run.startedAt.split(' ');
    const timeStr = timePart ? timePart.slice(0, 5) : '';
    const isActive = run.status === 'active';
    const firstPendingIdx = run.stops.findIndex(s => s.status === 'pending');

    const statusLabel = { active: 'Activa', completed: 'Completada', cancelled: 'Cancelada' };
    const statusBadgeClass = { active: 'badge-primary', completed: 'badge-success', cancelled: '' };
    const dotColor = { active: '#4f46e5', completed: '#10b981', cancelled: '#9ca3af' };

    async function handleStop(stop, status) {
        setProcessing(true);
        await updateStop(run.id, stop.id, status);
        const updatedStatuses = run.stops.map(s => s.id === stop.id ? status : s.status);
        if (updatedStatuses.every(s => s !== 'pending')) {
            await updateRouteRun(run.id, { status: 'completed', totalDistance: run.totalDistance, totalTime: run.totalTime });
        }
        await onUpdate();
        setProcessing(false);
    }

    async function handleFinalize() {
        setProcessing(true);
        await updateRouteRun(run.id, { status: 'cancelled', totalDistance: run.totalDistance, totalTime: run.totalTime });
        await onUpdate();
        setProcessing(false);
    }

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div
                style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: dotColor[run.status] ?? '#9ca3af' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="font-semibold text-sm">Ruta #{run.id}</span>
                        <span className={`badge ${statusBadgeClass[run.status] ?? ''}`} style={{ fontSize: '0.65rem' }}>
                            {statusLabel[run.status] ?? run.status}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {datePart} · {timeStr}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paradas</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{doneStops}/{run.stops.length}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Distancia</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{run.totalDistance.toFixed(1)} km</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tiempo</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{run.totalTime} min</div>
                    </div>
                    <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} className="text-muted" />
                </div>
            </div>
            {expanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', background: 'var(--bg-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {run.stops.map((stop, i) => {
                            const isNext = isActive && i === firstPendingIdx;
                            return (
                                <div key={stop.id} style={{
                                    border: `1px solid ${isNext ? 'rgba(79,70,229,0.3)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.5rem 0.625rem',
                                    background: isNext ? 'rgba(79,70,229,0.04)' : 'transparent',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0,
                                            background: stop.status === 'done' ? '#10b981' : stop.status === 'failed' ? '#ef4444' : isNext ? '#4f46e5' : '#9ca3af'
                                        }}>{i + 1}</div>
                                        <span style={{ flex: 1 }}>{stop.location}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{stop.machineId}</span>
                                        {stop.status !== 'pending' && (
                                            <span style={{
                                                fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: 4, fontWeight: 600,
                                                background: stop.status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: stop.status === 'done' ? '#065f46' : '#b91c1c'
                                            }}>
                                                {stop.status === 'done' ? 'Visitado' : 'Saltado'}
                                            </span>
                                        )}
                                    </div>
                                    {isNext && (
                                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                                            <button
                                                disabled={processing}
                                                onClick={() => handleStop(stop, 'done')}
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#065f46', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.5 : 1 }}
                                            >
                                                <Icon name="check-circle" size={13} /> Visitado
                                            </button>
                                            <button
                                                disabled={processing}
                                                onClick={() => handleStop(stop, 'failed')}
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.5 : 1 }}
                                            >
                                                <Icon name="x-circle" size={13} /> Saltado
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {isActive && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                            <button
                                disabled={processing}
                                onClick={handleFinalize}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.5 : 1 }}
                            >
                                <Icon name="square" size={13} /> Finalizar Ruta
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const RoutesPage = ({ machines }) => {
    const [subView, setSubView] = useState('list');
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadRuns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRouteRuns();
            setRuns(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (subView === 'list') loadRuns();
    }, [subView, loadRuns]);

    if (subView === 'map') {
        return <MapView machines={machines} onBack={() => setSubView('list')} />;
    }

    const active = runs.filter(r => r.status === 'active');
    const finished = runs.filter(r => r.status !== 'active');

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Historial de Rutas</h2>
                    <p className="text-sm text-muted mt-1">{runs.length} ejecuciones registradas</p>
                </div>
                <button className="btn btn-primary" onClick={() => setSubView('map')}>
                    <Icon name="plus" size={16} /> Nueva Ruta
                </button>
            </div>

            {loading ? (
                <div className="card p-8 text-center text-muted">Cargando rutas...</div>
            ) : runs.length === 0 ? (
                <div className="card p-8 flex flex-col items-center justify-center text-muted" style={{ minHeight: 200 }}>
                    <Icon name="map" size={48} className="mb-4" />
                    <p className="font-semibold">No hay rutas registradas</p>
                    <p className="text-sm mt-1">Haz clic en "Nueva Ruta" para comenzar</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {active.length > 0 && (
                        <div>
                            <div className="text-xs text-muted font-semibold uppercase mb-3" style={{ letterSpacing: '0.05em' }}>
                                Rutas Activas ({active.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {active.map(run => <RunCard key={run.id} run={run} onUpdate={loadRuns} />)}
                            </div>
                        </div>
                    )}
                    {finished.length > 0 && (
                        <div>
                            <div className="text-xs text-muted font-semibold uppercase mb-3" style={{ letterSpacing: '0.05em' }}>
                                Rutas Finalizadas ({finished.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {finished.map(run => <RunCard key={run.id} run={run} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Machine prefix lookup ────────────────────────────────────────────────────
const TYPE_PREFIX = { 1: 'MQR', 2: 'MQC', 3: 'MQP', 4: 'MQG' };

function generateMachineId(tmqId, existingMachines) {
    const prefix = TYPE_PREFIX[tmqId] ?? 'MQX';
    const nums = existingMachines
        .filter(m => m.id.startsWith(prefix + '-'))
        .map(m => parseInt(m.id.split('-')[1]) || 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}-${String(next).padStart(3, '0')}`;
}

// ─── MachinesPage (create form) ───────────────────────────────────────────────
const MachinesPage = ({ machines, onMachineCreated, onBack }) => {
    const [tipos, setTipos] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showNewLugar, setShowNewLugar] = useState(false);

    // Form state
    const [form, setForm] = useState({
        tmqId: '',
        lgrId: '',
        proId: '',
        status: 'ok',
        fechaCreacion: new Date().toISOString().slice(0, 10),
    });
    // New lugar inline form
    const [lugarForm, setLugarForm] = useState({ nombre: '', direccion: '', lat: '', lng: '' });

    const loadMeta = useCallback(async () => {
        const [t, l] = await Promise.all([getTipos(), getLugares()]);
        setTipos(t);
        setLugares(l);
        if (t.length > 0) setForm(f => f.tmqId ? f : { ...f, tmqId: String(t[0].id) });
        if (l.length > 0) setForm(f => f.lgrId ? f : { ...f, lgrId: String(l[0].id) });
    }, []);

    useEffect(() => { loadMeta(); }, [loadMeta]);

    const generatedId = form.tmqId ? generateMachineId(parseInt(form.tmqId), machines) : '—';

    async function handleAddLugar() {
        if (!lugarForm.nombre.trim()) return;
        const created = await createLugar({
            nombre: lugarForm.nombre,
            direccion: lugarForm.direccion || null,
            lat: lugarForm.lat ? parseFloat(lugarForm.lat) : null,
            lng: lugarForm.lng ? parseFloat(lugarForm.lng) : null,
        });
        setLugares(prev => [...prev, created]);
        setForm(f => ({ ...f, lgrId: String(created.id) }));
        setLugarForm({ nombre: '', direccion: '', lat: '', lng: '' });
        setShowNewLugar(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.tmqId || !form.lgrId) return;
        setSaving(true);
        try {
            await createMachine({
                id: generatedId,
                tmqId: parseInt(form.tmqId),
                lgrId: parseInt(form.lgrId),
                proId: form.proId ? parseInt(form.proId) : undefined,
                status: form.status,
            });
            await onMachineCreated();
            onBack();
        } catch (err) {
            alert('Error al crear máquina: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6 cursor-pointer text-muted hover:text-primary transition-colors"
                onClick={onBack}>
                <Icon name="arrow-left" size={20} />
                <span className="font-semibold text-sm">Volver al Inventario</span>
            </div>

            <div className="card p-8">
                    <div className="border-b pb-4 mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Icon name="joystick" className="text-primary" /> Nueva Máquina
                        </h3>
                        <p className="text-sm text-muted mt-1">El ID se genera automáticamente según el tipo seleccionado.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Generated ID preview */}
                        <div className="card mb-6 p-4" style={{ background: 'var(--bg-color)', border: '1px dashed var(--border)' }}>
                            <div className="text-xs text-muted mb-1">ID generado automáticamente</div>
                            <div className="text-2xl font-bold text-primary">{generatedId}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tipo */}
                            <div className="input-group">
                                <label className="label">Tipo de Máquina <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <select className="input" required value={form.tmqId}
                                    onChange={e => setForm(f => ({ ...f, tmqId: e.target.value }))}>
                                    <option value="">Seleccionar tipo...</option>
                                    {tipos.map(t => <option key={t.id} value={t.id}>{t.desc}</option>)}
                                </select>
                            </div>

                            {/* Estado */}
                            <div className="input-group">
                                <label className="label">Estado Operativo</label>
                                <select className="input" value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                    <option value="ok">Operativa (OK)</option>
                                    <option value="warning">Requiere Mantención (Aviso)</option>
                                </select>
                            </div>

                            {/* Fecha de creación */}
                            <div className="input-group">
                                <label className="label">Fecha de Alta</label>
                                <input type="date" className="input" value={form.fechaCreacion}
                                    onChange={e => setForm(f => ({ ...f, fechaCreacion: e.target.value }))} />
                            </div>

                            {/* Producto (opcional) */}
                            <div className="input-group">
                                <label className="label">Producto <span className="text-muted text-xs">(opcional)</span></label>
                                <input className="input" placeholder="ID de producto" value={form.proId}
                                    onChange={e => setForm(f => ({ ...f, proId: e.target.value }))} />
                            </div>

                            {/* Lugar */}
                            <div className="input-group md:col-span-2">
                                <label className="label">Ubicación <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select className="input" required value={form.lgrId}
                                        onChange={e => setForm(f => ({ ...f, lgrId: e.target.value }))}>
                                        <option value="">Seleccionar lugar...</option>
                                        {lugares.map(l => (
                                            <option key={l.id} value={l.id}>{l.nombre}{l.direccion ? ` — ${l.direccion}` : ''}</option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}
                                        onClick={() => setShowNewLugar(v => !v)}>
                                        <Icon name="plus" size={14} /> Nuevo lugar
                                    </button>
                                </div>
                            </div>

                            {/* Inline new lugar */}
                            {showNewLugar && (
                                <div className="md:col-span-2">
                                    <div className="card p-4" style={{ background: 'var(--bg-color)', border: '1px solid var(--border)' }}>
                                        <div className="text-sm font-semibold mb-3">Agregar nuevo lugar</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="input-group">
                                                <label className="label">Nombre <span style={{ color: 'var(--danger)' }}>*</span></label>
                                                <input className="input" placeholder="Ej: Supermercado ABC" value={lugarForm.nombre}
                                                    onChange={e => setLugarForm(f => ({ ...f, nombre: e.target.value }))} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label">Dirección</label>
                                                <input className="input" placeholder="Ej: Av. Principal 123" value={lugarForm.direccion}
                                                    onChange={e => setLugarForm(f => ({ ...f, direccion: e.target.value }))} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label">Latitud</label>
                                                <input type="number" step="any" className="input" placeholder="-25.3350" value={lugarForm.lat}
                                                    onChange={e => setLugarForm(f => ({ ...f, lat: e.target.value }))} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label">Longitud</label>
                                                <input type="number" step="any" className="input" placeholder="-57.5310" value={lugarForm.lng}
                                                    onChange={e => setLugarForm(f => ({ ...f, lng: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowNewLugar(false)}>Cancelar</button>
                                            <button type="button" className="btn btn-primary" onClick={handleAddLugar}>
                                                <Icon name="save" size={14} /> Guardar lugar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                <Icon name="save" size={16} /> {saving ? 'Guardando...' : 'Crear Máquina'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
};

const AdminSidebar = ({ active, setActive }) => (
    <div className="sidebar">
        <div className="flex items-center gap-2 mb-6 px-2">
            <div className="bg-primary-light p-2 rounded">
                <Icon name="coins" size={24} className="text-primary" />
            </div>
            <span className="font-bold text-xl">SEPRISA</span>
        </div>
        
        <div className="text-xs text-muted font-semibold mb-2 px-2 uppercase">Menu Principal</div>
        <div className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')}>
            <Icon name="layout-dashboard" size={20} /> Dashboard
        </div>
        <div className={`nav-item ${active === 'machines' ? 'active' : ''}`} onClick={() => setActive('machines')}>
            <Icon name="joystick" size={20} /> Máquinas
        </div>
        <div className={`nav-item ${active === 'routes' ? 'active' : ''}`} onClick={() => setActive('routes')}>
            <Icon name="map" size={20} /> Rutas
        </div>
        <div className={`nav-item ${active === 'payments' ? 'active' : ''}`} onClick={() => setActive('payments')}>
            <Icon name="receipt" size={20} /> Liquidaciones
        </div>

        <div className="flex-1"></div>
        
        <div className="nav-item mt-auto">
            <Icon name="settings" size={20} /> Configuración
        </div>
        <div className="nav-item text-danger" onClick={setActive === 'logout' ? null : () => setActive('logout')}>
            <Icon name="log-out" size={20} /> Cerrar Sesión
        </div>
    </div>
);

const AdminDashboard = ({ records, machines, onSaveMachine, onMachineCreated, onLogout }) => {
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [editingMachine, setEditingMachine] = useState(null);
    const [historyMachine, setHistoryMachine] = useState(null);
    const [machinesSubView, setMachinesSubView] = useState('list');

    // Intercept logout from sidebar
    if (activeMenu === 'logout') {
        onLogout();
        return null;
    }
    
    const totalRecaudacion = records.reduce((acc, r) => acc + r.fisico, 0);
    const totalAvisos = records.filter(r => r.status !== 'OK').length;

    return (
        <div className="admin-shell animate-fade-in">
            <AdminSidebar active={activeMenu} setActive={setActiveMenu} />
            
            <div className="flex-col w-full h-full overflow-hidden">
                <div className="topbar">
                    <div className="text-lg font-semibold">
                        {activeMenu === 'dashboard' && 'Resumen de Recaudación'}
                        {activeMenu === 'machines' && 'Gestión de Máquinas'}
                        {activeMenu === 'edit-machine' && 'Editar Máquina'}
                        {activeMenu === 'routes' && 'Monitoreo de Rutas'}
                        {activeMenu === 'payments' && 'Liquidación a Locatarios'}
                    </div>
                    <div className="flex items-center gap-4">
                        <Icon name="bell" size={20} className="text-muted" />
                        <div className="flex items-center gap-2">
                            <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
                            <span className="text-sm font-medium">Admin Central</span>
                        </div>
                    </div>
                </div>

                <div className="main-content">
                    {activeMenu === 'dashboard' && (
                        <div>
                            <div className="stats-grid">
                                <div className="card stat-card">
                                    <div className="stat-icon bg-success-light">
                                        <Icon name="trending-up" size={24} />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted">Recaudación Diaria</div>
                                        <div className="text-2xl font-bold">${totalRecaudacion.toLocaleString('es-CL')}</div>
                                    </div>
                                </div>
                                <div className="card stat-card">
                                    <div className="stat-icon bg-primary-light">
                                        <Icon name="map-pin" size={24} />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted">Rutas Activas</div>
                                        <div className="text-2xl font-bold">4</div>
                                    </div>
                                </div>
                                <div className="card stat-card">
                                    <div className="stat-icon bg-warning-light">
                                        <Icon name="alert-triangle" size={24} />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted">Avisos / Descuadres</div>
                                        <div className="text-2xl font-bold">{totalAvisos}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="card mb-6">
                                <div className="p-4 border-b">
                                    <h3 className="font-semibold text-lg">Últimas Recaudaciones Procesadas</h3>
                                </div>
                                <div className="table-wrapper">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Máquina</th>
                                                <th>Lugar</th>
                                                <th>Pre-calc Esperado</th>
                                                <th>Ingresado Físico</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map(r => (
                                                <tr key={r.id}>
                                                    <td className="font-medium">{r.machine}</td>
                                                    <td>{r.location}</td>
                                                    <td>${r.preCalc.toLocaleString('es-CL')}</td>
                                                    <td>${r.fisico.toLocaleString('es-CL')}</td>
                                                    <td>
                                                        <span className={`badge ${r.status === 'OK' ? 'badge-success' : 'badge-warning'}`}>
                                                            {r.status === 'OK' ? 'OK' : `Descuadre ($${Math.abs(r.fisico - r.preCalc).toLocaleString('es-CL')})`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeMenu === 'machines' && machinesSubView === 'create' && (
                        <MachinesPage
                            machines={machines}
                            onMachineCreated={onMachineCreated}
                            onBack={() => setMachinesSubView('list')}
                        />
                    )}

                    {activeMenu === 'machines' && machinesSubView === 'list' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Inventario de Máquinas</h2>
                                <button className="btn btn-primary" onClick={() => setMachinesSubView('create')}>
                                    <Icon name="plus" size={16} /> Nueva Máquina
                                </button>
                            </div>

                            <div className="card">
                                <div className="table-wrapper">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID Máquina</th>
                                                <th>Tipo</th>
                                                <th>Ubicación Actual</th>
                                                <th>Última Recaudación</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {machines.map(m => (
                                                <tr key={m.id}>
                                                    <td className="font-medium text-primary">{m.id}</td>
                                                    <td>{m.type}</td>
                                                    <td>
                                                        <div className="flex items-center gap-1.5">
                                                            <Icon name="map-pin" size={14} className="text-muted" />
                                                            <span>{m.location}</span>
                                                        </div>
                                                    </td>
                                                    <td className="font-semibold">{m.lastRevenue}</td>
                                                    <td>
                                                        <span className={`badge ${m.status === 'ok' ? 'badge-success' : 'badge-warning'}`}>
                                                            {m.status === 'ok' ? 'Operativa' : 'Requiere Mantención'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-2">
                                                            <button className="btn btn-secondary btn-icon" title="Editar" onClick={() => {
                                                                setEditingMachine(m);
                                                                setActiveMenu('edit-machine');
                                                            }}>
                                                                <Icon name="edit" size={16} />
                                                            </button>
                                                            <button className="btn btn-secondary btn-icon" title="Historial" onClick={() => setHistoryMachine(m)}>
                                                                <Icon name="history" size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EDIT MACHINE SCREEN */}
                    {activeMenu === 'edit-machine' && editingMachine && (
                        <div className="animate-fade-in max-w-3xl mx-auto">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-muted hover:text-primary transition-colors" onClick={() => {
                                setEditingMachine(null);
                                setActiveMenu('machines');
                            }}>
                                <Icon name="arrow-left" size={20} />
                                <span className="font-semibold text-sm">Volver al Inventario</span>
                            </div>

                            <div className="card p-8">
                                <div className="border-b pb-4 mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Icon name="joystick" className="text-primary" /> 
                                        Editar Máquina: <span className="text-primary">{editingMachine.id}</span>
                                    </h3>
                                    <p className="text-sm text-muted mt-1">Modifique los detalles técnicos y ubicación de la máquina.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="input-group">
                                        <label className="label">Tipo de Máquina</label>
                                        <select className="input" value={editingMachine.type} onChange={e => setEditingMachine({...editingMachine, type: e.target.value})}>
                                            <option>Peluches</option>
                                            <option>Monedas</option>
                                            <option>Casitas</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="label">Ubicación Actual</label>
                                        <input className="input" value={editingMachine.location} onChange={e => setEditingMachine({...editingMachine, location: e.target.value})} />
                                    </div>
                                    <div className="input-group md:col-span-2">
                                        <label className="label">Estado Operativo</label>
                                        <select className="input" value={editingMachine.status} onChange={e => setEditingMachine({...editingMachine, status: e.target.value})}>
                                            <option value="ok">Operativa (OK)</option>
                                            <option value="warning">Requiere Mantención (Aviso)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                                    <button className="btn btn-secondary" onClick={() => {
                                        setEditingMachine(null);
                                        setActiveMenu('machines');
                                    }}>
                                        Cancelar
                                    </button>
                                    <button className="btn btn-primary" onClick={async () => {
                                        await onSaveMachine(editingMachine.id, {
                                            type: editingMachine.type,
                                            location: editingMachine.location,
                                            status: editingMachine.status,
                                        });
                                        setEditingMachine(null);
                                        setActiveMenu('machines');
                                    }}>
                                        <Icon name="save" size={16} /> Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HISTORY MODAL (Kept as modal since it's just a quick data view) */}
                    {historyMachine && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <div className="card p-6 w-full max-w-2xl bg-surface shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold">Historial de Recaudación: {historyMachine.id}</h3>
                                    <button className="btn-icon" onClick={() => setHistoryMachine(null)}>
                                        <Icon name="x" size={20} className="text-muted" />
                                    </button>
                                </div>
                                
                                <div className="table-wrapper max-h-64 overflow-y-auto">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID Tarea</th>
                                                <th>Fecha</th>
                                                <th>Monto Recaudado</th>
                                                <th>Cuadre</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.filter(r => r.machine === historyMachine.id).length > 0 ? (
                                                records.filter(r => r.machine === historyMachine.id).map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="font-medium text-muted">#{r.id}</td>
                                                        <td>{r.date || "Hoy"}</td>
                                                        <td className="font-bold">${r.fisico.toLocaleString('es-CL')}</td>
                                                        <td>
                                                        <span className={`badge ${r.status === 'OK' ? 'badge-success' : 'badge-warning'}`}>
                                                            {r.status === 'OK' ? 'OK' : `Descuadre`}
                                                        </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center text-muted p-4">No hay registros de recaudación para esta máquina.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button className="btn btn-primary" onClick={() => setHistoryMachine(null)}>Cerrar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeMenu === 'routes' && (
                        <RoutesPage machines={machines} />
                    )}

                    {activeMenu !== 'dashboard' && activeMenu !== 'machines' && activeMenu !== 'edit-machine' && activeMenu !== 'routes' && (
                        <div className="card p-6 flex flex-col items-center justify-center text-muted" style={{ height: 400 }}>
                            <Icon name="hammer" size={48} className="mb-4 text-muted" />
                            <div className="text-lg font-semibold">Módulo en Desarrollo</div>
                            <p className="text-sm">Esta vista corresponde a "{activeMenu}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MobileApp = ({ onSaveRecord, onLogout }) => {
    const [view, setView] = useState('home'); // home, route, machine, camera

    // Interceptar la vista 'profile' para Logout
    if (view === 'profile') {
        onLogout();
        return null;
    }

    const [contEntrada, setContEntrada] = useState('');
    const [contSalida, setContSalida] = useState('');
    const [contDigital, setContDigital] = useState('');
    const [montoRetirado, setMontoRetirado] = useState('');

    const preCalculo = (parseInt(contDigital) || 0) * 500;

    const handleSave = async () => {
        if (!contEntrada || !contSalida || !contDigital || !montoRetirado) {
            alert('Por favor complete todos los campos de contadores');
            return;
        }
        
        const fisico = parseInt(montoRetirado) || 0;
        const status = fisico === preCalculo ? 'OK' : 'Descuadre';

        try {
            await onSaveRecord({
                machine: "MQR-001",
                location: "Supermercado Lider",
                preCalc: preCalculo,
                fisico: fisico,
                status: status,
                contEntrada, contSalida, contDigital
            });

            alert("¡Registro Guardado Exitosamente!");
            setView('route');
            setContEntrada('');
            setContSalida('');
            setContDigital('');
            setMontoRetirado('');
        } catch (err) {
            alert('Error al guardar: asegúrate de que el servidor backend esté corriendo (npm run server:dev).\n\nDetalle: ' + err.message);
        }
    };

    return (
        <div className="mobile-simulator-wrapper animate-fade-in">
            <div className="mobile-device">
                <div className="mobile-header">
                    <div className="flex justify-between items-center text-xs mb-4 opacity-70 font-medium">
                        <span>14:30</span>
                        <div className="flex gap-1 items-center">
                            <Icon name="signal-high" size={14} />
                            <Icon name="wifi" size={14} />
                            <Icon name="battery-full" size={14} />
                        </div>
                    </div>
                    <div className="text-xl font-bold">SEPRISA Terreno</div>
                </div>

                <div className="mobile-content relative">
                    {view === 'home' && (
                        <div className="animate-fade-in">
                            <h2 className="text-lg font-bold mb-4">Iniciar Ruta</h2>
                            <div className="card p-4 mb-4">
                                <div className="input-group">
                                    <label className="label">Vehículo Asignado</label>
                                    <select className="input">
                                        <option>KIA Furgón (AB-CD-12)</option>
                                        <option>Peugeot Partner (WX-YZ-99)</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="label">Kilometraje Inicial</label>
                                    <input type="number" className="input" placeholder="Ej: 145000" />
                                </div>
                                <button className="btn btn-primary w-full mt-2" onClick={() => setView('route')}>
                                    <Icon name="play" size={16} /> Comenzar Jornada
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between text-muted text-sm px-2">
                                <span>Última sincro: Hace 2m</span>
                                <Icon name="cloud-off" size={16} className="text-danger" />
                            </div>
                        </div>
                    )}

                    {view === 'route' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">Mi Ruta de Hoy</h2>
                                <span className="badge badge-primary">3 Locales</span>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <div className="card p-4" onClick={() => setView('machine')}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold">Supermercado Lider</span>
                                        <Icon name="chevron-right" size={18} className="text-muted" />
                                    </div>
                                    <div className="text-sm text-muted flex items-center gap-1 mb-2">
                                        <Icon name="map-pin" size={14} /> Av. Principal 123
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="badge badge-warning">2 Máquinas</span>
                                    </div>
                                </div>

                                <div className="card p-4 opacity-60">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-muted">Mall Centro (Completado)</span>
                                        <Icon name="check-circle" size={18} className="text-success" />
                                    </div>
                                    <div className="text-sm text-muted flex items-center gap-1 mb-2">
                                        <Icon name="map-pin" size={14} /> Calle Arturo Prat 45
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-danger w-full mt-6">
                                <Icon name="square" size={16} /> Finalizar Ruta
                            </button>
                        </div>
                    )}

                    {view === 'machine' && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setView('route')}>
                                <Icon name="arrow-left" size={20} />
                                <span className="font-semibold">Volver</span>
                            </div>

                            <div className="card p-4 mb-4 bg-primary-light border-0">
                                <h3 className="font-bold text-primary">MQR-001 (Peluches)</h3>
                                <div className="text-sm text-primary">Supermercado Lider</div>
                            </div>

                            <h4 className="font-semibold mb-2">Registro de Contadores</h4>
                            <div className="card p-4 mb-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="label">Cont. Entrada</label>
                                        <input type="number" className="input" placeholder="0" value={contEntrada} onChange={e => setContEntrada(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label className="label">Cont. Salida</label>
                                        <input type="number" className="input" placeholder="0" value={contSalida} onChange={e => setContSalida(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label className="label">Cont. Digital (Monedas)</label>
                                        <input type="number" className="input" placeholder="0" value={contDigital} onChange={e => setContDigital(e.target.value)} />
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-bg-color rounded mt-2 flex justify-between items-center text-primary font-bold">
                                    <span>Pre-Cálculo de Sistema ($500 c/u):</span>
                                    <span>${preCalculo.toLocaleString('es-CL')}</span>
                                </div>
                            </div>

                            <h4 className="font-semibold mb-2">Recaudación Física</h4>
                            <div className="card p-4 mb-4">
                                <div className="input-group">
                                    <label className="label">Dinero Retirado ($)</label>
                                    <input type="number" className="input" placeholder="Ej: 45000" value={montoRetirado} onChange={e => setMontoRetirado(e.target.value)} />
                                </div>
                                
                                <button className="btn btn-secondary w-full justify-center text-sm" onClick={() => alert("Simulando abrir cámara...")}>
                                    <Icon name="camera" size={16} /> Tomar Fotografía Evidencia
                                </button>
                            </div>

                            <button className="btn btn-success w-full" style={{ backgroundColor: 'var(--success)', color: 'white' }} onClick={handleSave}>
                                <Icon name="save" size={16} /> Guardar Registro
                            </button>
                        </div>
                    )}
                </div>

                <div className="mobile-bottom-nav">
                    <div className={`mobile-nav-item ${view === 'home' || view === 'route' || view === 'machine' ? 'active' : ''}`} onClick={() => setView('home')}>
                        <Icon name="route" />
                        <span>Ruta</span>
                    </div>
                    <div className="mobile-nav-item">
                        <Icon name="receipt" />
                        <span>Gastos</span>
                    </div>
                    <div className="mobile-nav-item">
                        <Icon name="history" />
                        <span>Historial</span>
                    </div>
                    <div className={`mobile-nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
                        <Icon name="user" />
                        <span>Salir</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoginScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulación de autenticación (Hardcoded para el prototipo)
        if (username === 'admin' && password === 'admin') {
            onLogin('admin');
        } else if (username === 'terreno' && password === 'terreno') {
            onLogin('mobile');
        } else {
            setError('Credenciales inválidas. Intente admin/admin o terreno/terreno.');
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-bg-color animate-fade-in">
            <div className="card w-full max-w-sm p-6 shadow-lg">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-primary-light p-3 rounded-full mb-3">
                        <Icon name="coins" size={32} className="text-primary" />
                    </div>
                    <h1 className="text-xl font-bold text-center">POS SEPRISA</h1>
                    <p className="text-muted text-center mt-1 text-sm">Sistema de Gestión y Recaudación</p>
                </div>

                {error && (
                    <div className="bg-danger-light text-danger p-2 rounded-md mb-4 text-xs font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="input-group mb-0">
                        <label className="label text-xs">Usuario</label>
                        <input 
                            type="text" 
                            className="input py-1.5" 
                            placeholder="Ej: admin o terreno" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group mb-0">
                        <label className="label text-xs">Contraseña</label>
                        <input 
                            type="password" 
                            className="input py-1.5" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-primary w-full mt-2 py-2 text-sm">
                        <Icon name="log-in" size={16} /> Iniciar Sesión
                    </button>
                </form>

                <div className="mt-4 text-center text-xs text-muted">
                    <p className="mb-1"><strong>Cuentas de Prueba:</strong></p>
                    <p className="mb-0.5">Admin: <code className="bg-surface-hover px-1 rounded">admin / admin</code></p>
                    <p>Terreno: <code className="bg-surface-hover px-1 rounded">terreno / terreno</code></p>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [authUser, setAuthUser] = useState(null);
    const [records, setRecords] = useState([]);
    const [machines, setMachines] = useState([]);

    const refreshData = useCallback(async () => {
        const [m, r] = await Promise.all([getMachines(), getRecords()]);
        setMachines(m);
        setRecords(r);
    }, []);

    useEffect(() => {
        if (authUser) refreshData();
    }, [authUser, refreshData]);

    const handleAddRecord = async (record) => {
        await createRecord(record);
        await refreshData();
    };

    const handleSaveMachine = async (id, data) => {
        await updateMachine(id, data);
        await refreshData();
    };

    const handleLogout = () => {
        setAuthUser(null);
    };

    // Si no hay usuario autenticado, mostrar pantalla de Login
    if (!authUser) {
        return <LoginScreen onLogin={setAuthUser} />;
    }

    return (
        <div className="h-screen w-full relative">
            {/* El Switcher inferior de Prototipo se deshabilita porque el Router ahora manda */}
            
            {authUser === 'admin' ?
                <AdminDashboard records={records} machines={machines} onSaveMachine={handleSaveMachine} onMachineCreated={refreshData} onLogout={handleLogout} /> :
                <MobileApp machines={machines} onSaveRecord={handleAddRecord} onLogout={handleLogout} />
            }
        </div>
    );
};

export default App;
