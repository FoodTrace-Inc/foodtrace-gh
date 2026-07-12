import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { manufacturer, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <span style={styles.logo}>🌿</span>
        <span style={styles.brandName}>FoodTrace GH</span>
        <span style={styles.portalLabel}>Manufacturer Portal</span>
      </div>
      <div style={styles.links}>
        <Link to="/dashboard" style={{ ...styles.link, ...(isActive('/dashboard') ? styles.activeLink : {}) }}>
          Dashboard
        </Link>
        <Link to="/batches/new" style={{ ...styles.link, ...(isActive('/batches/new') ? styles.activeLink : {}) }}>
          + New Batch
        </Link>
        <Link to="/recalls" style={{ ...styles.link, ...(isActive('/recalls') ? styles.activeLink : {}) }}>
          Recalls
        </Link>
      </div>
      <div style={styles.user}>
        <span style={styles.companyName}>{manufacturer?.company_name}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '60px', background: '#1a3a2a', color: '#fff', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  brand: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: { fontSize: '22px' },
  brandName: { fontWeight: 700, fontSize: '18px', color: '#68d391' },
  portalLabel: { fontSize: '12px', color: '#a0aec0', borderLeft: '1px solid #4a5568', paddingLeft: '8px', marginLeft: '4px' },
  links: { display: 'flex', gap: '4px' },
  link: { color: '#a0aec0', textDecoration: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '14px', transition: 'all 0.2s' },
  activeLink: { color: '#fff', background: 'rgba(104,211,145,0.2)' },
  user: { display: 'flex', alignItems: 'center', gap: '12px' },
  companyName: { fontSize: '13px', color: '#a0aec0', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn: { background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
};
