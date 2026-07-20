import type { UremeAyarlari } from '../store/useStore';

export const getUremeAyarForIrk = (irk: string | undefined | null, ayarlari: UremeAyarlari) => {
  if (irk && ayarlari.irkAyarlari && ayarlari.irkAyarlari[irk]) {
    return ayarlari.irkAyarlari[irk];
  }
  
  // Return default settings
  return {
    gebelikSuresi: ayarlari.gebelikSuresi,
    kizginlikDongusu: ayarlari.kizginlikDongusu,
    kuruyaCikarma: ayarlari.kuruyaCikarma,
    yenidenTohumlamaUyarisi: ayarlari.yenidenTohumlamaUyarisi
  };
};
