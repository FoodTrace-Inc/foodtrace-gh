import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function RecallManagement() {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const fetchRecalls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recalls');
      setRecalls(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecalls(); }, []);

  const handleResolve = async (recallId) => {
    if (!window.confirm('Mark this recall as resolved? The batch status will remain "recalled".')) return;
    setResolving(recallId);
    try {
      await api.patch(`/recalls/${recallId}/resolve`);
      setRecalls((prev) =>
        prev.map((r) => r.id === recallId ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r)
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve recall');
    } finally {
      setResolving(null);
    }
  };

  const active = recalls.filter((r) => r.status === 'active');
  const resolved = recalls.filter((r) => r.status === 'resolved');

  return (
    <div>
      <Navbar />
      <div style={pg.container}>
        <div style={pg.header}>
          <h2 style={pg.title}>Recall Management</h2>
          <div style={pg.stats}>
            <span style={pg.statBadge('#fff5f5', '#c53030')}>{active.length} Active</span>
            <span style={pg.statBadge('#f0fff4', '#276749')}>{resolved.length} Resolved</span>
          </div>
        </div>

        {loading ? (
          <div style={pg.empty}>Loading recalls...</div>
        ) : recalls.length === 0 ? (
          <div style={pg.empty}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <strong>No recalls on record</strong>
            <p style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>
              Recalls can be issued from any batch detail page.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={pg.section}>
                <h3 style={{ ...pg.sectionTitle, color: '#c53030' }}>🚨 Active Recalls</h3>
                {active.map((r) => <RecallCard key={r.id} recall={r} onResolve={handleResolve} resolving={resolving} />)}
              </section>
            )}
            {resolved.length > 0 && (
              <section style={pg.section}>
                <h3 style={{ ...pg.sectionTitle, color: '#276749' }}>✅ Resolved Recalls</h3>
                {resolved.map((r) => <RecallCard key={r.id} recall={r} onResolve={handleResolve} resolving={resolving} />)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RecallCard({ recall, onResolve, resolving }) {
  const isActive = recall.status === 'active';
  return (
    <div style={{ ...pg.card, borderLeft: `4px solid ${isActive ? '#e53e3e' : '#48bb78'}` }}>
      <div style={pg.cardTop}>
        <div>
          <div style={pg.productName}>{recall.product_name}</div>
          <code style={pg.batchCode}>{recall.batch_number}</code>
        </div>
        <span style={{ ...pg.statusBadge, background: isActive ? '#fff5f5' : '#f0fff4', color: isActive ? '#c53030' : '#276749' }}>
          {isActive ? '🚨 Active' : '✅ Resolved'}
        </span>
      </div>
      <div style={pg.reason}>
        <strong>Reason:</strong> {recall.reason}
      </div>
      {recall.safe_disposal && (
        <div style={{ ...pg.reason, color: '#c05621' }}>
          <strong>Safe Disposal:</strong> {recall.safe_disposal}
        </div>
      )}
      <div style={pg.cardFooter}>
        <span style={pg.meta}>Issued: {new Date(recall.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        {recall.resolved_at && (
          <span style={pg.meta}>Resolved: {new Date(recall.resolved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        )}
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <Link to={`/batches/${recall.batch_id}`} style={pg.viewLink}>View Batch</Link>
          {isActive && (
            <button
              onClick={() => onResolve(recall.id)}
              disabled={resolving === recall.id}
              style={pg.resolveBtn}
            >
              {resolving === recall.id ? 'Resolving...' : 'Mark Resolved'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const pg = {
  container: { maxWidth: '860px', margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a202c' },
  stats: { display: 'flex', gap: '10px' },
  statBadge: (bg, color) => ({ background: bg, color, padding: '5px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 700 }),
  section: { marginBottom: '32px' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, marginBottom: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '20px 24px', marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  productName: { fontSize: '17px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' },
  batchCode: { background: '#edf2f7', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  statusBadge: { padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, flexShrink: 0 },
  reason: { fontSize: '14px', color: '#4a5568', marginBottom: '8px', lineHeight: 1.5 },
  cardFooter: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' },
  meta: { fontSize: '12px', color: '#a0aec0' },
  viewLink: { color: '#2d6a4f', textDecoration: 'none', fontSize: '13px', fontWeight: 600 },
  resolveBtn: { background: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  empty: { textAlign: 'center', padding: '60px', color: '#718096', background: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
};
