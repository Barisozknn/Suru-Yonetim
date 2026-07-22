import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const ProtectedRoute: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isGuest = useStore((state) => state.isGuest);

  // Geliştirme ortamında auth'u bypass etmek için .env.local'e VITE_BYPASS_AUTH=true ekleyin
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-nature-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-nature-700 font-bold">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!bypassAuth && !isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
