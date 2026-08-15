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
  buzagiFiyati: number;
  canliKiloFiyatlari: Record<string, number>;
  isletmeTipi: 'Süt' | 'Besi' | 'Karma';
  setAramaMetni: (metin: string) => void;
  setTurFiltresi: (tur: string) => void;
  setDurumFiltresi: (durum: string) => void;
  setSutLitreFiyati: (fiyat: number) => void;
  setBuzagiFiyati: (fiyat: number) => void;
  setCanliKiloFiyatlari: (fiyatlar: Record<string, number>) => void;
  setIsletmeTipi: (tip: 'Süt' | 'Besi' | 'Karma') => void;

  // Ration Calculator State
  rationSelectedGrupId: string;
  rationVerimYonu: 'Sütçü' | 'Etçi';
  rationSutcuDonemi: 'Laktasyon' | 'Uzak Kuru' | 'Yakın Kuru';
  rationAvgWeight: number;
  rationMilkYield: number;
  rationDim: number;
  rationAdg: number;
  rationMinKabaOran: number;
  rationMaxKabaOran: number;
  rationListesi: { id: string; yemId: string; kgAsFed: number; minKg?: number; maxKg?: number }[];
  
  setRationSelectedGrupId: (id: string) => void;
  setRationVerimYonu: (yon: 'Sütçü' | 'Etçi') => void;
  setRationSutcuDonemi: (donem: 'Laktasyon' | 'Uzak Kuru' | 'Yakın Kuru') => void;
  setRationAvgWeight: (weight: number) => void;
  setRationMilkYield: (yields: number) => void;
  setRationDim: (dim: number) => void;
  setRationAdg: (adg: number) => void;
  setRationMinKabaOran: (val: number) => void;
  setRationMaxKabaOran: (val: number) => void;
  setRationListesi: (liste: { id: string; yemId: string; kgAsFed: number; minKg?: number; maxKg?: number }[]) => void;

  // Üreme ve Uyarı Ayarları
  uremeAyarlari: UremeAyarlari;
  setUremeAyarlari: (ayarlar: Partial<UremeAyarlari>) => void;

  // Konum (Hava Durumu için)
  konum: { lat: number; lon: number; sehir: string } | null;
  setKonum: (konum: { lat: number; lon: number; sehir: string } | null) => void;

  // Görünüm / Tema
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Gizlenen Boğalar (Bulls Catalog)
  hiddenBulls: string[];
  setHiddenBulls: (bulls: string[]) => void;

  // AI Asistan Kilit Durumu
  isAiUnlocked: boolean;
  setIsAiUnlocked: (unlocked: boolean) => void;
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
      buzagiFiyati: 50000.0,
      canliKiloFiyatlari: {
        'Dana': 300,
        'Düve': 300,
        'İnek': 300,
        'Tosun': 300,
        'Boğa': 300,
        'Öküz': 300
      },
      isletmeTipi: 'Karma',

      setAramaMetni: (metin) => set({ aramaMetni: metin }),
      setTurFiltresi: (tur) => set({ turFiltresi: tur }),
      setDurumFiltresi: (durum) => set({ durumFiltresi: durum }),
      setSutLitreFiyati: (fiyat) => set({ sutLitreFiyati: fiyat }),
      setBuzagiFiyati: (fiyat) => set({ buzagiFiyati: fiyat }),
      setCanliKiloFiyatlari: (fiyatlar) => set({ canliKiloFiyatlari: fiyatlar }),
      setIsletmeTipi: (tip) => set({ isletmeTipi: tip }),

      // Ration Calculator
      rationSelectedGrupId: '',
      rationVerimYonu: 'Sütçü',
      rationSutcuDonemi: 'Laktasyon',
      rationAvgWeight: 600,
      rationMilkYield: 30,
      rationDim: 150,
      rationAdg: 1200,
      rationMinKabaOran: 40,
      rationMaxKabaOran: 60,
      rationListesi: [],

      setRationSelectedGrupId: (id) => set({ rationSelectedGrupId: id }),
      setRationVerimYonu: (yon) => set({ rationVerimYonu: yon }),
      setRationSutcuDonemi: (donem) => set({ rationSutcuDonemi: donem }),
      setRationAvgWeight: (weight) => set({ rationAvgWeight: weight }),
      setRationMilkYield: (yields) => set({ rationMilkYield: yields }),
      setRationDim: (dim) => set({ rationDim: dim }),
      setRationAdg: (adg) => set({ rationAdg: adg }),
      setRationMinKabaOran: (val) => set({ rationMinKabaOran: val }),
      setRationMaxKabaOran: (val) => set({ rationMaxKabaOran: val }),
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

      // Konum
      konum: null,
      setKonum: (konum) => set({ konum }),

      // Tema
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      hiddenBulls: [],
      setHiddenBulls: (bulls) => set({ hiddenBulls: bulls }),

      isAiUnlocked: false,
      setIsAiUnlocked: (unlocked) => set({ isAiUnlocked: unlocked }),
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
        buzagiFiyati: state.buzagiFiyati,
        canliKiloFiyatlari: state.canliKiloFiyatlari,
        isletmeTipi: state.isletmeTipi,
        rationSelectedGrupId: state.rationSelectedGrupId,
        rationVerimYonu: state.rationVerimYonu,
        rationSutcuDonemi: state.rationSutcuDonemi,
        rationAvgWeight: state.rationAvgWeight,
        rationMilkYield: state.rationMilkYield,
        rationDim: state.rationDim,
        rationAdg: state.rationAdg,
        rationMinKabaOran: state.rationMinKabaOran,
        rationMaxKabaOran: state.rationMaxKabaOran,
        rationListesi: state.rationListesi,
        uremeAyarlari: state.uremeAyarlari,
        konum: state.konum,
        isGuest: state.isGuest,
        theme: state.theme,
        hiddenBulls: state.hiddenBulls,
        isAiUnlocked: state.isAiUnlocked,
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
    buzagiFiyati: state.buzagiFiyati,
    canliKiloFiyatlari: state.canliKiloFiyatlari,
    isletmeTipi: state.isletmeTipi,
    rationSelectedGrupId: state.rationSelectedGrupId, 
    rationVerimYonu: state.rationVerimYonu, 
    rationSutcuDonemi: state.rationSutcuDonemi,
    rationAvgWeight: state.rationAvgWeight, 
    rationMilkYield: state.rationMilkYield, 
    rationDim: state.rationDim,
    rationAdg: state.rationAdg, 
    rationMinKabaOran: state.rationMinKabaOran,
    rationMaxKabaOran: state.rationMaxKabaOran,
    rationListesi: state.rationListesi, 
    uremeAyarlari: state.uremeAyarlari,
    hiddenBulls: state.hiddenBulls,
    isAiUnlocked: state.isAiUnlocked
  };
  
  const prevAyarlar = { 
    activeCiftlikId: prevState.activeCiftlikId,
    sutLitreFiyati: prevState.sutLitreFiyati, 
    buzagiFiyati: prevState.buzagiFiyati,
    canliKiloFiyatlari: prevState.canliKiloFiyatlari,
    isletmeTipi: prevState.isletmeTipi,
    rationSelectedGrupId: prevState.rationSelectedGrupId, 
    rationVerimYonu: prevState.rationVerimYonu, 
    rationSutcuDonemi: prevState.rationSutcuDonemi,
    rationAvgWeight: prevState.rationAvgWeight, 
    rationMilkYield: prevState.rationMilkYield, 
    rationDim: prevState.rationDim,
    rationAdg: prevState.rationAdg, 
    rationMinKabaOran: prevState.rationMinKabaOran,
    rationMaxKabaOran: prevState.rationMaxKabaOran,
    rationListesi: prevState.rationListesi, 
    uremeAyarlari: prevState.uremeAyarlari,
    hiddenBulls: prevState.hiddenBulls,
    isAiUnlocked: prevState.isAiUnlocked
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
