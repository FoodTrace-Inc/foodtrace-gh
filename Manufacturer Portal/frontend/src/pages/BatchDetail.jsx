import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { s } from './styles';

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openRecall = searchParams.get('recall') === '1';

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recall form
  const [showRecallForm, setShowRecallForm] = useState(openRecall);
  const [recallReason, setRecallReason] = useState('');
  const [safeDisposal, setSafeDisposal] = useState('');
  const [recalling, setRecalling] = useState(false);
  const [recallError, setRecallError] = useState('');

  useEffect(() => {
    api.get(`/batches/${id}`)
      .then((res) => setBatch(res.data))
      .catch(() => setError('Batch not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecall = async (e) => {
    e.preventDefault();
    if (!recallReason.trim()) return setRecallError('Please provide a recall reason');
    setRecalling(true); setRecallError('');
    try {
      await api.post('/recalls', { batch_id: id, reason: recallReason, safe_disposal: safeDisposal });
      setBatch((b) => ({ ...b, status: 'recalled', recall_reason: recallReason }));
      setShowRecallForm(false);
    } catch (err) {
      setRecallError(err.response?.data?.error || 'Failed to issue recall');
    } finally {
      setRecalling(false);
    }
  };

  if (loading) return <div><Navbar /><div style={pg.center}>Loading...</div></div>;
  if (error || !batch) return <div><Navbar /><div style={pg.center}>{error || 'Batch not found'}</div></div>;

  const scanUrl = batch.qr_code_data;
  const isRecalled = batch.status === 'recalled';

  return (
    <div>
      <Navbar />
      <div style={pg.container}>
        <div style={pg.header}>
          <button onClick={() => navigate('/dashboard')} style={pg.back}>← Back to Dashboard</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isRecalled && (
              <button onClick={() => setShowRecallForm(true)} style={pg.recallBtn}>🚨 Issue Recall</button>
            )}
            <Link to={`/batches/${id}/label`} style={pg.printBtn}>🖨 Print QR Label</Link>
          </div>
        </div>

        {/* Recalled banner */}
        {isRecalled && (
          <div style={pg.recalledBanner}>
            🚨 <strong>RECALLED</strong> — {batch.recall_reason}
          </div>
        )}

        <div style={pg.grid}>
          {/* Left: details */}
          <div>
            <div style={pg.card}>
              <h2 style={pg.productName}>{batch.product_name}</h2>
              <code style={pg.batchNum}>{batch.batch_number}</code>
              <div style={pg.rows}>
                <Row label="Manufacturer" value={batch.company_name} />
                <Row label="FDA Reg. No." value={batch.fda_reg_number} />
                <Row label="Packaging Date" value={batch.packaging_date?.slice(0, 10)} />
                <Row label="Expiry Date" value={batch.expiry_date?.slice(0, 10)} />
                <Row label="Quality Check" value={batch.quality_check_passed ? '✅ Passed' : '❌ Failed'} />
                {batch.quality_check_notes && <Row label="QC Notes" value={batch.quality_check_notes} />}
              </div>
            </div>

            {/* Ingredients */}
            <div style={pg.card}>
              <h3 style={pg.sectionTitle}>Raw Ingredients</h3>
              {(batch.raw_ingredients || []).map((ing, i) => (
                <div key={i} style={pg.ingredient}>
                  <strong>{ing.name}</strong>
                  {ing.supplier && <span style={{ color: '#718096', marginLeft: '8px' }}>from {ing.supplier}</span>}
                  {ing.foodtrace_farmer_id && <code style={pg.code}>ID: {ing.foodtrace_farmer_id}</code>}
                </div>
              ))}
            </div>

            {/* Processing steps */}
            <div style={pg.card}>
              <h3 style={pg.sectionTitle}>Processing Steps</h3>
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                {(batch.processing_steps || []).map((step, i) => (
                  <li key={i} style={{ marginBottom: '8px', fontSize: '14px', color: '#4a5568' }}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: QR code */}
          <div>
            <div style={{ ...pg.card, textAlign: 'center' }}>
              <h3 style={pg.sectionTitle}>QR Code</h3>
              {scanUrl ? (
                <>
                  <div style={pg.qrWrap}>
                    <QRCodeSVG value={scanUrl} size={200} level="H" includeMargin />
                  </div>
                  <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '12px', wordBreak: 'break-all' }}>{scanUrl}</p>
                  <Link to={`/batches/${id}/label`} style={{ ...s.btn, display: 'inline-block', marginTop: '16px', textDecoration: 'none', width: 'auto', padding: '10px 20px' }}>
                    Print Label
                  </Link>
                </>
              ) : (
                <p style={{ color: '#718096' }}>QR code not yet generated</p>
              )}
            </div>
          </div>
        </div>

        {/* Recall Form Modal */}
        {showRecallForm && (
          <div style={pg.overlay}>
            <div style={pg.modal}>
              <h3 style={{ color: '#c53030', marginBottom: '16px' }}>🚨 Issue Product Recall</h3>
              <p style={{ color: '#4a5568', fontSize: '14px', marginBottom: '20px' }}>
                This will immediately mark all QR code scans for <strong>{batch.product_name}</strong> (Batch {batch.batch_number}) as <strong>RECALLED</strong> and notify all consumers who scanned it.
              </p>
              {recallError && <div style={s.error}>{recallError}</div>}
              <form onSubmit={handleRecall}>
                <label style={s.label}>Recall Reason *</label>
                <textarea style={{ ...s.input, height: '80px' }} value={recallReason} onChange={(e) => setRecallReason(e.target.value)} placeholder="e.g. Contamination detected during routine testing..." required />
                <label style={s.label}>Safe Disposal Instructions</label>
                <textarea style={{ ...s.input, height: '60px' }} value={safeDisposal} onChange={(e) => setSafeDisposal(e.target.value)} placeholder="e.g. Do not consume. Return to point of purchase or dispose in household waste." />
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" style={{ ...s.btn, background: '#e53e3e', flex: 1 }} disabled={recalling}>
                    {recalling ? 'Issuing recall...' : 'Confirm Recall'}
                  </button>
                  <button type="button" onClick={() => setShowRecallForm(false)} style={{ ...s.btnSecondary, flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
      <span style={{ width: '150px', fontSize: '13px', fontWeight: 600, color: '#718096', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#1a202c' }}>{value}</span>
    </div>
  );
}

const pg = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' },
  center: { textAlign: 'center', padding: '60px', color: '#718096' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  back: { background: 'none', border: 'none', color: '#2d6a4f', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  recallBtn: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  printBtn: { background: '#2d6a4f', color: '#fff', padding: '8px 16px', borderRadius: '7px', textDecoration: 'none', fontWeight: 600, fontSize: '13px' },
  recalledBanner: { background: '#fff5f5', border: '2px solid #e53e3e', color: '#c53030', padding: '14px 20px', borderRadius: '8px', marginBottom: '20px', fontSize: '15px' },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  card: { background: '#fff', borderRadius: '10px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  productName: { fontSize: '22px', fontWeight: 700, color: '#1a202c', marginBottom: '6px' },
  batchNum: { background: '#edf2f7', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontFamily: 'monospace', display: 'inline-block', marginBottom: '20px' },
  rows: {},
  sectionTitle: { fontSize: '15px', fontWeight: 700, color: '#1a202c', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' },
  ingredient: { padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' },
  code: { background: '#edf2f7', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  qrWrap: { display: 'inline-block', padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
};
