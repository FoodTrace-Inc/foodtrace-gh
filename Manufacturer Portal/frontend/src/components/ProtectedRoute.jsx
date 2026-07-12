import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { manufacturer, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!manufacturer) return <Navigate to="/login" replace />;
  return children;
}

const styles = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#718096' },
};
