import type { Hayvan, SutKaydi, AgirlikKaydi, UremeKaydi, ProgenyTestResult } from '../types';

export const generateBullsCatalog = (
  hayvanlar: Hayvan[],
  uremeKayitlari: UremeKaydi[],
  sutKayitlari: SutKaydi[],
  agirlikKayitlari: AgirlikKaydi[],
  suruOrtSut: number,
  suruOrtAgirlik: number
): ProgenyTestResult[] => {
  const results: ProgenyTestResult[] = [];

  // 1) Sürüdeki gerçek boğalar (SADECE tur === 'Boğa')
  const bogalar = hayvanlar.filter(h => h.tur === 'Boğa');

  bogalar.forEach(boga => {
    const yavrular = hayvanlar.filter(h => h.babaKupeNo === boga.kupeNo);
    const result = calculateProgenyTest(boga.id, boga.kupeNo, boga.irk, false, yavrular, sutKayitlari, agirlikKayitlari, suruOrtSut, suruOrtAgirlik);
    if (result.yavruSayisi > 0) results.push(result);
  });

  // 2) Üreme kayıtlarından benzersiz sperma bilgileri (Yapay Tohumlama)
  const spermaBilgileri = uremeKayitlari
    .filter(k => k.tur === 'Tohumlama/Aşım' && k.detaylar?.spermaBogaBilgisi)
    .map(k => k.detaylar!.spermaBogaBilgisi as string)
    .filter((v, i, a) => a.indexOf(v) === i);

  spermaBilgileri.forEach(spermaBilgisi => {
    const yavrular = hayvanlar.filter(h => h.babaKupeNo === spermaBilgisi);
    const result = calculateProgenyTest(
      `sperma_${spermaBilgisi}`,
      spermaBilgisi,
      'Suni Tohumlama',
      true,
      yavrular,
      sutKayitlari,
      agirlikKayitlari,
      suruOrtSut,
      suruOrtAgirlik
    );
    results.push(result);
  });

  return results.sort((a, b) => b.guvenilirlik - a.guvenilirlik);
};

const calculateProgenyTest = (
  bogaId: string,
  bogaAdi: string,
  irk: string,
  isVirtualSperm: boolean,
  yavrular: Hayvan[],
  sutKayitlari: SutKaydi[],
  agirlikKayitlari: AgirlikKaydi[],
  suruOrtSut: number,
  suruOrtAgirlik: number
): ProgenyTestResult => {
  if (yavrular.length === 0) {
    return { bogaId, isVirtualSperm, bogaAdi, irk, yavruSayisi: 0, guvenilirlik: 0 };
  }

  let toplamSut = 0, sutYavruSayisi = 0, toplamAgirlik = 0, agirlikYavruSayisi = 0;

  yavrular.forEach(yavru => {
    const sutRecords = sutKayitlari.filter(s => s.hayvanId === yavru.id);
    if (sutRecords.length > 0) {
      toplamSut += sutRecords.reduce((sum, r) => sum + r.litre, 0) / sutRecords.length;
      sutYavruSayisi++;
    }
    const agirlikRecords = agirlikKayitlari.filter(a => a.hayvanId === yavru.id);
    if (agirlikRecords.length > 0) {
      toplamAgirlik += agirlikRecords.reduce((sum, r) => sum + r.kg, 0) / agirlikRecords.length;
      agirlikYavruSayisi++;
    }
  });

  const yavruOrtalamaSut = sutYavruSayisi > 0 ? toplamSut / sutYavruSayisi : undefined;
  const yavruOrtalamaCanliAgirlik = agirlikYavruSayisi > 0 ? toplamAgirlik / agirlikYavruSayisi : undefined;
  const etkiliVeriSayisi = sutYavruSayisi + agirlikYavruSayisi;
  const guvenilirlik = etkiliVeriSayisi === 0 ? 0 : Math.min(99, Math.round((etkiliVeriSayisi / (etkiliVeriSayisi + 10)) * 100));

  return {
    bogaId, isVirtualSperm, bogaAdi, irk,
    yavruSayisi: yavrular.length,
    guvenilirlik,
    yavruOrtalamaSut,
    yavruOrtalamaSutSapma: yavruOrtalamaSut !== undefined ? yavruOrtalamaSut - suruOrtSut : undefined,
    yavruOrtalamaCanliAgirlik,
    yavruOrtalamaCanliAgirlikSapma: yavruOrtalamaCanliAgirlik !== undefined ? yavruOrtalamaCanliAgirlik - suruOrtAgirlik : undefined,
  };
};
