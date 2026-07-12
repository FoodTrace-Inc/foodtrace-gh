import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { s } from './styles';

const emptyIngredient = () => ({ name: '', supplier: '', foodtrace_farmer_id: '' });

export default function NewBatch() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    batch_number: '',
    product_name: '',
    quality_check_passed: '',
    quality_check_notes: '',
    packaging_date: '',
    expiry_date: '',
  });
  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [steps, setSteps] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  // Ingredients
  const setIngredient = (i, f) => (e) => {
    const updated = [...ingredients];
    updated[i][f] = e.target.value;
    setIngredients(updated);
  };
  const addIngredient = () => setIngredients([...ingredients, emptyIngredient()]);
  const removeIngredient = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i));

  // Processing steps
  const setStep = (i) => (e) => {
    const updated = [...steps];
    updated[i] = e.target.value;
    setSteps(updated);
  };
  const addStep = () => setSteps([...steps, '']);
  const removeStep = (i) => setSteps(steps.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    const filledIngredients = ingredients.filter((ing) => ing.name.trim());
    const filledSteps = steps.filter((s) => s.trim());
    if (filledIngredients.length === 0) return setError('Add at least one raw ingredient');
    if (filledSteps.length === 0) return setError('Add at least one processing step');
    if (!form.quality_check_passed) return setError('Select a quality check result');

    setLoading(true);
    try {
      const res = await api.post('/batches', {
        ...form,
        quality_check_passed: form.quality_check_passed === 'true',
        raw_ingredients: filledIngredients,
        processing_steps: filledSteps,
      });
      navigate(`/batches/${res.data.batch.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div style={pg.container}>
        <div style={pg.header}>
          <button onClick={() => navigate('/dashboard')} style={pg.back}>← Back</button>
          <h2 style={pg.title}>Log New Batch</h2>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={pg.section}>
            <h3 style={pg.sectionTitle}>Basic Information</h3>
            <div style={pg.grid2}>
              <div>
                <label style={s.label}>Product Name *</label>
                <input style={s.input} value={form.product_name} onChange={setField('product_name')} required placeholder="e.g. Tomato Paste 500g" />
              </div>
              <div>
                <label style={s.label}>Batch Number *</label>
                <input style={s.input} value={form.batch_number} onChange={setField('batch_number')} required placeholder="e.g. TP-2026-001" />
              </div>
              <div>
                <label style={s.label}>Packaging Date *</label>
                <input style={s.input} type="date" value={form.packaging_date} onChange={setField('packaging_date')} required />
              </div>
              <div>
                <label style={s.label}>Expiry Date *</label>
                <input style={s.input} type="date" value={form.expiry_date} onChange={setField('expiry_date')} required />
              </div>
            </div>
          </div>

          {/* Raw Ingredients */}
          <div style={pg.section}>
            <h3 style={pg.sectionTitle}>Raw Ingredients *</h3>
            {ingredients.map((ing, i) => (
              <div key={i} style={pg.ingredientRow}>
                <div style={{ flex: 2 }}>
                  {i === 0 && <label style={s.label}>Ingredient Name</label>}
                  <input style={s.input} value={ing.name} onChange={setIngredient(i, 'name')} placeholder="e.g. Fresh Tomatoes" required />
                </div>
                <div style={{ flex: 2 }}>
                  {i === 0 && <label style={s.label}>Supplier / Farm</label>}
                  <input style={s.input} value={ing.supplier} onChange={setIngredient(i, 'supplier')} placeholder="e.g. Afram Plains Cooperative" />
                </div>
                <div style={{ flex: 1.5 }}>
                  {i === 0 && <label style={s.label}>FoodTrace Farmer ID</label>}
                  <input style={s.input} value={ing.foodtrace_farmer_id} onChange={setIngredient(i, 'foodtrace_farmer_id')} placeholder="Optional" />
                </div>
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => removeIngredient(i)} style={pg.removeBtn}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addIngredient} style={pg.addBtn}>+ Add Ingredient</button>
          </div>

          {/* Processing Steps */}
          <div style={pg.section}>
            <h3 style={pg.sectionTitle}>Processing Steps *</h3>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={pg.stepNum}>{i + 1}</span>
                <input style={{ ...s.input, flex: 1 }} value={step} onChange={setStep(i)} placeholder={`Step ${i + 1} (e.g. Washing and sorting)`} required />
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} style={pg.removeBtn}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} style={pg.addBtn}>+ Add Step</button>
          </div>

          {/* Quality Check */}
          <div style={pg.section}>
            <h3 style={pg.sectionTitle}>Quality Check *</h3>
            <label style={s.label}>Overall Result</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              {[['true', '✅ Pass', '#f0fff4', '#276749'], ['false', '❌ Fail', '#fff5f5', '#c53030']].map(([val, label, bg, color]) => (
                <label key={val} style={{ ...pg.radioLabel, background: form.quality_check_passed === val ? bg : '#fff', borderColor: form.quality_check_passed === val ? color : '#e2e8f0', color: form.quality_check_passed === val ? color : '#4a5568' }}>
                  <input type="radio" name="qc" value={val} checked={form.quality_check_passed === val} onChange={setField('quality_check_passed')} style={{ marginRight: '8px' }} />
                  {label}
                </label>
              ))}
            </div>
            <label style={{ ...s.label, marginTop: '14px' }}>Quality Check Notes</label>
            <textarea style={{ ...s.input, height: '72px', resize: 'vertical' }} value={form.quality_check_notes} onChange={setField('quality_check_notes')} placeholder="Any notes about the quality check..." />
          </div>

          <button type="submit" style={{ ...s.btn, maxWidth: '320px' }} disabled={loading}>
            {loading ? 'Saving batch & generating QR...' : '✅ Submit Batch & Generate QR Code'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pg = {
  container: { maxWidth: '860px', margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
  back: { background: 'none', border: 'none', color: '#2d6a4f', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a202c' },
  section: { background: '#fff', borderRadius: '10px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#1a202c', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  ingredientRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' },
  removeBtn: { background: '#fff5f5', border: '1px solid #fed7d7', color: '#e53e3e', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', marginTop: '24px', fontSize: '13px' },
  addBtn: { background: 'none', border: '1px dashed #2d6a4f', color: '#2d6a4f', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', marginTop: '6px', fontWeight: 600 },
  stepNum: { display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '28px', height: '28px', background: '#2d6a4f', color: '#fff', borderRadius: '50%', fontSize: '13px', fontWeight: 700, marginTop: '10px' },
  radioLabel: { display: 'flex', alignItems: 'center', padding: '10px 18px', border: '2px solid', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
};
