import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

export interface UremeAyarlari {
  gebelikSuresi: number;
  kizginlikDongusu: number;
  kuruyaCikarma: number;
  yenidenTohumlamaUyarisi: number;
}

interface StoreState {
  // Auth
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;

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
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),

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
        yenidenTohumlamaUyarisi: 45
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
