import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, Users, Layers, Wheat, Activity, Network, Calculator,
  Syringe, CalendarDays, Settings, Sparkles, Wifi, WifiOff, RefreshCw,
  Droplets, Wallet
} from 'lucide-react';
import { processSyncQueue, pullInitialData } from '../services/syncService';

const NAV_ITEMS = [
  { path: '/', label: 'Ana Sayfa', icon: <Home className="w-[22px] h-[22px]" /> },
  { path: '/hayvanlar', label: 'Hayvan Listesi', icon: <Users className="w-[22px] h-[22px]" /> },
  { path: '/gruplar', label: 'Grup Yönetimi', icon: <Layers className="w-[22px] h-[22px]" /> },
  { path: '/yem', label: 'Yem Deposu', icon: <Wheat className="w-[22px] h-[22px]" /> },
  { path: '/saglik', label: 'Sağlık Yönetimi', icon: <Syringe className="w-[22px] h-[22px]" /> },
  { path: '/ureme', label: 'Üreme Yönetimi', icon: <CalendarDays className="w-[22px] h-[22px]" /> },
  { path: '/buzagi', label: 'Buzağı Büyütme', icon: <Droplets className="w-[22px] h-[22px]" /> },
  { path: '/soy-agaci', label: 'Soy Ağacı', icon: <Network className="w-[22px] h-[22px]" /> },
  { path: '/sut-agirlik', label: 'Süt & Ağırlık Özet', icon: <Activity className="w-[22px] h-[22px]" /> },
  { path: '/rasyon', label: 'Rasyon Hesaplama', icon: <Calculator className="w-[22px] h-[22px]" /> },
  { path: '/finans', label: 'Gelir Gider Analizi', icon: <Wallet className="w-[22px] h-[22px]" /> },
  { path: '/asistan', label: 'AI Asistan', icon: <Sparkles className="w-[22px] h-[22px]" /> },
  { path: '/ayarlar', label: 'Ayarlar', icon: <Settings className="w-[22px] h-[22px]" /> },
];

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      processSyncQueue().finally(() => setIsSyncing(false));
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sayfa ilk açıldığında online ise bekleyen verileri gönder ve buluttan en güncel verileri çek
    if (navigator.onLine) {
      setIsSyncing(true);
      processSyncQueue()
        .then(() => pullInitialData())
        .finally(() => setIsSyncing(false));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mobil menüyü kapat (route değiştiğinde)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);


  const NavContent = () => (
    <nav className="flex-1 px-3 py-1 flex flex-col justify-center gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            flex items-center space-x-3 px-4 py-2 rounded-xl text-[14.5px] font-bold transition
            ${isActive 
              ? 'bg-nature-600 text-white shadow-md' 
              : 'text-earth-600 hover:bg-nature-50 hover:text-nature-700'
            }
          `}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="h-screen bg-earth-50 flex font-sans overflow-hidden">
      
      {/* Masaüstü Sidebar (≥768px) */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white border-r border-earth-200 flex-col shadow-sm relative z-20 h-full overflow-hidden">
        <div className="p-4 border-b border-earth-100 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-nature-800 tracking-tight">Sürü<span className="text-earth-500">Metri</span></h1>
          </div>
        </div>
        <NavContent />
        <div className="p-4 border-t border-earth-100 shrink-0">
          <div className="flex items-center justify-center space-x-2 text-xs font-bold px-3 py-2.5 bg-earth-50 rounded-lg text-earth-600">
            {isSyncing ? (
              <><RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> <span>Senkronize ediliyor...</span></>
            ) : isOnline ? (
              <><Wifi className="w-3 h-3 text-green-500" /> <span>Çevrimiçi (Senkronize)</span></>
            ) : (
              <><WifiOff className="w-3 h-3 text-red-500" /> <span>Çevrimdışı (Yerel)</span></>
            )}
          </div>
        </div>
      </aside>

      {/* Mobil Navbar & Hamburger (<768px) */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-nature-700 text-white shadow-md z-30 h-16 flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-nature-600 transition">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black">Sürü<span className="text-nature-300">Metri</span></h1>
        </div>
        <div>
          {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin text-blue-300" /> : isOnline ? <Wifi className="w-5 h-5 text-green-300" /> : <WifiOff className="w-5 h-5 text-red-300" />}
        </div>
      </header>

      {/* Mobil Menü (Drawer) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-earth-900/60 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-earth-100 flex items-center justify-between shrink-0">
              <h1 className="text-xl font-black text-nature-800">Menü</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-earth-500 hover:bg-earth-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 relative min-w-0 md:pt-0 pt-16 h-full overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default Layout;
