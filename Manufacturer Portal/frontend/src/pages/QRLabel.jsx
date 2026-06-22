import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';

export default function QRLabel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/batches/${id}`)
      .then((res) => setBatch(res.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !batch) return <div style={{ textAlign: 'center', padding: '60px', color: '#718096' }}>Loading label...</div>;

  const scanUrl = batch.qr_code_data;

  return (
    <div>
      {/* Screen controls (hidden on print) */}
      <div className="no-print" style={pg.controls}>
        <button onClick={() => navigate(`/batches/${id}`)} style={pg.backBtn}>← Back</button>
        <button onClick={() => window.print()} style={pg.printBtn}>🖨 Print Label</button>
      </div>

      {/* Printable label */}
      <div style={pg.page}>
        <div style={pg.label}>
          <div style={pg.top}>
            <div style={pg.brandArea}>
              <span style={pg.brandIcon}>🌿</span>
              <div>
                <div style={pg.brandName}>FoodTrace GH</div>
                <div style={pg.brandSub}>Verified Batch Record</div>
              </div>
            </div>
            <div style={pg.fdaBadge}>
              FDA Reg: {batch.fda_reg_number}
            </div>
          </div>

          <div style={pg.body}>
            <div style={pg.info}>
              <div style={pg.productName}>{batch.product_name}</div>
              <div style={pg.batchRow}>
                <span style={pg.batchLabel}>Batch No.</span>
                <span style={pg.batchVal}>{batch.batch_number}</span>
              </div>
              <div style={pg.batchRow}>
                <span style={pg.batchLabel}>Packaged</span>
                <span style={pg.batchVal}>{batch.packaging_date?.slice(0, 10)}</span>
              </div>
              <div style={pg.batchRow}>
                <span style={pg.batchLabel}>Expires</span>
                <span style={pg.batchVal}>{batch.expiry_date?.slice(0, 10)}</span>
              </div>
              <div style={pg.batchRow}>
                <span style={pg.batchLabel}>Manufacturer</span>
                <span style={pg.batchVal}>{batch.company_name}</span>
              </div>
              <div style={pg.batchRow}>
                <span style={pg.batchLabel}>Quality Check</span>
                <span style={{ ...pg.batchVal, color: batch.quality_check_passed ? '#276749' : '#c53030', fontWeight: 700 }}>
                  {batch.quality_check_passed ? 'PASSED ✓' : 'FAILED ✗'}
                </span>
              </div>
            </div>

            <div style={pg.qrArea}>
              <div style={pg.qrBox}>
                {scanUrl && <QRCodeSVG value={scanUrl} size={140} level="H" includeMargin={false} />}
              </div>
              <div style={pg.scanText}>Scan to verify</div>
              <div style={pg.scanSub}>Powered by FoodTrace GH</div>
            </div>
          </div>

          <div style={pg.footer}>
            <div style={pg.footerLeft}>Scan It. Trace It. Trust It.</div>
            <div style={pg.footerRight}>foodtrace.gh</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
        }
      `}</style>
    </div>
  );
}

const pg = {
  controls: { display: 'flex', gap: '12px', padding: '16px 24px', background: '#f5f7fa', borderBottom: '1px solid #e2e8f0' },
  backBtn: { background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  printBtn: { background: '#2d6a4f', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  page: { display: 'flex', justifyContent: 'center', padding: '40px 24px', background: '#e8edf2', minHeight: 'calc(100vh - 57px)' },
  label: { width: '420px', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' },
  top: { background: '#1a3a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brandArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  brandIcon: { fontSize: '24px' },
  brandName: { color: '#68d391', fontWeight: 700, fontSize: '16px' },
  brandSub: { color: '#a0aec0', fontSize: '11px' },
  fdaBadge: { background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '11px', padding: '4px 10px', borderRadius: '20px' },
  body: { display: 'flex', padding: '20px', gap: '20px' },
  info: { flex: 1 },
  productName: { fontSize: '18px', fontWeight: 700, color: '#1a202c', marginBottom: '14px' },
  batchRow: { display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'baseline' },
  batchLabel: { fontSize: '11px', color: '#a0aec0', width: '90px', flexShrink: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  batchVal: { fontSize: '13px', color: '#2d3748', fontWeight: 500 },
  qrArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  qrBox: { padding: '10px', border: '2px solid #1a3a2a', borderRadius: '8px' },
  scanText: { fontSize: '12px', fontWeight: 700, color: '#1a3a2a' },
  scanSub: { fontSize: '10px', color: '#a0aec0' },
  footer: { background: '#f7fafc', borderTop: '1px solid #e2e8f0', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { fontSize: '11px', color: '#718096', fontStyle: 'italic' },
  footerRight: { fontSize: '11px', color: '#2d6a4f', fontWeight: 700 },
};
