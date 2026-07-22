import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, Users, Layers, Wheat, Activity, Network, Calculator,
  Syringe, CalendarDays, Settings, Sparkles, Wifi, WifiOff, RefreshCw,
  Droplets, Wallet, User, Sun, Moon
} from 'lucide-react';
import { processSyncQueue, pullInitialData, subscribeToRealtimeChanges } from '../services/syncService';
import { useStore } from '../store/useStore';

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
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const { isGuest, theme, setTheme } = useStore();
  
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

    let realtimeChannel: Awaited<ReturnType<typeof subscribeToRealtimeChanges>> = null;

    if (navigator.onLine) {
      setIsSyncing(true);
      processSyncQueue()
        .then(async () => {
           // Her zaman buluttan veri çek (syncQueue dolu olsa bile)
           // syncQueue itemları hata verip takılı kalsa veri hiç çekilmez
           await pullInitialData();
           // pullInitialData sonrası activeCiftlikId doğru set edildiyse migrasyon doğru çalışır
           const { migrateOrphanDataToDefaultFarm } = await import('../utils/migrateData');
           await migrateOrphanDataToDefaultFarm();

           // Realtime senkronizasyonu başlat (yalnızca ilk bağlanmada)
           realtimeChannel = await subscribeToRealtimeChanges();
           if (realtimeChannel) setIsRealtimeActive(true);
        })
        .finally(() => setIsSyncing(false));

    } else {
      // Çevrimdışıyken de migrasyon ve aktif çiftlik tespiti yap
      import('../utils/migrateData').then(m => m.migrateOrphanDataToDefaultFarm());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Realtime kanalını kapat (component unmount)
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, []);


  // Mobil menüyü kapat (route değiştiğinde)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const ThemeToggle = ({ isMobile }: { isMobile?: boolean }) => (
    <button 
      onClick={toggleTheme}
      className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
        isMobile 
          ? 'text-white hover:bg-nature-600 dark:hover:bg-gray-700' 
          : 'text-earth-500 dark:text-gray-400 hover:bg-earth-100 dark:hover:bg-gray-700'
      }`}
      title={theme === 'light' ? 'Karanlık Moda Geç' : 'Aydınlık Moda Geç'}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );

  const NavContent = ({ isMobile }: { isMobile?: boolean }) => (
    <nav className={`flex-1 overflow-x-hidden custom-scrollbar ${isMobile ? 'p-2.5 flex flex-col justify-between gap-1 overflow-y-auto' : 'px-3 py-1 flex flex-col justify-center gap-1 overflow-y-auto'}`}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={({ isActive }) => `
            flex items-center space-x-3.5 rounded-xl font-bold transition w-full
            ${isMobile ? 'px-3.5 py-2 text-[14px]' : 'px-4 py-2 text-[14.5px]'}
            ${isActive 
              ? 'bg-nature-600 dark:bg-nature-500 text-white shadow-md' 
              : 'text-earth-600 dark:text-gray-300 hover:bg-nature-50 dark:hover:bg-gray-700 hover:text-nature-700 dark:hover:text-white'
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
    <div className="h-screen bg-earth-50 dark:bg-gray-900 flex font-sans overflow-hidden transition-colors duration-200">
      
      {/* Masaüstü Sidebar (≥768px) */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-earth-200 dark:border-gray-700 flex-col shadow-sm relative z-20 h-full overflow-hidden transition-colors duration-200">
        <div className="p-4 border-b border-earth-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-nature-800 dark:text-nature-400 tracking-tight">Sürü<span className="text-earth-500 dark:text-gray-400">Metri</span></h1>
          </div>
          <ThemeToggle />
        </div>
        <NavContent />
        <div className="p-4 border-t border-earth-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-center space-x-2 text-xs font-bold px-3 py-2.5 bg-earth-50 dark:bg-gray-700 rounded-lg text-earth-600 dark:text-gray-300 transition-colors duration-200">
            {isGuest ? (
              <><User className="w-3 h-3 text-earth-500" /> <span>Yerel Mod (Misafir)</span></>
            ) : isSyncing ? (
              <><RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> <span>Senkronize ediliyor...</span></>
            ) : isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-green-500" />
                <span>Çevrimiçi (Senkronize)</span>
                {isRealtimeActive && (
                  <span className="relative flex h-2 w-2 ml-1" title="Gerçek zamanlı senkronizasyon aktif">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </>
            ) : (
              <><WifiOff className="w-3 h-3 text-red-500" /> <span>Çevrimdışı (Yerel)</span></>
            )}
          </div>
        </div>
      </aside>

      {/* Mobil Navbar & Hamburger (<768px) */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-nature-700 dark:bg-gray-800 text-white shadow-md z-30 h-16 flex items-center justify-between px-4 transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-nature-600 dark:hover:bg-gray-700 transition">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black">Sürü<span className="text-nature-300 dark:text-gray-400">Metri</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle isMobile />
          {isGuest ? (
            <User className="w-5 h-5 text-earth-300" />
          ) : isSyncing ? (
            <RefreshCw className="w-5 h-5 animate-spin text-blue-300" />
          ) : isOnline ? (
            <Wifi className="w-5 h-5 text-green-300" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-300" />
          )}
          {!isGuest && isRealtimeActive && isOnline && (
            <span className="relative flex h-2.5 w-2.5" title="Gerçek zamanlı senkronizasyon aktif">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
            </span>
          )}
        </div>
      </header>

      {/* Mobil Menü (Drawer) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-earth-900/60 dark:bg-black/60 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl animate-in slide-in-from-left duration-300 transition-colors">
            {/* Üst Çizgi & Başlık */}
            <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-white dark:bg-gray-800 transition-colors">
              <h1 className="text-xl font-black text-nature-800 dark:text-nature-400 tracking-tight">Sürü<span className="text-earth-500 dark:text-gray-400">Metri</span></h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-earth-500 dark:text-gray-400 hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 2 Çizgi Arasında Ortalanmış Sekme Butonları */}
            <NavContent isMobile />
            
            {/* Alt Çizgi & Menü Etiketi */}
            <div className="p-3.5 border-t border-earth-200 dark:border-gray-700 shrink-0 bg-earth-50/80 dark:bg-gray-800/80 transition-colors">
              <span className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-widest block text-center">Menü</span>
            </div>
          </div>
        </div>
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 relative min-w-0 md:pt-0 pt-16 h-full overflow-y-auto">
        <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default Layout;
