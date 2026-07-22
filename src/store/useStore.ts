import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UremeAyarlari {
  gebelikSuresi: number;
  kizginlikDongusu: number;
  kuruyaCikarma: number;
  yenidenTohumlamaUyarisi: number;
  irkAyarlari?: Record<string, {
    gebelikSuresi: number;
    kizginlikDongusu: number;
    kuruyaCikarma: number;
    yenidenTohumlamaUyarisi: number;
  }>;
}

interface StoreState {
  activeCiftlikId: string | null;
  setActiveCiftlikId: (id: string | null) => void;
  ciftlikler: { id: string; ad: string }[];
  setCiftlikler: (ciftlikler: { id: string; ad: string }[]) => void;

  // Auth
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsGuest: (guest: boolean) => void;

  // Filters
  aramaMetni: string;
  turFiltresi: string;
  durumFiltresi: string;
  sutLitreFiyati: number;
  setAramaMetni: (metin: string) => void;
  setTurFiltresi: (tur: string) => void;
  setDurumFiltresi: (durum: string) => void;
  setSutLitreFiyati: (fiyat: number) => void;

  // Ration Calculator State
  rationSelectedGrupId: string;
  rationVerimYonu: 'Sütçü' | 'Etçi';
  rationAvgWeight: number;
  rationMilkYield: number;
  rationAdg: number;
  rationListesi: { id: string; yemId: string; kgAsFed: number }[];
  
  setRationSelectedGrupId: (id: string) => void;
  setRationVerimYonu: (yon: 'Sütçü' | 'Etçi') => void;
  setRationAvgWeight: (weight: number) => void;
  setRationMilkYield: (yields: number) => void;
  setRationAdg: (adg: number) => void;
  setRationListesi: (liste: { id: string; yemId: string; kgAsFed: number }[]) => void;

  // Üreme ve Uyarı Ayarları
  uremeAyarlari: UremeAyarlari;
  setUremeAyarlari: (ayarlar: Partial<UremeAyarlari>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      activeCiftlikId: null,
      setActiveCiftlikId: (id) => set({ activeCiftlikId: id }),
      ciftlikler: [],
      setCiftlikler: (ciftlikler) => set({ ciftlikler }),

      user: null,
      session: null,
      isGuest: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setIsGuest: (guest) => set({ isGuest: guest }),

      aramaMetni: '',
      turFiltresi: 'Tümü',
      durumFiltresi: 'Aktif',
      sutLitreFiyati: 15.0,

      setAramaMetni: (metin) => set({ aramaMetni: metin }),
      setTurFiltresi: (tur) => set({ turFiltresi: tur }),
      setDurumFiltresi: (durum) => set({ durumFiltresi: durum }),
      setSutLitreFiyati: (fiyat) => set({ sutLitreFiyati: fiyat }),

      // Ration Calculator
      rationSelectedGrupId: '',
      rationVerimYonu: 'Sütçü',
      rationAvgWeight: 600,
      rationMilkYield: 30,
      rationAdg: 1200,
      rationListesi: [],

      setRationSelectedGrupId: (id) => set({ rationSelectedGrupId: id }),
      setRationVerimYonu: (yon) => set({ rationVerimYonu: yon }),
      setRationAvgWeight: (weight) => set({ rationAvgWeight: weight }),
      setRationMilkYield: (yields) => set({ rationMilkYield: yields }),
      setRationAdg: (adg) => set({ rationAdg: adg }),
      setRationListesi: (liste) => set({ rationListesi: liste }),

      // Üreme ve Uyarı Ayarları
      uremeAyarlari: {
        gebelikSuresi: 283,
        kizginlikDongusu: 21,
        kuruyaCikarma: 60,
        yenidenTohumlamaUyarisi: 45,
        irkAyarlari: {}
      },
      setUremeAyarlari: (ayarlar) => set((state) => ({ 
        uremeAyarlari: { ...state.uremeAyarlari, ...ayarlar } 
      })),
    }),
    {
      name: 'suru-yonetimi-store', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Sadece bu alanları persist et — auth verisi ve filtreler kasıtlı olarak hariç
      // Güvenlik: user/session token'ları localStorage'da saklanmamalı (Supabase zaten kendi yönetiyor)
      partialize: (state) => ({
        activeCiftlikId: state.activeCiftlikId,
        ciftlikler: state.ciftlikler,
        sutLitreFiyati: state.sutLitreFiyati,
        rationSelectedGrupId: state.rationSelectedGrupId,
        rationVerimYonu: state.rationVerimYonu,
        rationAvgWeight: state.rationAvgWeight,
        rationMilkYield: state.rationMilkYield,
        rationAdg: state.rationAdg,
        rationListesi: state.rationListesi,
        uremeAyarlari: state.uremeAyarlari,
      }),
    }
  )
);


let debounceTimer: ReturnType<typeof setTimeout>;
useStore.subscribe((state, prevState) => {
  if (!state.user) return;
  
  const ayarlar = { 
    activeCiftlikId: state.activeCiftlikId,
    sutLitreFiyati: state.sutLitreFiyati, 
    rationSelectedGrupId: state.rationSelectedGrupId, 
    rationVerimYonu: state.rationVerimYonu, 
    rationAvgWeight: state.rationAvgWeight, 
    rationMilkYield: state.rationMilkYield, 
    rationAdg: state.rationAdg, 
    rationListesi: state.rationListesi, 
    uremeAyarlari: state.uremeAyarlari 
  };
  
  const prevAyarlar = { 
    activeCiftlikId: prevState.activeCiftlikId,
    sutLitreFiyati: prevState.sutLitreFiyati, 
    rationSelectedGrupId: prevState.rationSelectedGrupId, 
    rationVerimYonu: prevState.rationVerimYonu, 
    rationAvgWeight: prevState.rationAvgWeight, 
    rationMilkYield: prevState.rationMilkYield, 
    rationAdg: prevState.rationAdg, 
    rationListesi: prevState.rationListesi, 
    uremeAyarlari: prevState.uremeAyarlari 
  };
  
  if (JSON.stringify(ayarlar) !== JSON.stringify(prevAyarlar)) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      supabase.from('kullanici_ayarlari').upsert({ 
        user_id: state.user!.id, 
        ayarlar, 
        updated_at: new Date().toISOString() 
      }).then(({ error }) => {
        if (error) console.error('Ayarlar kaydedilemedi:', error);
      });
    }, 2000);
  }
});
