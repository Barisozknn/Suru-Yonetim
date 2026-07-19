/// <reference types="vite-plugin-pwa/react" />
import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Service Worker güncelleme bildirimi.
 * Yeni bir uygulama versiyonu hazır olduğunda ekranın altında görünür.
 * Kullanıcı "Yenile" butonuna basınca SW güncellenir.
 */
const UpdatePrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('[SW] Kayıtlı:', r);
    },
    onRegisterError(error: unknown) {
      console.error('[SW] Kayıt hatası:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setVisible(true);
    }
  }, [needRefresh]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-nature-800 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="p-2 bg-nature-700 rounded-xl flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-nature-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Yeni Sürüm Mevcut</p>
          <p className="text-nature-300 text-xs mt-0.5">Güncellemek için yenile butonuna bas.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-nature-500 hover:bg-nature-400 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition"
          >
            Yenile
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1.5 hover:bg-nature-700 rounded-lg transition text-nature-300"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
