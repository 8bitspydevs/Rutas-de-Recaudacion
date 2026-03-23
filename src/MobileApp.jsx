import { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import {
  ArrowLeft, Play, CheckCircle, XCircle, MapPin, Camera, Save,
  History, Route, LogOut, ChevronRight, AlertCircle, Wrench,
  Calculator, X, Plus, Trash2, ClipboardList, Navigation, Map,
} from 'lucide-react';
import MapView from './MapView';
import { getConfig, createRecord, uploadRecordImage, updateStop, updateRouteRun, getRecords, createMaintenance } from './api';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n || 0).toLocaleString('es-PY');

const EMPTY_FORM = {
  contEntrada: '', contSalida: '',
  contDigital: '', contPozo: '', contReal: '',
  contPremioEntrada: '', contPremioSalida: '', contPremioStockAct: '', contPremioStockAdd: '',
  mntoTotal: '',
  photos: [null, null, null],
};

// ─── PreCalcModal ─────────────────────────────────────────────────────────────
function PreCalcModal({ form, config, onClose }) {
  const n = (v) => parseInt(v) || 0;
  const contDif     = n(form.contSalida) - n(form.contEntrada);
  const preCalc     = contDif * (config?.precioFicha ?? 500);
  const contRealDif = n(form.contReal) - n(form.contPozo);
  const mntoTotal   = n(form.mntoTotal);
  const pctL        = config?.pctLocatario ?? 0.4;
  const pctC        = config?.pctCasa ?? 0.5;
  const pctR        = config?.pctRecaudador ?? 0.1;

  const Row = ({ label, value, highlight, isMoney = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: highlight ? 'var(--primary)' : (value < 0 ? '#ef4444' : 'var(--text-main)') }}>
        {isMoney ? `Gs. ${fmt(value)}` : value}
      </span>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 380, padding: '1.25rem', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Información Cálculo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem' }}><X size={20} /></button>
        </div>

        {/* Contadores de Juego */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Contadores de Juego
          </div>
          <Row label="Entrada"                       value={n(form.contEntrada)} />
          <Row label="Salida"                        value={n(form.contSalida)} />
          <Row label="Digital"                       value={n(form.contDigital)} />
          <Row label="Diferencia (juegos utilizados)" value={contDif} highlight />
          <Row label="Pre-cálculo sistema"           value={preCalc} highlight isMoney />
        </div>

        {/* Recaudación */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Recaudación
          </div>
          <Row label="Pozo"                   value={n(form.contPozo)}  isMoney />
          <Row label="Real / Conteo físico"   value={n(form.contReal)}  isMoney />
          <Row label="Diferencia"             value={contRealDif}       isMoney />
        </div>

        {/* Distribución */}
        {mntoTotal > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
              Distribución del Monto
            </div>
            <Row label={`Locatario (${Math.round(pctL * 100)}%)`}    value={Math.round(mntoTotal * pctL)} isMoney />
            <Row label={`Casa (${Math.round(pctC * 100)}%)`}          value={Math.round(mntoTotal * pctC)} isMoney />
            <Row label={`Recaudador (${Math.round(pctR * 100)}%)`}    value={Math.round(mntoTotal * pctR)} isMoney />
          </div>
        )}

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
        >
          Ok
        </button>
      </div>
    </div>
  );
}

