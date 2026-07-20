import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { runDailyAutomations } from './utils/automations';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Settings from './pages/Settings';
import Assistant from './pages/Assistant';
import UpdatePrompt from './components/UpdatePrompt';
import { requestNotificationPermission } from './utils/notifications';

// Page components mapped from previous modals/components
import AnimalList from './components/AnimalList';
import AnimalDetail from './components/AnimalDetail';
import GroupManager from './components/GroupManager';
import FeedManager from './components/FeedManager';
import HealthManagement from './pages/HealthManagement';
import ReproductionManagement from './pages/ReproductionManagement';
import RationCalculator from './pages/RationCalculator';
import CalfList from './components/CalfList';
import YieldAnalysis from './pages/YieldAnalysis';
import PedigreePage from './pages/PedigreePage';
import FinancialAnalysis from './pages/FinancialAnalysis';

// Helper component for AnimalDetail route
const AnimalDetailWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const id = new URLSearchParams(location.search).get('id');

  if (id) {
    return <AnimalDetail id={id} onBack={() => navigate('/hayvanlar')} />;
  }
  return <AnimalList onSelect={(animalId) => navigate(`/hayvanlar?id=${animalId}`)} />;
};


function App() {
  const { setUser, setSession } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Migrate old data if necessary
    import('./utils/migrateData').then(m => m.migrateOrphanDataToDefaultFarm());

    // Run daily automations
    runDailyAutomations();

    // Bildirim izni iste (kullanıcı daha önce reddetmemişse)
    if ('Notification' in window && Notification.permission === 'default') {
      // Kısa bir gecikmeyle sor — UI tamamen yüklendikten sonra
      setTimeout(() => { requestNotificationPermission(); }, 3000);
    }

    return () => subscription.unsubscribe();
  }, [setSession, setUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hayvanlar" element={<AnimalDetailWrapper />} />
            <Route path="/gruplar" element={<GroupManager />} />
            <Route path="/yem" element={<FeedManager />} />
            <Route path="/saglik" element={<HealthManagement />} />
            <Route path="/ureme" element={<ReproductionManagement />} />
            <Route path="/rasyon" element={<RationCalculator />} />
            <Route path="/buzagi" element={<CalfList />} />
            <Route path="/sut-agirlik" element={<YieldAnalysis />} />
            <Route path="/soy-agaci" element={<PedigreePage />} />
            <Route path="/finans" element={<FinancialAnalysis />} />
            <Route path="/asistan" element={<Assistant />} />
            <Route path="/ayarlar" element={<Settings />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* SW güncelleme bildirimi — her route'da görünür */}
      <UpdatePrompt />
    </BrowserRouter>
  );
}

export default App;
