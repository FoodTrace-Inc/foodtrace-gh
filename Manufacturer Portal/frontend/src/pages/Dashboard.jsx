import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const STATUS_COLORS = {
  active: { bg: '#f0fff4', color: '#276749', label: '✅ Active' },
  recalled: { bg: '#fff5f5', color: '#c53030', label: '🚨 Recalled' },
  under_investigation: { bg: '#fffaf0', color: '#c05621', label: '⚠️ Under Investigation' },
  invalidated: { bg: '#e2e8f0', color: '#4a5568', label: '❌ Invalidated' },
};

export default function Dashboard() {
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filter) params.set('status', filter);
      const res = await api.get(`/batches?${params}`);
      setBatches(res.data.batches);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [filter, page]);

  const recalls = batches.filter((b) => b.status === 'recalled').length;
  const active = batches.filter((b) => b.status === 'active').length;

  return (
    <div>
      <Navbar />
      <div style={pg.container}>
        {/* Summary cards */}
        <div style={pg.cardRow}>
          <div style={pg.card}><div style={pg.cardNum}>{total}</div><div style={pg.cardLabel}>Total Batches</div></div>
          <div style={{ ...pg.card, borderTop: '4px solid #48bb78' }}><div style={pg.cardNum}>{active}</div><div style={pg.cardLabel}>Active</div></div>
          <div style={{ ...pg.card, borderTop: '4px solid #e53e3e' }}><div style={pg.cardNum}>{recalls}</div><div style={pg.cardLabel}>Recalled</div></div>
        </div>

        {/* Header row */}
        <div style={pg.header}>
          <h2 style={pg.heading}>Batch Records</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select style={pg.select} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="recalled">Recalled</option>
              <option value="under_investigation">Under Investigation</option>
            </select>
            <Link to="/batches/new" style={pg.newBtn}>+ New Batch</Link>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={pg.empty}>Loading batches...</div>
        ) : batches.length === 0 ? (
          <div style={pg.empty}>No batches found. <Link to="/batches/new" style={{ color: '#2d6a4f' }}>Log your first batch.</Link></div>
        ) : (
          <div style={pg.tableWrap}>
            <table style={pg.table}>
              <thead>
                <tr style={pg.thead}>
                  {['Product', 'Batch No.', 'Packaging Date', 'Expiry Date', 'QC', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={pg.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const st = STATUS_COLORS[b.status] || STATUS_COLORS.active;
                  return (
                    <tr key={b.id} style={pg.tr}>
                      <td style={pg.td}><strong>{b.product_name}</strong></td>
                      <td style={pg.td}><code style={pg.code}>{b.batch_number}</code></td>
                      <td style={pg.td}>{b.packaging_date?.slice(0, 10)}</td>
                      <td style={pg.td}>{b.expiry_date?.slice(0, 10)}</td>
                      <td style={pg.td}>{b.quality_check_passed ? '✅ Pass' : '❌ Fail'}</td>
                      <td style={pg.td}><span style={{ ...pg.badge, background: st.bg, color: st.color }}>{st.label}</span></td>
                      <td style={pg.td}>
                        <Link to={`/batches/${b.id}`} style={pg.actionLink}>View</Link>
                        {b.status === 'active' && (
                          <Link to={`/batches/${b.id}?recall=1`} style={{ ...pg.actionLink, color: '#e53e3e' }}>Recall</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div style={pg.pagination}>
            <button style={pg.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ color: '#718096', fontSize: '14px' }}>Page {page} of {Math.ceil(total / 15)}</span>
            <button style={pg.pageBtn} disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

const pg = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  cardRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' },
  card: { background: '#fff', borderRadius: '10px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderTop: '4px solid #e2e8f0' },
  cardNum: { fontSize: '32px', fontWeight: 700, color: '#1a202c' },
  cardLabel: { fontSize: '13px', color: '#718096', marginTop: '4px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  heading: { fontSize: '20px', fontWeight: 700, color: '#1a202c' },
  select: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '14px', cursor: 'pointer' },
  newBtn: { background: '#2d6a4f', color: '#fff', padding: '9px 18px', borderRadius: '7px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 },
  tableWrap: { background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f7fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '13px 16px', fontSize: '14px', color: '#1a202c' },
  badge: { padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 },
  code: { background: '#edf2f7', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  actionLink: { color: '#2d6a4f', textDecoration: 'none', marginRight: '12px', fontSize: '13px', fontWeight: 600 },
  empty: { textAlign: 'center', padding: '60px', color: '#718096', background: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' },
  pageBtn: { padding: '7px 16px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#fff', cursor: 'pointer', fontSize: '13px' },
};
