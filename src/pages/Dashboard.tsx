import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { 
  Users, Activity, AlertTriangle, TrendingDown, Heart,
  CalendarCheck, Syringe, Droplets
} from 'lucide-react';
import { CalfIcon } from '../components/icons/CalfIcon';
import { 
  calculateTotalAnimals, 
  calculateSpeciesDistribution, 
  calculateAverageMilkYield7Days, 
  getActiveHealthAlertsCount, 
  getExpectedBirths30DaysCount,
  getUpcomingBirths,
  calculateEstimatedFeedCostPerLiter,
  calculateTotalDailyFeedCost,
  getUpcomingHeatChecks,
  getUpcomingReInseminations
} from '../utils/dashboardCalculations';
import { Link } from 'react-router-dom';
import { SmartCalendar } from '../components/SmartCalendar';
import { useStore } from '../store/useStore';

const Dashboard: React.FC = () => {
  const hayvanlar = useLiveQuery(() => db.hayvanlar.toArray()) || [];
  const sutKayitlari = useLiveQuery(() => db.sutKayitlari.toArray()) || [];
  const asilar = useLiveQuery(() => db.planlananAsilar.toArray()) || [];
  const uremeKayitlari = useLiveQuery(() => db.uremeKayitlari.toArray()) || [];
  const yemler = useLiveQuery(() => db.yemler.toArray()) || [];
  const gruplar = useLiveQuery(() => db.gruplar.toArray()) || [];
  const { uremeAyarlari } = useStore();

  const totalAnimals = calculateTotalAnimals(hayvanlar);
  const speciesDist = calculateSpeciesDistribution(hayvanlar);
  const avgMilk = calculateAverageMilkYield7Days(sutKayitlari);
  const activeAlerts = getActiveHealthAlertsCount(asilar, hayvanlar);
  const expectedBirths = getExpectedBirths30DaysCount(uremeKayitlari);
  const heatChecks = getUpcomingHeatChecks(uremeKayitlari);
  const reInseminations = getUpcomingReInseminations(uremeKayitlari);
  const feedCost = calculateEstimatedFeedCostPerLiter(yemler, gruplar, sutKayitlari, hayvanlar);
  const totalFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);

  const today = new Date();
  today.setHours(0,0,0,0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  const gecikmisAsilar = asilar.filter(a => !a.yapildiMi && new Date(a.planlanaTarih) < today).slice(0, 3);
  
  const yaklasanDogumlar = getUpcomingBirths(uremeKayitlari, 30).slice(0, 3);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">

      <div>
        <h1 className="text-3xl font-black text-earth-900 tracking-tight">Anasayfa</h1>
          <p className="text-earth-500 font-medium mt-1">Sürünüzün genel durum özeti</p>
        </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className="p-4 bg-earth-100 text-earth-600 rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">Toplam Hayvan</p>
            <p className="text-3xl font-black text-earth-900">{totalAnimals}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">İnek Başı Ort. Süt (Son 7 Gün)</p>
            <p className="text-3xl font-black text-earth-900">{avgMilk.toFixed(1)} <span className="text-base">Lt/Gün</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className={`p-4 rounded-xl ${activeAlerts > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">Sağlık / Aşı Uyarısı</p>
            <p className={`text-3xl font-black ${activeAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>{activeAlerts}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className="p-4 bg-pink-100 text-pink-600 rounded-xl">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">Yaklaşan Doğumlar</p>
            <p className="text-3xl font-black text-earth-900">{expectedBirths} <span className="text-base font-normal text-earth-500">(30 Gün)</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sol Kolon: Maliyet ve Tür Dağılımı */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-nature-600 to-nature-800 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
            <TrendingDown className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10" />
            <h3 className="text-lg font-bold text-nature-100 mb-1">Süt Yem Maliyeti</h3>
            <p className="text-sm text-nature-200 mb-4">Sütçü Rasyonu (Litre Başına)</p>
            
            {feedCost.isValid ? (
              <div className="flex items-end space-x-2">
                <span className="text-5xl font-black">{feedCost.cost.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                <span className="text-lg font-medium text-nature-200 mb-1">/ Lt</span>
              </div>
            ) : (
              <p className="text-nature-100 italic bg-nature-900/30 p-3 rounded-lg text-sm">Hesaplama için süt verimi ve Sütçü Rasyonu atanan gruplara ihtiyaç var.</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
            <TrendingDown className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10" />
            <h3 className="text-lg font-bold text-orange-100 mb-1">Sürü Günlük Yem Gideri</h3>
            <p className="text-sm text-orange-200 mb-4">Tüm Rasyonların Toplamı</p>
            
            {totalFeedCost > 0 ? (
              <div className="flex items-end space-x-2">
                <span className="text-5xl font-black">{totalFeedCost.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                <span className="text-lg font-medium text-orange-200 mb-1">/ Gün</span>
              </div>
            ) : (
              <p className="text-orange-100 italic bg-orange-900/30 p-3 rounded-lg text-sm">Gider hesabı için gruplara rasyon atamalısınız.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200">
            <h3 className="text-lg font-bold text-earth-900 mb-4">Tür Dağılımı</h3>
            {speciesDist.length > 0 ? (
              <div className="space-y-3">
                {speciesDist.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-earth-600 font-bold">{s.name}</span>
                    <span className="bg-earth-100 text-earth-800 px-3 py-1 rounded-full text-sm font-black">{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-6">
                <div className="bg-nature-100 p-3 rounded-full text-nature-600 mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-earth-900 font-bold mb-1">Sürünüz Henüz Boş</p>
                <p className="text-earth-500 text-sm mb-4">Analizleri görmek için ilk hayvanınızı ekleyin.</p>
                <Link to="/hayvanlar" className="bg-nature-600 hover:bg-nature-700 text-white px-4 py-2 rounded-lg font-bold transition text-sm">
                  Hayvan Ekle
                </Link>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-earth-100">
              <Link to="/hayvanlar" className="text-nature-600 font-bold text-sm hover:underline">Hayvan Listesine Git &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Bugün Yapılacaklar (To-Do) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-earth-900">Bugün Yapılacaklar</h3>
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{activeAlerts} İşlem Bekliyor</span>
          </div>

          <div className="flex-1 space-y-4">
            {activeAlerts === 0 && expectedBirths === 0 && heatChecks.length === 0 && reInseminations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-earth-400 space-y-3 py-12">
                <CalendarCheck className="w-16 h-16 opacity-50" />
                <p className="font-bold text-lg">Bugün için planlanan acil bir işlem yok.</p>
              </div>
            ) : (
              <>
                {activeAlerts > 0 && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white p-2 rounded-lg"><Syringe className="w-5 h-5 text-red-600" /></div>
                      <div>
                        <p className="font-bold text-red-900">Aşı ve Sağlık Uyarıları Mevcut</p>
                        <p className="text-sm text-red-700">Gecikmiş aşıları kontrol et.</p>
                      </div>
                    </div>
                    {gecikmisAsilar.length > 0 && (
                      <div className="space-y-2 mt-3 pl-12">
                        {gecikmisAsilar.map(asi => {
                           const h = hayvanlar.find(x => x.id === asi.hayvanId);
                           return (
                             <div key={asi.id} className="text-sm flex justify-between bg-white/60 p-2 rounded-md border border-red-100">
                               <span className="font-bold text-red-800">{h?.kupeNo || 'Bilinmeyen'}</span>
                               <span className="text-red-600 truncate ml-2">{asi.asiAd}</span>
                             </div>
                           )
                        })}
                      </div>
                    )}
                    <Link to="/saglik" className="mt-3 ml-12 inline-block text-red-600 font-bold text-sm hover:underline">Tümünü Gör &rarr;</Link>
                  </div>
                )}

                {expectedBirths > 0 && (
                  <div className="bg-pink-50 border border-pink-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white p-2 rounded-lg"><CalfIcon className="w-5 h-5 text-pink-600" /></div>
                      <div>
                        <p className="font-bold text-pink-900">Yaklaşan ve Geciken Doğumlar</p>
                        <p className="text-sm text-pink-700">Yaklaşan veya tarihi geçmiş {expectedBirths} doğum var.</p>
                      </div>
                    </div>
                    {yaklasanDogumlar.length > 0 && (
                      <div className="space-y-2 mt-3 pl-12">
                        {yaklasanDogumlar.map((dogum, idx) => {
                           const h = hayvanlar.find(x => x.id === dogum.hayvanId);
                           const isOverdue = dogum.dogumTarihi < new Date(new Date().setHours(0,0,0,0));
                           return (
                             <div key={idx} className={`text-sm flex justify-between p-2 rounded-md border ${isOverdue ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white/60 border-pink-100'}`}>
                               <span className={`font-bold ${isOverdue ? 'text-red-800' : 'text-pink-800'}`}>{h?.kupeNo || 'Bilinmeyen'}</span>
                               <span className={isOverdue ? 'text-red-600 font-bold' : 'text-pink-600'}>
                                 {dogum.dogumTarihi.toLocaleDateString('tr-TR')} {isOverdue && '(Gecikti)'}
                               </span>
                             </div>
                           )
                        })}
                      </div>
                    )}
                    <Link to="/ureme" className="mt-3 ml-12 inline-block text-pink-600 font-bold text-sm hover:underline">Üreme Takvimine Git &rarr;</Link>
                  </div>
                )}

                {heatChecks.length > 0 && (
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white p-2 rounded-lg"><Heart className="w-5 h-5 text-purple-600" /></div>
                      <div>
                        <p className="font-bold text-purple-900">Kızgınlık Beklentisi</p>
                        <p className="text-sm text-purple-700">Tohumlama/Boş sonrası {uremeAyarlari.kizginlikDongusu} gün döngüsü</p>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3 pl-12">
                      {heatChecks.slice(0, 3).map((item, idx) => {
                         const h = hayvanlar.find(x => x.id === item.hayvanId);
                         return (
                           <div key={idx} className="text-sm flex justify-between bg-white/60 p-2 rounded-md border border-purple-100">
                             <span className="font-bold text-purple-800">{h?.kupeNo || 'Bilinmeyen'}</span>
                             <span className="text-purple-600 truncate ml-2">Yaklaşık: {item.date.toLocaleDateString('tr-TR')}</span>
                           </div>
                         )
                      })}
                    </div>
                    <Link to="/ureme" className="mt-3 ml-12 inline-block text-purple-600 font-bold text-sm hover:underline">Üreme Takvimine Git &rarr;</Link>
                  </div>
                )}

                {reInseminations.length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white p-2 rounded-lg"><CalendarCheck className="w-5 h-5 text-orange-600" /></div>
                      <div>
                        <p className="font-bold text-orange-900">Yeniden Tohumlama (Doğum Sonrası)</p>
                        <p className="text-sm text-orange-700">Doğum üzerinden {uremeAyarlari.yenidenTohumlamaUyarisi} gün geçenler</p>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3 pl-12">
                      {reInseminations.slice(0, 3).map((item, idx) => {
                         const h = hayvanlar.find(x => x.id === item.hayvanId);
                         return (
                           <div key={idx} className="text-sm flex justify-between bg-white/60 p-2 rounded-md border border-orange-100">
                             <span className="font-bold text-orange-800">{h?.kupeNo || 'Bilinmeyen'}</span>
                             <span className="text-orange-600 truncate ml-2">Hazır: {item.date.toLocaleDateString('tr-TR')}</span>
                           </div>
                         )
                      })}
                    </div>
                    <Link to="/ureme" className="mt-3 ml-12 inline-block text-orange-600 font-bold text-sm hover:underline">Üreme Takvimine Git &rarr;</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Akıllı Takvim Paneli */}
      <div className="mt-8">
        <SmartCalendar />
      </div>

    </div>
  );
};

export default Dashboard;
