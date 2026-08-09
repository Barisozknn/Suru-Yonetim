import React, { useMemo } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { Activity, Percent, CheckCircle, Clock } from 'lucide-react';


const ReproductionKPI: React.FC = () => {
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];
  
  const stats = useMemo(() => {
    const tohumlamaKayitlari = uremeKayitlari.filter(k => k.tur === 'Tohumlama/Aşım' || k.tur === 'Doğal Aşım');
    const gebelikKontrolleri = uremeKayitlari.filter(k => k.tur === 'Gebelik Kontrolü' && k.durum === 'Gebe');
    const dogumlar = uremeKayitlari.filter(k => k.tur === 'Doğum');
    
    const toplamTohumlama = tohumlamaKayitlari.length;
    let basariliGebelikler = gebelikKontrolleri.length;

    // Doğum kaydı olup da öncesinde gebelik kontrolü (Gebe) girilmeyenleri de başarılı sayalım
    dogumlar.forEach(dogum => {
      const dogumTarihi = new Date(dogum.tarih).getTime();
      const oncesi300Gun = dogumTarihi - (300 * 24 * 60 * 60 * 1000); // Yaklaşık bir gebelik süresi toleransı
      
      const varMi = gebelikKontrolleri.some(gk => {
        if (gk.hayvanId !== dogum.hayvanId) return false;
        const gkDate = new Date(gk.tarih).getTime();
        return gkDate > oncesi300Gun && gkDate <= dogumTarihi;
      });

      if (!varMi) {
        basariliGebelikler++;
      }
    });
    
    // Conception Rate (CR)
    const conceptionRate = toplamTohumlama > 0 
      ? Math.round((basariliGebelikler / toplamTohumlama) * 100) 
      : 0;
      
    // Son 30 gündeki tohumlamalar
    const otuzGunOnce = new Date();
    otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);
    const son30GunTohumlama = tohumlamaKayitlari.filter(k => new Date(k.tarih) >= otuzGunOnce).length;
    
    // Son 30 gündeki doğumlar
    const son30GunDogum = uremeKayitlari.filter(k => k.tur === 'Doğum' && new Date(k.tarih) >= otuzGunOnce).length;

    return {
      toplamTohumlama,
      basariliGebelikler,
      conceptionRate,
      son30GunTohumlama,
      son30GunDogum
    };
  }, [uremeKayitlari]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4 text-blue-600 dark:text-blue-400">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-earth-500 dark:text-gray-400 font-bold uppercase">Toplam Tohumlama</p>
          <p className="text-xl font-black text-earth-900 dark:text-gray-100">{stats.toplamTohumlama}</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center">
        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mr-4 text-green-600 dark:text-green-400">
          <Percent className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-earth-500 dark:text-gray-400 font-bold uppercase">Tohumlama Başarısı (CR)</p>
          <p className="text-xl font-black text-earth-900 dark:text-gray-100">%{stats.conceptionRate}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center">
        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full mr-4 text-purple-600 dark:text-purple-400">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-earth-500 dark:text-gray-400 font-bold uppercase">Toplam Gebe (Kayıtlı)</p>
          <p className="text-xl font-black text-earth-900 dark:text-gray-100">{stats.basariliGebelikler}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center">
        <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full mr-4 text-orange-600 dark:text-orange-400">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-earth-500 dark:text-gray-400 font-bold uppercase">Son 30 Günlük Aktivite</p>
          <p className="text-sm font-bold text-earth-900 dark:text-gray-100">{stats.son30GunTohumlama} Tohum, {stats.son30GunDogum} Doğum</p>
        </div>
      </div>
    </div>
  );
};

export default ReproductionKPI;
