import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Marketplace from './pages/Marketplace';
import Sell from './pages/Sell';
import AdminConfig from './pages/AdminConfig';
import OTPVerify from './pages/OTPVerify';
import VerifyIdentity from './pages/VerifyIdentity';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import MyListings from './pages/MyListings';
import Chat from './pages/Chat';
import Conversations from './pages/Conversations';
import KYCUpload from './pages/KYCUpload';
import AdminPanel from './pages/AdminPanel';
import BottomNav from './components/BottomNav';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Marketplace is now the home page - accessible without login */}
          <Route path="/" element={<Marketplace />} />
          <Route path="/market" element={<Marketplace />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<OTPVerify />} />
          <Route path="/verify-identity" element={<VerifyIdentity />} />
          <Route path="/kyc" element={<KYCUpload />} />

          {/* Protected routes */}
          <Route path="/sell" element={<Sell />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/admin" element={<AdminConfig />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/chat/:partnerId" element={<Chat />} />
          <Route path="/gestao-privada" element={<AdminPanel />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
