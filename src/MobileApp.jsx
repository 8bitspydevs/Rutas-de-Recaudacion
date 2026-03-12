import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, CheckCircle, XCircle, MapPin, Camera, Save, History, Route, LogOut, ChevronRight, AlertCircle } from 'lucide-react';
import MapView from './MapView';
import { getConfig, createRecord, uploadRecordImage, updateStop, updateRouteRun, getRecords } from './api';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n || 0).toLocaleString('es-PY');

const EMPTY_FORM = {
    contEntrada: '', contSalida: '',
    contDigital: '', contPozo: '', contReal: '',
    contPremioEntrada: '', contPremioSalida: '', contPremioStockAct: '', contPremioStockAdd: '',
    mntoTotal: '',
    photo: null,
};

// ─── RecordForm ──────────────────────────────────────────────────────────────
function RecordForm({ machine, stop, runId, config, onSaved, onBack }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const photoInputRef = useRef(null);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
    const n = (v) => parseInt(v) || 0;

    const contDif = n(form.contSalida) - n(form.contEntrada);
    const preCalc = contDif * (config?.precioFicha ?? 500);
    const contRealDif = n(form.contReal) - (n(form.contDigital) + n(form.contPozo));
    const mntoTotal = n(form.mntoTotal);
    const pctL = config?.pctLocatario ?? 0.4;
    const pctC = config?.pctCasa ?? 0.5;
    const pctR = config?.pctRecaudador ?? 0.1;
    const mntoLocatario = Math.round(mntoTotal * pctL);
    const mntoCasa = Math.round(mntoTotal * pctC);
    const mntoRecaudador = Math.round(mntoTotal * pctR);

    const required = ['contEntrada', 'contSalida', 'contDigital', 'contPozo', 'contReal', 'mntoTotal'];
    const isValid = required.every(k => form[k] !== '');

    async function handleSave() {
        if (!isValid) { setError('Completá todos los campos obligatorios'); return; }
        setSaving(true);
        setError('');
        try {
            const record = await createRecord({
                machine: machine.id,
                lgrId: machine.lgrId ?? null,
                rutId: runId,
                preCalc,
                contEntrada: n(form.contEntrada),
                contSalida: n(form.contSalida),
                contDigital: n(form.contDigital),
                contPozo: n(form.contPozo),
                contReal: n(form.contReal),
                contRealDif,
                contPremioEntrada: n(form.contPremioEntrada),
                contPremioSalida: n(form.contPremioSalida),
                contPremioStockAct: n(form.contPremioStockAct),
                contPremioStockAdd: n(form.contPremioStockAdd),
                mntoLocatario,
                mntoCasa,
                mntoRecaudador,
                mntoTotal,
                fisico: mntoTotal,
            });

            if (form.photo) {
                await uploadRecordImage(record.id, form.photo).catch(() => null);
            }

            if (stop && runId) {
                await updateStop(runId, stop.id, 'done');
            }

            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const Section = ({ title, children }) => (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{title}</div>
            {children}
        </div>
    );

    const Field = ({ label, value, onChange, readOnly = false, highlight = false }) => (
        <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
            <input
                type={readOnly ? 'text' : 'number'}
                readOnly={readOnly}
                value={value}
                onChange={onChange}
                inputMode="numeric"
                style={{
                    width: '100%', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${highlight ? 'var(--primary)' : 'var(--border)'}`,
                    background: readOnly ? 'var(--bg-color)' : 'var(--surface)',
                    color: highlight ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: highlight ? 700 : 400,
                    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
            />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', flexShrink: 0 }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', padding: 0 }}>
                    <ArrowLeft size={16} /> Volver
                </button>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{machine.id}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{machine.type} · {machine.location}</div>
            </div>

            {/* Form (scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>

                <Section title="Contadores de Juego">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <Field label="Entrada *" value={form.contEntrada} onChange={set('contEntrada')} />
                        <Field label="Salida *" value={form.contSalida} onChange={set('contSalida')} />
                    </div>
                    <Field label="Diferencia (auto)" value={contDif} readOnly highlight={contDif !== 0} />
                </Section>

                <Section title="Recaudación">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <Field label="Digital *" value={form.contDigital} onChange={set('contDigital')} />
                        <Field label="Pozo *" value={form.contPozo} onChange={set('contPozo')} />
                    </div>
                    <Field label="Real / Conteo físico *" value={form.contReal} onChange={set('contReal')} />
                    <Field label="Diferencia real (auto)" value={contRealDif} readOnly highlight={contRealDif !== 0} />
                </Section>

                <Section title="Premios / Stock">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <Field label="Premio Entrada" value={form.contPremioEntrada} onChange={set('contPremioEntrada')} />
                        <Field label="Premio Salida" value={form.contPremioSalida} onChange={set('contPremioSalida')} />
                        <Field label="Stock Actual" value={form.contPremioStockAct} onChange={set('contPremioStockAct')} />
                        <Field label="Stock Agregado" value={form.contPremioStockAdd} onChange={set('contPremioStockAdd')} />
                    </div>
                </Section>

                <Section title="Montos">
                    <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>Pre-cálculo sistema</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Gs. {fmt(preCalc)}</span>
                    </div>
                    <Field label="Monto Total Retirado (Gs.) *" value={form.mntoTotal} onChange={set('mntoTotal')} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {[['Locatario', mntoLocatario], ['Casa', mntoCasa], ['Recaudador', mntoRecaudador]].map(([label, val]) => (
                            <div key={label} style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{label}</div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Gs. {fmt(val)}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section title="Foto Evidencia">
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => setForm(f => ({ ...f, photo: e.target.files[0] || null }))}
                    />
                    {form.photo ? (
                        <div>
                            <img
                                src={URL.createObjectURL(form.photo)}
                                alt="evidencia"
                                style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', maxHeight: 180, objectFit: 'cover' }}
                            />
                            <button
                                onClick={() => photoInputRef.current.click()}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                            >
                                Cambiar foto
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => photoInputRef.current.click()}
                            style={{ width: '100%', padding: '0.75rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}
                        >
                            <Camera size={24} />
                            <span style={{ fontSize: '0.8rem' }}>Tomar foto evidencia</span>
                        </button>
                    )}
                </Section>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', color: '#b91c1c', fontSize: '0.8rem' }}>
                        <AlertCircle size={15} /> {error}
                    </div>
                )}
            </div>

            {/* Save button */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                <button
                    onClick={handleSave}
                    disabled={saving || !isValid}
                    style={{
                        width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)',
                        background: isValid ? 'var(--success, #10b981)' : 'var(--border)',
                        color: isValid ? 'white' : 'var(--text-muted)',
                        border: 'none', cursor: isValid ? 'pointer' : 'not-allowed',
                        fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    }}
                >
                    <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Registro'}
                </button>
            </div>
        </div>
    );
}

// ─── StopList (En Ruta) ──────────────────────────────────────────────────────
function StopList({ run, machines, onRegister, onSkip, onFinish }) {
    const stops = run.stops ?? [];
    const firstPendingIdx = stops.findIndex(s => s.status === 'pending');
    const allHandled = stops.every(s => s.status !== 'pending');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Ruta en curso</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {stops.filter(s => s.status === 'done').length} / {stops.length} paradas completadas
                </div>
            </div>

            {/* Stop list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {allHandled ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <CheckCircle size={40} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                        <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>¡Todas las paradas completadas!</div>
                        <div style={{ fontSize: '0.8rem' }}>Podés finalizar la ruta.</div>
                    </div>
                ) : (
                    stops.map((stop, i) => {
                        const machine = machines.find(m => m.id === stop.machineId);
                        const isNext = i === firstPendingIdx;
                        const isDone = stop.status === 'done';
                        const isFailed = stop.status === 'failed';

                        return (
                            <div key={stop.id} style={{
                                border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : isFailed ? 'rgba(239,68,68,0.2)' : isNext ? 'rgba(79,70,229,0.4)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-md)',
                                padding: '0.875rem',
                                marginBottom: '0.5rem',
                                background: isDone ? 'rgba(16,185,129,0.04)' : isFailed ? 'rgba(239,68,68,0.04)' : isNext ? 'rgba(79,70,229,0.04)' : 'var(--surface)',
                                opacity: isFailed ? 0.65 : 1,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                        background: isDone ? '#10b981' : isFailed ? '#ef4444' : isNext ? '#4f46e5' : '#9ca3af',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '0.72rem', fontWeight: 700,
                                    }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isFailed ? 'line-through' : 'none' }}>
                                            {machine?.location ?? stop.machineId}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stop.machineId} · {machine?.type ?? ''}</div>
                                    </div>
                                    {isDone && <CheckCircle size={18} color="#10b981" />}
                                    {isFailed && <XCircle size={18} color="#ef4444" />}
                                    {isNext && <MapPin size={18} color="#4f46e5" />}
                                </div>

                                {isNext && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                                        <button
                                            onClick={() => machine && onRegister(stop, machine)}
                                            style={{ flex: 2, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79,70,229,0.4)', background: 'rgba(79,70,229,0.08)', color: '#4f46e5', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                        >
                                            <ChevronRight size={14} /> Registrar
                                        </button>
                                        <button
                                            onClick={() => onSkip(stop)}
                                            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#b91c1c', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                                        >
                                            Saltar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                <button
                    onClick={onFinish}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', background: allHandled ? '#10b981' : '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {allHandled ? <><CheckCircle size={18} /> Finalizar Ruta</> : <><XCircle size={18} /> Cancelar Ruta</>}
                </button>
            </div>
        </div>
    );
}

// ─── HistoryView ─────────────────────────────────────────────────────────────
function HistoryView({ records }) {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>Registros de hoy</div>
            {records.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin registros aún</div>
            )}
            {records.map(r => {
                const diff = (r.contRealDif ?? 0);
                const isOk = diff === 0;
                return (
                    <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.machine}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 999, background: isOk ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: isOk ? '#065f46' : '#b91c1c' }}>
                                {isOk ? 'OK' : `Descuadre Gs.${fmt(Math.abs(diff))}`}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.location}</div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.78rem' }}>
                            <span>Ent: <b>{r.contEntrada}</b></span>
                            <span>Sal: <b>{r.contSalida}</b></span>
                            <span>Total: <b>Gs. {fmt(r.mntoTotal ?? r.fisico)}</b></span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── HomeView ────────────────────────────────────────────────────────────────
function HomeView({ onNewRoute, activeRun }) {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Hola, Recaudador</div>

            {activeRun ? (
                <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>Ruta activa</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {(activeRun.stops ?? []).filter(s => s.status === 'done').length} / {(activeRun.stops ?? []).length} paradas completadas
                    </div>
                </div>
            ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Sin ruta activa
                </div>
            )}

            <button
                onClick={onNewRoute}
                style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
                <Play size={18} /> Nueva Ruta
            </button>
        </div>
    );
}

// ─── MobileApp ───────────────────────────────────────────────────────────────
export default function MobileApp({ machines, onLogout, onRecordSaved }) {
    const [view, setView] = useState('home'); // home | map | run | record | history
    const [activeRun, setActiveRun] = useState(null);
    const [selectedStop, setSelectedStop] = useState(null);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [config, setConfig] = useState(null);
    const [todayRecords, setTodayRecords] = useState([]);

    useEffect(() => {
        getConfig().then(setConfig).catch(() => null);
        loadRecords();
    }, []);

    async function loadRecords() {
        try {
            const all = await getRecords();
            const today = new Date().toISOString().slice(0, 10);
            setTodayRecords(all.filter(r => r.date === today));
        } catch { /* offline */ }
    }

    function handleRunStarted(runId, apiStops, orderedMachines) {
        const stops = apiStops.map((s, i) => ({
            ...s,
            machineId: orderedMachines[i]?.id ?? s.machine_id,
            status: 'pending',
        }));
        setActiveRun({ id: runId, stops });
        setView('run');
    }

    function handleRegister(stop, machine) {
        setSelectedStop(stop);
        setSelectedMachine(machine);
        setView('record');
    }

    async function handleSkip(stop) {
        if (!activeRun) return;
        await updateStop(activeRun.id, stop.id, 'failed').catch(() => null);
        setActiveRun(prev => ({
            ...prev,
            stops: prev.stops.map(s => s.id === stop.id ? { ...s, status: 'failed' } : s),
        }));
    }

    async function handleFinish() {
        if (!activeRun) return;
        const allDone = activeRun.stops.every(s => s.status !== 'pending');
        await updateRouteRun(activeRun.id, { status: allDone ? 'completed' : 'cancelled' }).catch(() => null);
        setActiveRun(null);
        setView('home');
    }

    async function handleRecordSaved() {
        // Mark stop as done and update local run state
        setActiveRun(prev => {
            if (!prev || !selectedStop) return prev;
            const newStops = prev.stops.map(s => s.id === selectedStop.id ? { ...s, status: 'done' } : s);
            const allDone = newStops.every(s => s.status !== 'pending');
            if (allDone) {
                updateRouteRun(prev.id, { status: 'completed' }).catch(() => null);
            }
            return { ...prev, stops: newStops };
        });
        await loadRecords();
        onRecordSaved?.();
        setView('run');
    }

    const navItems = [
        { id: 'home', icon: Route, label: 'Ruta' },
        { id: 'history', icon: History, label: 'Historial' },
        { id: 'logout', icon: LogOut, label: 'Salir' },
    ];

    // Map view is full-screen (no mobile frame)
    if (view === 'map') {
        return (
            <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, zIndex: 1001 }}>
                    <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <ArrowLeft size={16} /> Volver
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Nueva Ruta</span>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <MapView
                        machines={machines}
                        mobile={true}
                        onRunStarted={handleRunStarted}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
            {/* Top bar */}
            <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>SEPRISA Terreno</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Main content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {view === 'home' && (
                    <HomeView
                        onNewRoute={() => setView('map')}
                        activeRun={activeRun}
                        onContinue={() => setView('run')}
                    />
                )}

                {view === 'run' && activeRun && (
                    <StopList
                        run={activeRun}
                        machines={machines}
                        onRegister={handleRegister}
                        onSkip={handleSkip}
                        onFinish={handleFinish}
                    />
                )}

                {view === 'record' && selectedMachine && (
                    <RecordForm
                        machine={selectedMachine}
                        stop={selectedStop}
                        runId={activeRun?.id}
                        config={config}
                        onSaved={handleRecordSaved}
                        onBack={() => setView('run')}
                    />
                )}

                {view === 'history' && (
                    <HistoryView records={todayRecords} />
                )}
            </div>

            {/* Bottom nav */}
            {view !== 'record' && (
                <div style={{ display: 'flex', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                    {navItems.map(({ id, icon: NavIcon, label }) => {
                        const isActive = view === id || (view === 'run' && id === 'home');
                        return (
                            <button
                                key={id}
                                onClick={() => {
                                    if (id === 'logout') onLogout();
                                    else if (id === 'home' && activeRun) setView('run');
                                    else setView(id);
                                }}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.25rem', padding: '0.75rem 0', border: 'none', background: 'none', cursor: 'pointer',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: isActive ? 600 : 400, fontSize: '0.72rem',
                                    borderTop: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                                }}
                            >
                                <NavIcon size={20} />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
