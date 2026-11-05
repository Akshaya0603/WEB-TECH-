import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Cart from './pages/Cart.jsx';
import Payment from './pages/Payment.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Orders from './pages/Orders.jsx';
import BuyAgain from './pages/BuyAgain.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';

function Protected({ children }) {
  const { user } = useApp();
  return user ? children : <Navigate to="/login" replace />;
}

// UI guard only - the server's requireAdmin is what actually protects the admin routes
function AdminOnly({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useApp();
  return (
    <>
      {user && <Navbar />}
      <main className="container">
        <Routes>
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/cart" element={<Protected><Cart /></Protected>} />
          <Route path="/payment" element={<Protected><Payment /></Protected>} />
          <Route path="/wishlist" element={<Protected><Wishlist /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/buy-again" element={<Protected><BuyAgain /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
