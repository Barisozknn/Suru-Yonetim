import * as XLSX from 'xlsx';
import { db } from '../lib/db';
import type { Hayvan, Grup, Yem } from '../types';

export const importData = async (file: File, kategori: string) => {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          throw new Error("Yüklenen dosya boş.");
        }

        let addedCount = 0;

        switch (kategori) {
          case 'hayvanlar': {
            const existingHayvanlar = await db.hayvanlar.toArray();
            const existingKupeNos = new Set(existingHayvanlar.map(h => h.kupeNo));

            for (const row of json) {
              const kupeNo = String(row['Küpe No'] || row['Kupe No'] || row['kupeNo'] || '').trim();
              if (!kupeNo) continue;

              if (existingKupeNos.has(kupeNo)) {
                continue; // Skip existing
              }

              const hayvan: Hayvan = {
                id: crypto.randomUUID(),
                kupeNo,
                tur: row['Tür'] || row['Tur'] || 'İnek',
                irk: row['Irk'] || 'Bilinmiyor',
                dogumTarihi: row['Doğum Tarihi'] || row['Dogum Tarihi'] || new Date().toISOString().split('T')[0],
                cinsiyet: row['Cinsiyet'] || 'Dişi',
                guncelAgirlikKg: Number(row['Ağırlık (kg)'] || row['Ağırlık'] || 0),
                durum: row['Durum'] || 'Aktif',
                grupId: null
              };
              await db.hayvanlar.add(hayvan);
              existingKupeNos.add(kupeNo);
              addedCount++;
            }
            break;
          }
          case 'gruplar': {
            const existingGruplar = await db.gruplar.toArray();
            const existingGrupNames = new Set(existingGruplar.map(g => g.ad));
            for (const row of json) {
              const ad = String(row['Grup Adı'] || row['ad'] || '').trim();
              if (!ad) continue;
              if (existingGrupNames.has(ad)) continue;

              const grup: Grup = {
                id: crypto.randomUUID(),
                ad,
                tur: row['Tür'] || row['Tur'] || 'Karma',
                rasyonAdi: row['Rasyon Adı'] || row['Rasyon Adi'] || undefined
              };
              await db.gruplar.add(grup);
              existingGrupNames.add(ad);
              addedCount++;
            }
            break;
          }
          case 'yemler': {
            const existingYemler = await db.yemler.toArray();
            const existingYemNames = new Set(existingYemler.map(y => y.ad));
            for (const row of json) {
              const ad = String(row['Yem Adı'] || row['Yem Adi'] || '').trim();
              if (!ad) continue;
              if (existingYemNames.has(ad)) continue;

              const yem: Yem = {
                id: crypto.randomUUID(),
                ad,
                tur: row['Kategori'] || 'Diğer',
                stokKg: Number(row['Stok (kg)'] || row['Stok'] || 0),
                birimFiyat: Number(row['Birim Fiyat'] || row['Fiyat'] || 0),
                minStokUyariKg: 100,
                kmYuzde: Number(row['KM (%)'] || row['KM'] || 0),
                meMcalKg: Number(row['ME'] || 0),
                hpYuzde: Number(row['HP (%)'] || row['HP'] || 0),
                caYuzde: Number(row['Ca (%)'] || row['Ca'] || 0),
                pYuzde: Number(row['P (%)'] || row['P'] || 0),
              };
              await db.yemler.add(yem);
              existingYemNames.add(ad);
              addedCount++;
            }
            break;
          }
          case 'buzagilar': {
            const mevcutHayvanlar = await db.hayvanlar.toArray();
            const mevcutBuzagiKayitlari = await db.buzagiKayitlari.toArray();
            
            for (const row of json) {
              const kupeNo = String(row['Küpe No'] || row['Kupe No'] || '').trim();
              if (!kupeNo) continue;

              let hayvan = mevcutHayvanlar.find(h => h.kupeNo === kupeNo);
              // Hayvan yoksa temel bilgilerle oluştur
              if (!hayvan) {
                hayvan = {
                  id: crypto.randomUUID(),
                  kupeNo,
                  tur: 'Buzağı',
                  irk: 'Bilinmiyor',
                  dogumTarihi: new Date().toISOString().split('T')[0],
                  cinsiyet: 'Dişi',
                  guncelAgirlikKg: Number(row['Doğum Ağırlığı'] || 0),
                  grupId: null,
                  durum: 'Aktif'
                };
                await db.hayvanlar.add(hayvan);
                mevcutHayvanlar.push(hayvan);
              }

              // Buzağı kaydı varsa atla, yoksa ekle
              const kayitVar = mevcutBuzagiKayitlari.some(bk => bk.hayvanId === hayvan!.id);
              if (kayitVar) continue;

              const agizSutu = String(row['Ağız Sütü Verildi'] || '').toLowerCase();
              const verildi = agizSutu === 'evet' || agizSutu === 'true' || agizSutu === '1';

              const dogumSekli = String(row['Doğum Şekli'] || '');
              let dogumDegerlendirmesi: any = undefined;
              if (['Sağlıklı', 'Güç Doğum', 'Ölü Doğum', 'Düşük'].includes(dogumSekli)) {
                dogumDegerlendirmesi = dogumSekli;
              }

              const yeniKayit: any = {
                id: crypto.randomUUID(),
                hayvanId: hayvan.id,
                dogumDegerlendirmesi,
                dogumAgirligiKg: Number(row['Doğum Ağırlığı'] || 0) || undefined,
                agizSutuVerildi: verildi,
                agizSutuMiktarLt: Number(row['Kolostrum Miktarı (Lt)'] || 0) || undefined,
                agizSutuSaatSonra: Number(row['Verilme Süresi (Saat)'] || 0) || undefined,
                hedefSuttenKesimAgirligiKg: Number(row['Sütten Kesim Hedefi (kg)'] || 0) || undefined,
                hedefSuttenKesimTarihi: row['Sütten Kesim Hedef Tarih'] || undefined,
                gerceklesenSuttenKesimAgirligiKg: Number(row['Sütten Kesim Gerçekleşen Ağırlık (kg)'] || 0) || undefined,
                gerceklesenSuttenKesimTarihi: row['Sütten Kesim Gerçekleşen Tarih'] || undefined
              };

              await db.buzagiKayitlari.add(yeniKayit);
              mevcutBuzagiKayitlari.push(yeniKayit);
              addedCount++;
            }
            break;
          }

          default:
            throw new Error("İçe aktarma bu kategori için desteklenmiyor.");
        }

        alert(`${addedCount} adet yeni kayıt başarıyla içeri aktarıldı. Çakışanlar atlandı.`);
        resolve();
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
