import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { calculateTotalDailyFeedCost } from '../utils/dashboardCalculations';
import { RobotoRegularBase64 } from '../utils/fonts';

export const exportData = async (
  format: 'excel' | 'pdf',
  kategori: string,
  hayvanIds?: string[],
  startDate?: string,
  endDate?: string
) => {
  let data: any[] = [];
  let headers: string[] = [];
  let title = '';

  switch (kategori) {
    case 'hayvanlar': {
      const hayvanlar = await db.hayvanlar.toArray();
      headers = ['Küpe No', 'Tür', 'Irk', 'Doğum Tarihi', 'Cinsiyet', 'Ağırlık (kg)', 'Durum'];
      data = hayvanlar.map(h => [
        h.kupeNo, h.tur, h.irk, h.dogumTarihi, h.cinsiyet, h.guncelAgirlikKg, h.durum
      ]);
      title = 'Hayvan Listesi';
      break;
    }
    case 'gruplar': {
      const gruplar = await db.gruplar.toArray();
      const tumHayvanlar = await db.hayvanlar.toArray();
      headers = ['Grup Adı', 'Tür', 'Rasyon Adı', 'Hayvan Sayısı'];
      data = gruplar.map(g => {
        const hCount = tumHayvanlar.filter(h => h.grupId === g.id).length;
        return [g.ad, g.tur || '', g.rasyonOzet || g.rasyonAdi || '', hCount];
      });
      title = 'Grup Yönetimi';
      break;
    }
    case 'yemler': {
      const yemler = await db.yemler.toArray();
      headers = ['Yem Adı', 'Kategori', 'Stok (kg)', 'Birim Fiyat', 'KM (%)', 'ME', 'HP (%)', 'Ca (%)', 'P (%)'];
      data = yemler.map(y => [
        y.ad, y.tur, y.stokKg, y.birimFiyat, y.kmYuzde || '', y.meMcalKg || '', y.hpYuzde || '', y.caYuzde || '', y.pYuzde || ''
      ]);
      title = 'Yem Deposu';
      break;
    }
    case 'buzagilar': {
      const buzagilar = await db.hayvanlar.filter(h => h.tur === 'Buzağı').toArray();
      const buzagiKayitlari = await db.buzagiKayitlari.toArray();
      headers = [
        'Küpe No', 'Doğum Şekli', 'Doğum Ağırlığı', 'Ağız Sütü Verildi', 'Kolostrum Miktarı (Lt)', 
        'Verilme Süresi (Saat)', 'Sütten Kesim Hedefi (kg)', 'Sütten Kesim Hedef Tarih',
        'Sütten Kesim Gerçekleşen Ağırlık (kg)', 'Sütten Kesim Gerçekleşen Tarih'
      ];
      data = buzagilar.map(b => {
        const k = buzagiKayitlari.find(bk => bk.hayvanId === b.id);
        return [
          b.kupeNo,
          k?.dogumDegerlendirmesi || '',
          k?.dogumAgirligiKg || '',
          k?.agizSutuVerildi ? 'Evet' : 'Hayır',
          k?.agizSutuMiktarLt || '',
          k?.agizSutuSaatSonra || '',
          k?.hedefSuttenKesimAgirligiKg || '',
          k?.hedefSuttenKesimTarihi || '',
          k?.gerceklesenSuttenKesimAgirligiKg || '',
          k?.gerceklesenSuttenKesimTarihi || ''
        ];
      });
      title = 'Buzağı Listesi';
      break;
    }
    case 'soyAgaci': {
      if (!hayvanIds || hayvanIds.length === 0) throw new Error("Soy ağacı için hayvan seçilmelidir.");
      headers = ['İlişki', 'Küpe No', 'Tür', 'Irk', 'Ana Hayvan'];
      data = [];
      
      for (let i = 0; i < hayvanIds.length; i++) {
        const hId = hayvanIds[i];
        const h = await db.hayvanlar.get(hId);
        if (!h) continue;

        const anne = h.anneKupeNo ? await db.hayvanlar.where('kupeNo').equals(h.anneKupeNo).first() : null;
        const baba = h.babaKupeNo ? await db.hayvanlar.where('kupeNo').equals(h.babaKupeNo).first() : null;
        
        const anneanne = anne?.anneKupeNo ? await db.hayvanlar.where('kupeNo').equals(anne.anneKupeNo).first() : null;
        const dedeAnneTarafi = anne?.babaKupeNo ? await db.hayvanlar.where('kupeNo').equals(anne.babaKupeNo).first() : null;
        
        const babaanne = baba?.anneKupeNo ? await db.hayvanlar.where('kupeNo').equals(baba.anneKupeNo).first() : null;
        const dedeBabaTarafi = baba?.babaKupeNo ? await db.hayvanlar.where('kupeNo').equals(baba.babaKupeNo).first() : null;

        const yavrular = await db.hayvanlar.filter(y => y.anneKupeNo === h.kupeNo || y.babaKupeNo === h.kupeNo).toArray();

        const groupKey = h.kupeNo;

        data.push(['Kendisi', h.kupeNo, h.tur, h.irk, groupKey]);
        data.push(['Anne', h.anneKupeNo || '-', anne?.tur || '-', anne?.irk || '-', groupKey]);
        data.push(['Baba', h.babaKupeNo || '-', baba?.tur || '-', baba?.irk || '-', groupKey]);
        data.push(['Anneanne (Annenin Annesi)', anne?.anneKupeNo || '-', anneanne?.tur || '-', anneanne?.irk || '-', groupKey]);
        data.push(['Büyükbaba (Annenin Babası)', anne?.babaKupeNo || '-', dedeAnneTarafi?.tur || '-', dedeAnneTarafi?.irk || '-', groupKey]);
        data.push(['Babaanne (Babanın Annesi)', baba?.anneKupeNo || '-', babaanne?.tur || '-', babaanne?.irk || '-', groupKey]);
        data.push(['Büyükbaba (Babanın Babası)', baba?.babaKupeNo || '-', dedeBabaTarafi?.tur || '-', dedeBabaTarafi?.irk || '-', groupKey]);
        
        yavrular.forEach((y, index) => {
          data.push([`Yavrusu ${index + 1}`, y.kupeNo, y.tur, y.irk, groupKey]);
        });

        if (i < hayvanIds.length - 1) {
          data.push(['', '', '', '', '']); // İki hayvan arası boşluk
        }
      }
      
      if (data.length === 0) throw new Error("Hayvan bulunamadı.");
      title = hayvanIds.length === 1 ? `${data[0][1]} - Soy Ağacı` : `Çoklu Soy Ağacı Dökümü`;
      break;
    }
    case 'verimGecmisi': {
      if (!hayvanIds || hayvanIds.length === 0) throw new Error("Verim geçmişi için hayvan seçilmelidir.");
      
      headers = [];
      let firstAnimalKupeNo = '';
      const allAnimalsData: { t: Date, row: string[] }[][] = [];

      for (const hId of hayvanIds) {
        const vh = await db.hayvanlar.get(hId);
        if (!vh) continue;
        if (!firstAnimalKupeNo) firstAnimalKupeNo = vh.kupeNo;

        const sutKayitlari = await db.sutKayitlari.where('hayvanId').equals(hId).toArray();
        const agirlikKayitlari = await db.agirlikKayitlari.where('hayvanId').equals(hId).toArray();

        const records = [
          ...sutKayitlari.map(s => ({ t: new Date(s.tarih), row: [vh.kupeNo, s.tarih, 'Süt', `${s.litre} Lt`] })),
          ...agirlikKayitlari.map(a => ({ t: new Date(a.tarih), row: [vh.kupeNo, a.tarih, 'Ağırlık', `${a.kg} kg`] }))
        ];
        records.sort((a, b) => b.t.getTime() - a.t.getTime());
        allAnimalsData.push(records);

        if (headers.length > 0) headers.push(''); // Boş sütun
        headers.push('Küpe No', 'Tarih', 'Kayıt Türü', 'Değer');
      }

      if (allAnimalsData.length === 0) throw new Error("Seçilen hayvanlar için verim kaydı bulunamadı.");

      const maxRows = Math.max(...allAnimalsData.map(arr => arr.length));
      data = [];

      for (let i = 0; i < maxRows; i++) {
        const rowData: string[] = [];
        for (let j = 0; j < allAnimalsData.length; j++) {
          if (j > 0) rowData.push(''); // Boş sütun
          
          const record = allAnimalsData[j][i];
          if (record) {
            rowData.push(record.row[0], record.row[1], record.row[2], record.row[3]);
          } else {
            rowData.push('', '', '', '');
          }
        }
        data.push(rowData);
      }
      
      title = hayvanIds.length === 1 ? `${firstAnimalKupeNo} - Verim Geçmişi` : `Çoklu Verim Geçmişi Dökümü`;
      break;
    }
    case 'gelirGider': {
      headers = ['Tarih', 'Açıklama', 'Gelir (TL)', 'Gider (TL)'];

      const saglikOlaylari = await db.saglikOlaylari.toArray();
      const planlananAsilar = await db.planlananAsilar.toArray();
      const ekFinansal = await db.ekFinansalIslemler.toArray();
      const gunlukYemMaliyetleri = await db.gunlukYemMaliyetleri.toArray();
      const yemler = await db.yemler.toArray();
      const gruplar = await db.gruplar.toArray();
      const hayvanlar = await db.hayvanlar.toArray();

      let financialData: any[] = [];

      // Günlük Yem Giderleri
      gunlukYemMaliyetleri.forEach(y => {
        financialData.push({ date: new Date(y.tarih), type: 'Gider', category: 'Sürü Yem Gideri', amount: y.toplamMaliyet });
      });

      // Bugünkü yem giderini dinamik ekle (Eğer bugün için gunlukYemMaliyetleri içinde yoksa)
      const todayStr = new Date().toISOString().split('T')[0];
      if (!gunlukYemMaliyetleri.some(y => y.tarih === todayStr)) {
        const bugunMaliyet = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
        if (bugunMaliyet > 0) {
          financialData.push({ date: new Date(todayStr), type: 'Gider', category: 'Sürü Yem Gideri', amount: bugunMaliyet });
        }
      }

      // Sağlık Giderleri
      saglikOlaylari.forEach(s => {
        if (s.maliyet) financialData.push({ date: new Date(s.tarih), type: 'Gider', category: 'Sağlık / Tedavi', amount: s.maliyet });
      });
      planlananAsilar.forEach(p => {
        if (p.yapildiMi && p.maliyet) financialData.push({ date: new Date(p.yapilmaTarihi || p.planlanaTarih), type: 'Gider', category: 'Aşı Uygulaması', amount: p.maliyet });
      });

      // Ek Finans
      ekFinansal.forEach(e => {
        financialData.push({ date: new Date(e.tarih), type: e.tip, category: e.kategori, amount: e.miktar });
      });

      const sutLitreFiyati = useStore.getState().sutLitreFiyati || 0;
      const sutKayitlari = await db.sutKayitlari.toArray();
      const uremeKayitlari = await db.uremeKayitlari.toArray();

      // Süt gelirlerini gün gün grupla
      const sutByDate: Record<string, number> = {};
      sutKayitlari.forEach(s => {
        if (!sutByDate[s.tarih]) sutByDate[s.tarih] = 0;
        sutByDate[s.tarih] += s.litre;
      });
      Object.entries(sutByDate).forEach(([tarih, litre]) => {
        financialData.push({ date: new Date(tarih), type: 'Gelir', category: 'Süt Satışı', amount: litre * sutLitreFiyati });
      });

      // Hayvan satışı
      hayvanlar.filter(h => h.durum === 'Satıldı' && h.satisTarihi).forEach(h => {
        financialData.push({ date: new Date(h.satisTarihi!), type: 'Gelir', category: 'Hayvan Satışı', amount: h.satisFiyati || 0 });
      });

      // Üreme gideri
      uremeKayitlari.filter(u => u.maliyet).forEach(u => {
        financialData.push({ date: new Date(u.tarih), type: 'Gider', category: 'Üreme Gideri', amount: u.maliyet! });
      });

      // Filter by date
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        financialData = financialData.filter(f => f.date >= start && f.date <= end);
      }

      financialData.sort((a, b) => b.date.getTime() - a.date.getTime());
      data = financialData.map(f => [
        f.date.toLocaleDateString('tr-TR'),
        f.category,
        f.type === 'Gelir' ? f.amount.toString() : '',
        f.type === 'Gider' ? f.amount.toString() : ''
      ]);
      title = 'Gelir Gider Analizi';
      break;
    }
    default:
      throw new Error("Geçersiz kategori");
  }

  if (data.length === 0) {
    throw new Error("Dışa aktarılacak veri bulunamadı.");
  }

  if (format === 'excel') {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Veri');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } else if (format === 'pdf') {
    const doc = new jsPDF();
    
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');

    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: {
        font: 'Roboto',
      },
      headStyles: {
        fontStyle: 'normal',
      }
    });
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }
};

