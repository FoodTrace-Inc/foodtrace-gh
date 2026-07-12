import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

export default function ScanResult() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/batches/${id}/scan`)
      .then((res) => setBatch(res.data))
      .catch(() => setError('Product not found or invalid QR code.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={pg.page}>
        <div style={pg.card}>
          <div style={pg.brand}>🌿 FoodTrace GH</div>
          <p style={{ color: '#555', textAlign: 'center' }}>Loading product information...</p>
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div style={pg.page}>
        <div style={pg.card}>
          <div style={pg.brand}>🌿 FoodTrace GH</div>
          <div style={pg.statusBox('#fff5f5', '#c53030')}>
            <span style={pg.statusIcon}>❌</span>
            <div style={pg.statusText}>Product Not Found</div>
            <div style={pg.statusSub}>This QR code is not registered in the FoodTrace system.</div>
          </div>
        </div>
      </div>
    );
  }

  const { safetyStatus } = batch;

  const statusConfig = {
    green: {
      bg: '#f0fff4',
      border: '#9ae6b4',
      color: '#276749',
      icon: '✅',
      label: 'SAFE TO CONSUME',
      sub: 'This product has passed all safety checks.',
    },
    yellow: {
      bg: '#fffaf0',
      border: '#fbd38d',
      color: '#c05621',
      icon: '⚠️',
      label: 'CAUTION — REVIEW DETAILS',
      sub: 'This product may have quality concerns. Check details below.',
    },
    red: {
      bg: '#fff5f5',
      border: '#fc8181',
      color: '#c53030',
      icon: '❌',
      label: 'RECALLED — DO NOT CONSUME',
      sub: batch.recall_reason || 'This product has been recalled.',
    },
  };

  const st = statusConfig[safetyStatus] || statusConfig.green;

  return (
    <div style={pg.page}>
      <div style={pg.card}>
        {/* Brand */}
        <div style={pg.brand}>🌿 FoodTrace GH</div>
        <div style={pg.brandSub}>Verified Product Safety Check</div>

        {/* Safety Status Banner */}
        <div style={pg.statusBox(st.bg, st.border)}>
          <span style={pg.statusIcon}>{st.icon}</span>
          <div style={{ ...pg.statusText, color: st.color }}>{st.label}</div>
          <div style={pg.statusSub}>{st.sub}</div>
        </div>

        {/* Product Info */}
        <div style={pg.section}>
          <div style={pg.productName}>{batch.product_name}</div>
          <div style={pg.manufacturer}>{batch.company_name}</div>
        </div>

        <div style={pg.divider} />

        {/* Details */}
        <div style={pg.section}>
          <Row label="Batch Number" value={<code style={pg.code}>{batch.batch_number}</code>} />
          <Row label="FDA Reg. No." value={batch.fda_reg_number} />
          <Row label="Packaged" value={batch.packaging_date?.slice(0, 10)} />
          <Row label="Expires" value={batch.expiry_date?.slice(0, 10)} />
          <Row
            label="Quality Check"
            value={
              batch.quality_check_passed
                ? <span style={{ color: '#276749', fontWeight: 700 }}>✅ Passed</span>
                : <span style={{ color: '#c53030', fontWeight: 700 }}>❌ Failed</span>
            }
          />
        </div>

        <div style={pg.divider} />

        {/* Ingredients */}
        {batch.raw_ingredients?.length > 0 && (
          <div style={pg.section}>
            <div style={pg.sectionTitle}>Ingredients</div>
            {batch.raw_ingredients.map((ing, i) => (
              <div key={i} style={pg.ingredient}>
                • {ing.name}{ing.supplier ? ` — ${ing.supplier}` : ''}
              </div>
            ))}
          </div>
        )}

        {/* Recall info */}
        {safetyStatus === 'red' && batch.safe_disposal && (
          <>
            <div style={pg.divider} />
            <div style={{ ...pg.section, background: '#fff5f5', borderRadius: '8px', padding: '14px' }}>
              <div style={{ ...pg.sectionTitle, color: '#c53030' }}>Safe Disposal Instructions</div>
              <p style={{ color: '#c53030', fontSize: '14px', margin: 0 }}>{batch.safe_disposal}</p>
            </div>
          </>
        )}

        <div style={pg.footer}>
          Scan It. Trace It. Trust It. &nbsp;|&nbsp; foodtrace.gh
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: '13px', color: '#888', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#111', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const pg = {
  page: { minHeight: '100vh', background: '#f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 16px' },
  card: { background: '#ffffff', borderRadius: '14px', padding: '28px 24px', width: '100%', maxWidth: '460px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', color: '#111' },
  brand: { textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#2d6a4f', marginBottom: '2px' },
  brandSub: { textAlign: 'center', fontSize: '12px', color: '#aaa', marginBottom: '20px' },
  statusBox: (bg, border) => ({ background: bg, border: `2px solid ${border}`, borderRadius: '10px', padding: '18px', textAlign: 'center', marginBottom: '20px' }),
  statusIcon: { fontSize: '36px', display: 'block', marginBottom: '8px' },
  statusText: { fontSize: '18px', fontWeight: 800, letterSpacing: '0.02em', marginBottom: '6px' },
  statusSub: { fontSize: '13px', color: '#555', lineHeight: 1.5 },
  section: { marginBottom: '16px' },
  productName: { fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '4px' },
  manufacturer: { fontSize: '13px', color: '#888' },
  divider: { height: '1px', background: '#f0f0f0', margin: '16px 0' },
  sectionTitle: { fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' },
  ingredient: { fontSize: '14px', color: '#333', padding: '4px 0' },
  code: { background: '#f5f5f5', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px', color: '#111' },
  footer: { textAlign: 'center', fontSize: '11px', color: '#bbb', marginTop: '24px' },
};
