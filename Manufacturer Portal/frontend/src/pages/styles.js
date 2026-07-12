// Shared styles for auth + form pages

export const s = {
  logo: { fontSize: '22px', fontWeight: 700, color: '#2d6a4f', marginBottom: '8px', textAlign: 'center' },
  title: { fontSize: '20px', fontWeight: 600, color: '#1a202c', marginBottom: '24px', textAlign: 'center' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '5px', marginTop: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '14px', color: '#1a202c', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', marginTop: '22px', padding: '12px', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { background: 'transparent', border: '1px solid #2d6a4f', color: '#2d6a4f', padding: '10px 20px', borderRadius: '7px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 },
  error: { background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' },
  success: { background: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' },
  footer: { textAlign: 'center', fontSize: '13px', color: '#718096', marginTop: '20px' },
  link: { color: '#2d6a4f', fontWeight: 600, textDecoration: 'none' },
};

export function FormCard({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {children}
      </div>
    </div>
  );
}
