import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Login from './pages/Login';
import PosTaquilla from './pages/PosTaquilla';
import PosCafeteria from './pages/PosCafeteria';
import AdminDashboard from './pages/AdminDashboard';
import ThemeToggle from './components/ThemeToggle';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/taquilla" element={<ProtectedRoute allowedRoles={['Taquilla']}><PosTaquilla /></ProtectedRoute>} />
      <Route path="/cafeteria" element={<ProtectedRoute allowedRoles={['Cafeteria']}><PosCafeteria /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppRoutes />
          <ThemeToggle />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
