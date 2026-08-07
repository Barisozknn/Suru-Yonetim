import ExcelJS from 'exceljs';
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
  let sheets: { name: string, headers: string[], data: any[][] }[] = [];
  let title = '';

  switch (kategori) {
    case 'hayvanlar': {
      let hayvanlar = await db.hayvanlar.toArray();
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate + 'T23:59:59');
        hayvanlar = hayvanlar.filter(h => {
          if (!h.dogumTarihi) return false;
          const dt = new Date(h.dogumTarihi);
          return dt >= start && dt <= end;
        });
      }
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
      let buzagilar = await db.hayvanlar.filter(h => h.tur === 'Buzağı').toArray();
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate + 'T23:59:59');
        buzagilar = buzagilar.filter(b => {
          if (!b.dogumTarihi) return false;
          const dt = new Date(b.dogumTarihi);
          return dt >= start && dt <= end;
        });
      }
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
      let targetAnimalIds = hayvanIds;
      if (!targetAnimalIds || targetAnimalIds.length === 0) {
        // Tüm sürü seçilmişse tüm hayvanların ID'lerini al
        const tumHayvanlar = await db.hayvanlar.toArray();
        targetAnimalIds = tumHayvanlar.map(h => h.id);
      }
      
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2099-12-31');

      headers = ['Küpe No', 'Tarih', 'Kayıt Türü', 'Değer'];
      const records: { t: Date, row: string[] }[] = [];

      for (const hId of targetAnimalIds) {
        const vh = await db.hayvanlar.get(hId);
        if (!vh) continue;

        const sutKayitlari = await db.sutKayitlari.where('hayvanId').equals(hId).toArray();
        const agirlikKayitlari = await db.agirlikKayitlari.where('hayvanId').equals(hId).toArray();

        // Filtrele ve ekle
        sutKayitlari.forEach(s => {
          const t = new Date(s.tarih);
          if (t >= start && t <= end) {
            records.push({ t, row: [vh.kupeNo, s.tarih, 'Süt', `${s.litre} Lt`] });
          }
        });

        agirlikKayitlari.forEach(a => {
          const t = new Date(a.tarih);
          if (t >= start && t <= end) {
            records.push({ t, row: [vh.kupeNo, a.tarih, 'Ağırlık', `${a.kg} kg`] });
          }
        });
      }

      if (records.length === 0) throw new Error("Seçilen kriterlere uygun verim kaydı bulunamadı.");

      records.sort((a, b) => b.t.getTime() - a.t.getTime());
      data = records.map(r => r.row);
      
      title = (!hayvanIds || hayvanIds.length === 0) 
        ? 'Tüm Sürü - Verim Geçmişi' 
        : hayvanIds.length === 1 ? `${data[0][0]} - Verim Geçmişi` : 'Çoklu Verim Geçmişi Dökümü';
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
        f.type === 'Gelir' ? f.amount : '',
        f.type === 'Gider' ? f.amount : ''
      ]);
      title = 'Gelir Gider Analizi';
      break;
    }
    case 'suruOzeti': {
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2099-12-31');

      const hayvanlar = await db.hayvanlar.toArray();
      const gruplar = await db.gruplar.toArray();
      const sutKayitlari = await db.sutKayitlari.toArray();
      const agirlikKayitlari = await db.agirlikKayitlari.toArray();
      const saglikOlaylari = await db.saglikOlaylari.toArray();

      // SAYFA 1: Genel Özet (Tarihten Bağımsız Genelde)
      const aktifHayvanlar = hayvanlar.filter(h => h.durum === 'Aktif');
      const inekler = aktifHayvanlar.filter(h => h.tur === 'İnek');
      const duveler = aktifHayvanlar.filter(h => h.tur === 'Düve');
      const danalar = aktifHayvanlar.filter(h => h.tur === 'Dana');
      const buzagilar = aktifHayvanlar.filter(h => h.tur === 'Buzağı');
      const bogalar = aktifHayvanlar.filter(h => h.tur === 'Boğa');

      sheets.push({
        name: 'Genel Özet',
        headers: ['Metrik', 'Değer'],
        data: [
          ['Toplam Aktif Hayvan', aktifHayvanlar.length],
          ['İnek Sayısı', inekler.length],
          ['Düve Sayısı', duveler.length],
          ['Dana Sayısı', danalar.length],
          ['Buzağı Sayısı', buzagilar.length],
          ['Boğa Sayısı', bogalar.length],
          ['Kayıtlı Grup Sayısı', gruplar.length]
        ]
      });

      // SAYFA 2: Süt ve Verimlilik (Tarih Filtreli)
      const filteredSut = sutKayitlari.filter(s => new Date(s.tarih) >= start && new Date(s.tarih) <= end);
      const sutByAnimal: Record<string, { total: number, count: number }> = {};
      let totalMilk = 0;
      filteredSut.forEach(s => {
        if (!sutByAnimal[s.hayvanId]) sutByAnimal[s.hayvanId] = { total: 0, count: 0 };
        sutByAnimal[s.hayvanId].total += s.litre;
        sutByAnimal[s.hayvanId].count += 1;
        totalMilk += s.litre;
      });

      const sutData = Object.entries(sutByAnimal)
        .map(([hId, stats]) => {
          const h = hayvanlar.find(x => x.id === hId);
          return [h?.kupeNo || 'Silinmiş', stats.total, stats.count, (stats.total / stats.count).toFixed(2)];
        })
        .sort((a, b) => Number(b[1]) - Number(a[1])); // Süt verimine göre sırala

      sutData.unshift(['GENEL TOPLAM', totalMilk, filteredSut.length, filteredSut.length ? (totalMilk / filteredSut.length).toFixed(2) : 0]);

      sheets.push({
        name: 'Süt Verimi',
        headers: ['Küpe No', 'Toplam Süt (Lt)', 'Sağım Sayısı', 'Ortalama (Lt)'],
        data: sutData
      });

      // SAYFA 3: Ağırlık Verimi (Tarih Filtreli)
      const filteredAgirlik = agirlikKayitlari.filter(a => new Date(a.tarih) >= start && new Date(a.tarih) <= end);
      const agirlikData = filteredAgirlik.map(a => {
        const h = hayvanlar.find(x => x.id === a.hayvanId);
        return [h?.kupeNo || 'Silinmiş', a.tarih, a.kg];
      }).sort((a, b) => new Date(b[1] as string).getTime() - new Date(a[1] as string).getTime());

      sheets.push({
        name: 'Ağırlık Kayıtları',
        headers: ['Küpe No', 'Tarih', 'Ölçülen Ağırlık (kg)'],
        data: agirlikData
      });

      // SAYFA 4: Sağlık (Tarih Filtreli)
      const filteredSaglik = saglikOlaylari.filter(s => new Date(s.tarih) >= start && new Date(s.tarih) <= end);
      const saglikData = filteredSaglik.map(s => {
        const h = hayvanlar.find(x => x.id === s.hayvanId);
        return [s.tarih, h?.kupeNo || 'Silinmiş', s.tur, s.aciklama, s.maliyet || 0];
      }).sort((a, b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

      sheets.push({
        name: 'Sağlık',
        headers: ['Tarih', 'Küpe No', 'İşlem Türü', 'Teşhis/Açıklama', 'Maliyet (TL)'],
        data: saglikData
      });

      title = 'Sürü Özeti Raporu';
      break;
    }
    case 'veterinerRaporu': {
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2099-12-31');
      
      const saglikOlaylari = await db.saglikOlaylari.toArray();
      const hayvanlar = await db.hayvanlar.toArray();
      const hayvanMap = new Map(hayvanlar.map(h => [h.id, h.kupeNo]));

      const filteredOlaylar = saglikOlaylari.filter(o => {
        const t = new Date(o.tarih);
        return t >= start && t <= end;
      });

      headers = ['Tarih', 'Küpe No', 'İşlem Türü', 'Teşhis/Açıklama', 'Uygulayan', 'Maliyet (TL)'];
      data = filteredOlaylar.map(o => [
        o.tarih,
        hayvanMap.get(o.hayvanId) || 'Bilinmiyor',
        o.tur,
        o.aciklama,
        o.detaylar?.veterinerHekim || '-',
        o.maliyet || 0
      ]).sort((a, b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

      title = 'Veteriner Raporu';
      if (data.length === 0) {
         data.push(['-', '-', 'Seçili kriterlerde sağlık kaydı bulunamadı', '-', '-', '-']);
      }
      break;
    }
    default:
      throw new Error("Geçersiz kategori");
  }

  if (sheets.length === 0 && data.length === 0) {
    throw new Error("Dışa aktarılacak veri bulunamadı.");
  }

  // Fallback for categories that don't use multi-sheet yet
  if (sheets.length === 0) {
    sheets.push({ name: 'Veri', headers, data });
  }

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    
    sheets.forEach((sheet) => {
      if (sheet.data.length === 0) return; // Skip empty sheets
      
      const worksheet = workbook.addWorksheet(sheet.name.substring(0, 31)); // Excel limit
      worksheet.addRow(sheet.headers);
      sheet.data.forEach(row => worksheet.addRow(row));

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' } // Indigo color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.columns.forEach(column => {
        let maxLen = 10;
        column.eachCell!({ includeEmpty: true }, cell => {
          const valLen = cell.value ? cell.value.toString().length : 0;
          if (valLen > maxLen) maxLen = valLen;
        });
        column.width = maxLen + 2;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  } else if (format === 'pdf') {
    const doc = new jsPDF();
    
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');

    let startY = 20;
    doc.text(title, 14, 15);
    
    const validSheets = sheets.filter(s => s.data.length > 0);
    
    validSheets.forEach((sheet, index) => {
      if (index > 0) {
        doc.addPage();
        startY = 20;
      } else {
        startY = 25;
      }
      
      if (validSheets.length > 1) {
        doc.setFontSize(12);
        doc.text(sheet.name, 14, startY);
        startY += 5;
      }
      
      autoTable(doc, {
        head: [sheet.headers],
        body: sheet.data,
        startY: startY,
        styles: {
          font: 'Roboto',
        },
        headStyles: {
          fontStyle: 'normal',
        }
      });
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

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Şablon');
  
  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' } // Green color
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  worksheet.columns.forEach(column => {
    let maxLen = 15;
    column.width = maxLen;
  });

  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/\s+/g, '_')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  });
};
