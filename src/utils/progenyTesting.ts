import type { Hayvan, SutKaydi, AgirlikKaydi, UremeKaydi, ProgenyTestResult } from '../types';


export const generateBullsCatalog = (
  hayvanlar: Hayvan[],
  uremeKayitlari: UremeKaydi[],
  sutKayitlari: SutKaydi[],
  agirlikKayitlari: AgirlikKaydi[],
  suruOrtSut: number,
  suruOrtADG: number
): ProgenyTestResult[] => {
  const results: ProgenyTestResult[] = [];

  // 1) Sürüdeki gerçek boğalar (SADECE tur === 'Boğa' ve durum === 'Aktif')
  const bogalar = hayvanlar.filter(h => h.tur === 'Boğa' && h.durum === 'Aktif');

  bogalar.forEach(boga => {
    const yavrular = hayvanlar.filter(h => h.babaKupeNo === boga.kupeNo);
    const result = calculateProgenyTest(boga.id, boga.kupeNo, boga.irk, false, yavrular, sutKayitlari, agirlikKayitlari, uremeKayitlari, suruOrtSut, suruOrtADG);
    results.push(result);
  });

  // 2) Üreme kayıtlarından benzersiz sperma bilgileri (Suni Tohumlama olanlar)
  const spermaBilgileri = uremeKayitlari
    .filter(k => k.tur === 'Tohumlama/Aşım' && k.detaylar?.spermaBogaBilgisi && k.detaylar?.tohumlamaYontemi !== 'Elde')
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
      uremeKayitlari,
      suruOrtSut,
      suruOrtADG
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
  uremeKayitlari: UremeKaydi[],
  suruOrtSut: number,
  suruOrtADG: number
): ProgenyTestResult => {
  if (yavrular.length === 0) {
    return { bogaId, isVirtualSperm, bogaAdi, irk, yavruSayisi: 0, guvenilirlik: 0 };
  }

  let toplamSut = 0, sutYavruSayisi = 0, toplamAgirlik = 0, agirlikYavruSayisi = 0, toplamUreme = 0, uremeYavruSayisi = 0;

  yavrular.forEach(yavru => {
    const sutRecords = sutKayitlari.filter(s => s.hayvanId === yavru.id);
    if (sutRecords.length > 0) {
      toplamSut += sutRecords.reduce((sum, r) => sum + r.litre, 0) / sutRecords.length;
      sutYavruSayisi++;
    }
    const agirlikRecords = agirlikKayitlari.filter(a => a.hayvanId === yavru.id);
    if (agirlikRecords.length > 0) {
      let yavruAdg = 0;
      agirlikRecords.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
      
      if (agirlikRecords.length >= 2) {
        const first = agirlikRecords[0];
        const last = agirlikRecords[agirlikRecords.length - 1];
        const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
        yavruAdg = ((last.kg - first.kg) / gunFarki) * 1000;
      } else if (agirlikRecords.length === 1 && yavru.dogumTarihi) {
        const gunFarki = Math.max(1, (new Date(agirlikRecords[0].tarih).getTime() - new Date(yavru.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
        yavruAdg = ((agirlikRecords[0].kg - 40) / gunFarki) * 1000;
      }

      if (yavruAdg > 0) {
        toplamAgirlik += yavruAdg;
        agirlikYavruSayisi++;
      }
    }
    
    if (yavru.cinsiyet === 'Dişi') {
      const yavruUremeKayitlari = uremeKayitlari.filter(u => u.hayvanId === yavru.id);
      const tohumlamalar = yavruUremeKayitlari.filter(r => r.tur === 'Tohumlama/Aşım' || r.tur === 'Doğal Aşım').length;
      if (tohumlamalar > 0) {
        // Ham Conception Rate (CR): Gerçek gebelik / tohumlama sayısı
        const gebelikler = yavruUremeKayitlari.filter(r => r.tur === 'Gebelik Kontrolü' && r.durum === 'Gebe').length;
        const dogumlar = yavruUremeKayitlari.filter(r => r.tur === 'Doğum').length;
        const gercekBasari = Math.min(tohumlamalar, Math.max(gebelikler, dogumlar));
        toplamUreme += gercekBasari / tohumlamalar; // 0-1 arası CR
        uremeYavruSayisi++;
      }
    }
  });

  const yavruOrtalamaSut = sutYavruSayisi > 0 ? toplamSut / sutYavruSayisi : undefined;
  const yavruOrtalamaCanliAgirlik = agirlikYavruSayisi > 0 ? toplamAgirlik / agirlikYavruSayisi : undefined;
  const yavruOrtalamaUremeSkoru = uremeYavruSayisi > 0 ? toplamUreme / uremeYavruSayisi : undefined;
  
  const etkiliVeriSayisi = sutYavruSayisi + agirlikYavruSayisi + uremeYavruSayisi;
  const guvenilirlik = etkiliVeriSayisi === 0 ? 0 : Math.min(99, Math.round((etkiliVeriSayisi / (etkiliVeriSayisi + 10)) * 100));

  return {
    bogaId, isVirtualSperm, bogaAdi, irk,
    yavruSayisi: yavrular.length,
    guvenilirlik,
    yavruOrtalamaSut,
    yavruOrtalamaSutSapma: yavruOrtalamaSut !== undefined ? yavruOrtalamaSut - suruOrtSut : undefined,
    yavruOrtalamaCanliAgirlik,
    yavruOrtalamaCanliAgirlikSapma: yavruOrtalamaCanliAgirlik !== undefined ? yavruOrtalamaCanliAgirlik - suruOrtADG : undefined,
    yavruOrtalamaUremeSkoru,
  };
};