// ─── RecordForm helpers (defined outside to avoid focus loss on re-render) ───
function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, readOnly = false, highlight = false }) {
  return (
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
}

// ─── RecordForm ──────────────────────────────────────────────────────────────
function RecordForm({ machine, stop, runId, config, onSaved, onBack }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showPreCalc, setShowPreCalc] = useState(false);
  const photoRefs = [useRef(null), useRef(null), useRef(null)];

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const n   = (v) => parseInt(v) || 0;

  const contDif     = n(form.contSalida) - n(form.contEntrada);
  const preCalc     = contDif * (config?.precioFicha ?? 500);
  const contRealDif = n(form.contReal) - n(form.contPozo);
  const mntoTotal   = n(form.mntoTotal);
  const pctL        = config?.pctLocatario ?? 0.4;
  const pctC        = config?.pctCasa ?? 0.5;
  const pctR        = config?.pctRecaudador ?? 0.1;
  const mntoLocatario  = Math.round(mntoTotal * pctL);
  const mntoCasa       = Math.round(mntoTotal * pctC);
  const mntoRecaudador = Math.round(mntoTotal * pctR);

  const required = ['contEntrada', 'contSalida', 'contDigital', 'contPozo', 'contReal', 'mntoTotal'];
  const isValid  = required.every(k => form[k] !== '');

  function setPhoto(idx, file) {
    setForm(f => {
      const photos = [...f.photos];
      photos[idx] = file;
      return { ...f, photos };
    });
  }

  async function handleSave() {
    if (!isValid) { setError('Completá todos los campos obligatorios'); return; }
    setSaving(true);
    setError('');
    try {
      const record = await createRecord({
        machine:            machine.id,
        lgrId:              machine.lgrId ?? null,
        rutId:              runId,
        preCalc,
        contEntrada:        n(form.contEntrada),
        contSalida:         n(form.contSalida),
        contDigital:        n(form.contDigital),
        contPozo:           n(form.contPozo),
        contReal:           n(form.contReal),
        contRealDif,
        contPremioEntrada:  n(form.contPremioEntrada),
        contPremioSalida:   n(form.contPremioSalida),
        contPremioStockAct: n(form.contPremioStockAct),
        contPremioStockAdd: n(form.contPremioStockAdd),
        mntoLocatario,
        mntoCasa,
        mntoRecaudador,
        mntoTotal,
        fisico:             mntoTotal,
      });

      // Upload up to 3 photos
      for (const photo of form.photos.filter(Boolean)) {
        await uploadRecordImage(record.id, photo).catch(() => null);
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

  return (
    <>
      {showPreCalc && <PreCalcModal form={form} config={config} onClose={() => setShowPreCalc(false)} />}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', padding: 0 }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
            {machine.id} — Nueva Recaudación
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {machine.type} · {machine.location} · {new Date().toLocaleDateString('es-PY')}
          </div>
        </div>

        {/* Form (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>

          <Section title="Contadores de Juego">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Field label="Cont. Entrada *" value={form.contEntrada} onChange={set('contEntrada')} />
              <Field label="Cont. Salida *"  value={form.contSalida}  onChange={set('contSalida')} />
            </div>
            <Field label="Digital *" value={form.contDigital} onChange={set('contDigital')} />
            <Field label="Juegos Utilizados (auto)" value={contDif} readOnly highlight={contDif !== 0} />
          </Section>

          <Section title="Recaudación">
            <Field label="Rec. Pozo *" value={form.contPozo} onChange={set('contPozo')} />
            <Field label="Rec. Real / Conteo físico *" value={form.contReal} onChange={set('contReal')} />
            <Field label="Rec. Real Dif. (auto)" value={contRealDif} readOnly highlight={contRealDif !== 0} />
          </Section>

          <Section title="Premios / Stock">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Field label="Premio Entrada"    value={form.contPremioEntrada}  onChange={set('contPremioEntrada')} />
              <Field label="Premio Salida"     value={form.contPremioSalida}   onChange={set('contPremioSalida')} />
              <Field label="Stock Actual"      value={form.contPremioStockAct} onChange={set('contPremioStockAct')} />
              <Field label="Stock Agregado"    value={form.contPremioStockAdd} onChange={set('contPremioStockAdd')} />
            </div>
          </Section>

          <Section title="Montos">
            {/* Pre-Calc banner */}
            <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>Pre-cálculo sistema</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Gs. {fmt(preCalc)}</span>
            </div>
            <Field label="Monto Total Retirado (Gs.) *" value={form.mntoTotal} onChange={set('mntoTotal')} />
            {/* Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
              {[['Locatario', mntoLocatario], ['Casa', mntoCasa], ['Recaudador', mntoRecaudador]].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Gs. {fmt(val)}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* 3-photo slots */}
          <Section title="Fotos Evidencia (hasta 3)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[0, 1, 2].map(idx => (
                <div key={idx}>
                  <input
                    ref={photoRefs[idx]}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => setPhoto(idx, e.target.files[0] || null)}
                  />
                  {form.photos[idx] ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(form.photos[idx])}
                        alt={`foto ${idx + 1}`}
                        onClick={() => photoRefs[idx].current.click()}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border)' }}
                      />
                      <button
                        onClick={() => setPhoto(idx, null)}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <X size={11} color="white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => photoRefs[idx].current.click()}
                      style={{ width: '100%', aspectRatio: '1', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}
                    >
                      <Camera size={18} />
                      <span style={{ fontSize: '0.6rem' }}>Imagen {idx + 1}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', color: '#b91c1c', fontSize: '0.8rem' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div style={{ padding: '0.75rem 1rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowPreCalc(true)}
            style={{ flex: 1, padding: '0.875rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Calculator size={16} /> Pre-Calc.
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            style={{
              flex: 2, padding: '0.875rem', borderRadius: 'var(--radius-md)',
              background: isValid ? 'var(--success, #10b981)' : 'var(--border)',
              color: isValid ? 'white' : 'var(--text-muted)',
              border: 'none', cursor: isValid ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            <Save size={18} /> {saving ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MantencionForm ───────────────────────────────────────────────────────────
const COMMON_ITEMS = ['Set cables', 'Tragamonedas', 'Teclado de 8', 'MQ USADAS', 'SSR', 'Fuente de poder', 'Pantalla', 'Motor'];

function MantencionForm({ machine, runId, onSaved, onBack }) {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto]             = useState('');
  const [checkedItems, setCheckedItems] = useState([]);
  const [customItem, setCustomItem]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  function toggleItem(item) {
    setCheckedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  }

  function addCustomItem() {
    const t = customItem.trim();
    if (!t) return;
    setCheckedItems(prev => prev.includes(t) ? prev : [...prev, t]);
    setCustomItem('');
  }

  async function handleSave() {
    if (!descripcion.trim() && checkedItems.length === 0) {
      setError('Agregá al menos una descripción o producto');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createMaintenance({
        machineId:   machine.id,
        runId:       runId || null,
        descripcion: descripcion.trim() || 'Mantención en ruta',
        monto:       parseFloat(monto) || 0,
        items:       checkedItems,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', padding: 0 }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>Mantención Máquina</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Máquina: {machine.id} — {machine.location} &nbsp;·&nbsp; {new Date().toLocaleDateString('es-PY')}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>

        {/* Productos de la máquina */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClipboardList size={13} /> Lista de Productos / Repuestos
          </div>
          {COMMON_ITEMS.map(item => (
            <button
              key={item}
              onClick={() => toggleItem(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                padding: '0.55rem 0.75rem', marginBottom: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${checkedItems.includes(item) ? 'rgba(79,70,229,0.5)' : 'var(--border)'}`,
                background: checkedItems.includes(item) ? 'rgba(79,70,229,0.08)' : 'var(--bg-color)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                border: `2px solid ${checkedItems.includes(item) ? 'var(--primary)' : 'var(--border)'}`,
                background: checkedItems.includes(item) ? 'var(--primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checkedItems.includes(item) && <CheckCircle size={10} color="white" />}
              </div>
              <span style={{ fontSize: '0.85rem', color: checkedItems.includes(item) ? 'var(--primary)' : 'var(--text-main)', fontWeight: checkedItems.includes(item) ? 600 : 400 }}>
                {item}
              </span>
            </button>
          ))}

          {/* Custom item */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              placeholder="Otro producto..."
              value={customItem}
              onChange={e => setCustomItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomItem()}
              style={{ flex: 1, padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
            />
            <button onClick={addCustomItem} style={{ padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79,70,229,0.4)', background: 'rgba(79,70,229,0.08)', color: 'var(--primary)', cursor: 'pointer' }}>
              <Plus size={16} />
            </button>
          </div>

          {/* Items seleccionados que no están en la lista default */}
          {checkedItems.filter(i => !COMMON_ITEMS.includes(i)).map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79,70,229,0.5)', background: 'rgba(79,70,229,0.08)' }}>
              <CheckCircle size={14} color="var(--primary)" />
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{item}</span>
              <button onClick={() => toggleItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Descripción */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            Descripción / Observaciones
          </div>
          <textarea
            rows={3}
            placeholder="Describí el trabajo realizado..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Monto */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            Monto gasto (opcional, Gs.)
          </div>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', color: '#b91c1c', fontSize: '0.8rem' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ padding: '0.75rem 1rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', background: '#f59e0b', color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Wrench size={18} /> {saving ? 'Guardando...' : 'Registrar Mantención'}
        </button>
      </div>
    </div>
  );
}

// ─── StopActionView ───────────────────────────────────────────────────────────
function StopActionView({ stop, machine, onRecaudacion, onMantencion, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', padding: 0 }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>Bienvenido</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
          {machine.id} · {machine.type} · {machine.location}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', gap: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Seleccioná la acción a realizar en esta máquina
        </div>

        <button
          onClick={onRecaudacion}
          style={{
            width: '100%', padding: '1.25rem', borderRadius: 'var(--radius-md)',
            background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '1.05rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
          }}
        >
          <Save size={22} /> Recaudación
        </button>

        <button
          onClick={onMantencion}
          style={{
            width: '100%', padding: '1.25rem', borderRadius: 'var(--radius-md)',
            background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '1.05rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
          }}
        >
          <Wrench size={22} /> Mantención
        </button>
      </div>
    </div>
  );
}

// ─── Google Maps URL helpers ─────────────────────────────────────────────────

/** Abre navegación a una sola coordenada */
function openNavToStop(coords) {
  const [lat, lng] = coords;
  // En móvil abre la app de Google Maps; en desktop abre el sitio
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
}

/** Construye URL de ruta completa con todos los stops que tienen coords.
 *  Google Maps acepta hasta 10 waypoints intermedios vía ?api=1 (sin key).
 *  Con más de 12 paradas con coords se trunca para no exceder el límite.  */
function buildFullRouteUrl(stops, machines) {
  const withCoords = stops
    .map(s => ({ stop: s, machine: machines.find(m => m.id === s.machineId) }))
    .filter(({ machine }) => machine?.coords);

  if (withCoords.length < 2) return null;

  const MAX_WAYPOINTS = 8; // origin + 8 wpts + destination = 10 total (límite GM sin API key)
  const origin      = withCoords[0].machine.coords;
  const destination = withCoords[withCoords.length - 1].machine.coords;
  const middle      = withCoords.slice(1, -1);

  // Seleccionar waypoints representativos si hay demasiados
  const step = middle.length > MAX_WAYPOINTS
    ? Math.ceil(middle.length / MAX_WAYPOINTS)
    : 1;
  const waypoints = middle
    .filter((_, i) => i % step === 0)
    .slice(0, MAX_WAYPOINTS)
    .map(({ machine }) => machine.coords.join(','))
    .join('|');

  const base = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams({
    origin:      origin.join(','),
    destination: destination.join(','),
    travelmode:  'driving',
  });
  const url = `${base}&${params}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
  return url;
}

// ─── StopList (En Ruta) ──────────────────────────────────────────────────────
function StopList({ run, machines, onAction, onSkip, onFinish }) {
  const stops           = run.stops ?? [];
  const firstPendingIdx = stops.findIndex(s => s.status === 'pending');
  const allHandled      = stops.every(s => s.status !== 'pending');
  const fullRouteUrl    = buildFullRouteUrl(stops, machines);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Ruta en curso</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {stops.filter(s => s.status === 'done').length} / {stops.length} paradas completadas
            </div>
          </div>
          {fullRouteUrl && (
            <a
              href={fullRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)',
                background: '#1a73e8', color: 'white',
                textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700,
                boxShadow: '0 2px 6px rgba(26,115,232,0.35)', flexShrink: 0,
              }}
            >
              <Map size={15} /> Google Maps
            </a>
          )}
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
            const machine  = machines.find(m => m.id === stop.machineId);
            const isNext   = i === firstPendingIdx;
            const isDone   = stop.status === 'done';
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
                  {isDone   && <CheckCircle size={18} color="#10b981" />}
                  {isFailed && <XCircle size={18} color="#ef4444" />}
                  {isNext   && <MapPin size={18} color="#4f46e5" />}
                </div>

                {isNext && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                    {/* Navegar a esta parada */}
                    {machine?.coords && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${machine.coords[0]},${machine.coords[1]}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem', borderRadius: 'var(--radius-sm)', background: '#1a73e8', color: 'white', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}
                      >
                        <Navigation size={13} /> Navegar aquí
                      </a>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => machine && onAction(stop, machine)}
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
function HomeView({ onNewRoute, activeRun, onContinueRun }) {
  const today = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Hola, Recaudador</div>

      {/* Ruta de hoy info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Ruta de Hoy</div>
        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{today}</div>
      </div>

      {activeRun ? (
        <div
          onClick={onContinueRun}
          style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', cursor: 'pointer' }}
        >
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>▶ Ruta activa — continuar</div>
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
  // view: home | map | run | stopAction | record | mantencion | history
  const [view, setView]                   = useState('home');
  const [activeRun, setActiveRun]         = useState(null);
  const [selectedStop, setSelectedStop]   = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [config, setConfig]               = useState(null);
  const [todayRecords, setTodayRecords]   = useState([]);

  // ── Back button (Android hardware — via @capacitor/app) ────────────────────
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    const BACK = {
      map: 'home', run: 'home', history: 'home',
      stopAction: 'run', record: 'stopAction', mantencion: 'stopAction',
    };

    let handle;
    CapacitorApp.addListener('backButton', () => {
      const dest = BACK[viewRef.current];
      if (dest) {
        setView(dest);
      }
      // En 'home' no hacemos nada → la app NO se cierra
    }).then(h => { handle = h; });

    return () => { handle?.remove(); };
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    getConfig().then(setConfig).catch(() => null);
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const all   = await getRecords();
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

  // "Registrar" en StopList → ir a StopActionView (elegir Recaudación o Mantención)
  function handleStopAction(stop, machine) {
    setSelectedStop(stop);
    setSelectedMachine(machine);
    setView('stopAction');
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
    setActiveRun(prev => {
      if (!prev || !selectedStop) return prev;
      const newStops = prev.stops.map(s => s.id === selectedStop.id ? { ...s, status: 'done' } : s);
      const allDone  = newStops.every(s => s.status !== 'pending');
      if (allDone) updateRouteRun(prev.id, { status: 'completed' }).catch(() => null);
      return { ...prev, stops: newStops };
    });
    await loadRecords();
    onRecordSaved?.();
    setView('run');
  }

  async function handleMantencionSaved() {
    // Mark stop as done after maintenance too
    if (activeRun && selectedStop) {
      await updateStop(activeRun.id, selectedStop.id, 'done').catch(() => null);
      setActiveRun(prev => {
        if (!prev) return prev;
        const newStops = prev.stops.map(s => s.id === selectedStop.id ? { ...s, status: 'done' } : s);
        const allDone  = newStops.every(s => s.status !== 'pending');
        if (allDone) updateRouteRun(prev.id, { status: 'completed' }).catch(() => null);
        return { ...prev, stops: newStops };
      });
    }
    setView('run');
  }

  const navItems = [
    { id: 'home', icon: Route, label: 'Ruta' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'logout', icon: LogOut, label: 'Salir' },
  ];

  // ── Map view: full-screen ────────────────────────────────────────────────
  if (view === 'map') {
    return (
      <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, zIndex: 1001 }}>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Nueva Ruta</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <MapView machines={machines} mobile={true} onRunStarted={handleRunStarted} />
        </div>
      </div>
    );
  }

  // ── StopAction, Record, Mantencion: full-screen no-nav ───────────────────
  if (view === 'stopAction' && selectedMachine) {
    return (
      <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', paddingTop: 'env(safe-area-inset-top)' }}>
        <StopActionView
          stop={selectedStop}
          machine={selectedMachine}
          onRecaudacion={() => setView('record')}
          onMantencion={() => setView('mantencion')}
          onBack={() => setView('run')}
        />
      </div>
    );
  }

  if (view === 'record' && selectedMachine) {
    return (
      <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', paddingTop: 'env(safe-area-inset-top)' }}>
        <RecordForm
          machine={selectedMachine}
          stop={selectedStop}
          runId={activeRun?.id}
          config={config}
          onSaved={handleRecordSaved}
          onBack={() => setView('stopAction')}
        />
      </div>
    );
  }

  if (view === 'mantencion' && selectedMachine) {
    return (
      <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', paddingTop: 'env(safe-area-inset-top)' }}>
        <MantencionForm
          machine={selectedMachine}
          runId={activeRun?.id}
          onSaved={handleMantencionSaved}
          onBack={() => setView('stopAction')}
        />
      </div>
    );
  }

  // ── Normal shell with top-bar + bottom-nav ───────────────────────────────
  return (
    <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Top bar — paddingTop incluye el safe-area para la barra de estado */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
            onContinueRun={() => setView('run')}
          />
        )}
        {view === 'run' && activeRun && (
          <StopList
            run={activeRun}
            machines={machines}
            onAction={handleStopAction}
            onSkip={handleSkip}
            onFinish={handleFinish}
          />
        )}
        {view === 'history' && <HistoryView records={todayRecords} />}
      </div>

      {/* Bottom nav — paddingBottom incluye el safe-area para la barra de gestos */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
    </div>
  );
}
