import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar from './components/common/Navbar';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import PetCatalog from './components/buyer/PetCatalog';
import PetDetail from './components/buyer/PetDetail';
import CartPage from './components/buyer/CartPage';
import RequestStatus from './components/buyer/RequestStatus';
import BuyerOrderList from './components/buyer/BuyerOrderList';
import SellerDashboard from './components/seller/SellerDashboard';
import AddPetForm from './components/seller/AddPetForm';
import OrderList from './components/seller/OrderList';
import LicenseManager from './components/seller/LicenseManager';
import ChatPage from './components/chat/ChatPage';
import ProfilePage from './components/common/ProfilePage';
import PaymentSuccess from './components/common/PaymentSuccess';
import PaymentCancel from './components/common/PaymentCancel';

const theme = createTheme({
  palette: {
    primary:   { main: '#2E7D32' },
    secondary: { main: '#FF6F00' },
    background:{ default: '#F5F5F5' },
  },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
  shape: { borderRadius: 10 },
});

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/"              element={<PetCatalog />} />
      <Route path="/login"         element={<LoginForm />} />
      <Route path="/register"      element={<RegisterForm />} />
      <Route path="/pets/:id"      element={<PetDetail />} />
      <Route path="/cart"          element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
      <Route path="/requests"      element={<ProtectedRoute><RequestStatus /></ProtectedRoute>} />
      <Route path="/orders"        element={<ProtectedRoute><BuyerOrderList /></ProtectedRoute>} />
      <Route path="/seller"        element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
      <Route path="/seller/add-pet"element={<ProtectedRoute><AddPetForm /></ProtectedRoute>} />
      <Route path="/seller/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
      <Route path="/seller/licenses" element={<ProtectedRoute><LicenseManager /></ProtectedRoute>} />
      <Route path="/chat/:requestId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel"  element={<PaymentCancel />} />
    </Routes>
  </>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router> 
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