export const downloadTemplate = (kategori: string) => {
  let headers: string[] = [];
  let title = '';

  switch (kategori) {
    case 'hayvanlar':
      headers = ['Küpe No', 'Tür', 'Irk', 'Doğum Tarihi', 'Cinsiyet', 'Ağırlık (kg)', 'Durum'];
      title = 'Hayvan Listesi Sablonu';
      break;
    case 'gruplar':
      headers = ['Grup Adı', 'Tür', 'Rasyon Adı'];
      title = 'Grup Yonetimi Sablonu';
      break;
    case 'yemler':
      headers = ['Yem Adı', 'Kategori', 'Stok (kg)', 'Birim Fiyat', 'KM (%)', 'ME', 'HP (%)', 'Ca (%)', 'P (%)'];
      title = 'Yem Deposu Sablonu';
      break;
    case 'buzagilar':
      headers = [
        'Küpe No', 'Doğum Şekli', 'Doğum Ağırlığı', 'Ağız Sütü Verildi', 'Kolostrum Miktarı (Lt)', 
        'Verilme Süresi (Saat)', 'Sütten Kesim Hedefi (kg)', 'Sütten Kesim Hedef Tarih',
        'Sütten Kesim Gerçekleşen Ağırlık (kg)', 'Sütten Kesim Gerçekleşen Tarih'
      ];
      title = 'Buzagi Listesi Sablonu';
      break;
    default:
      throw new Error("Bu kategori için şablon bulunamadı.");
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Şablon');
  XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
};
