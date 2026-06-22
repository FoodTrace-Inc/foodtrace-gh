import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerify from './pages/OTPVerify';
import Dashboard from './pages/Dashboard';
import NewBatch from './pages/NewBatch';
import BatchDetail from './pages/BatchDetail';
import QRLabel from './pages/QRLabel';
import RecallManagement from './pages/RecallManagement';
import ScanResult from './pages/ScanResult';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<OTPVerify />} />
          <Route path="/scan/:id" element={<ScanResult />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/batches/new" element={<ProtectedRoute><NewBatch /></ProtectedRoute>} />
          <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
          <Route path="/batches/:id/label" element={<ProtectedRoute><QRLabel /></ProtectedRoute>} />
          <Route path="/recalls" element={<ProtectedRoute><RecallManagement /></ProtectedRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
