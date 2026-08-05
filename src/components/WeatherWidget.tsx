import React from 'react';
import { MapPin, Wind, Droplets, Thermometer, AlertCircle, RefreshCw, Sunrise, Sunset } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useWeather, getWeatherDescription, formatSunTime } from '../hooks/useWeather';
import { useNavigate } from 'react-router-dom';

const WeatherWidget: React.FC = () => {
  const navigate = useNavigate();
  const { konum } = useStore();
  const { data, loading, error } = useWeather(
    konum?.lat ?? null,
    konum?.lon ?? null
  );

  // Konum ayarlanmamış
  if (!konum) {
    return (
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 dark:bg-sky-900/40 rounded-xl text-sky-500">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-sky-700 dark:text-sky-300">Hava Durumu</p>
            <p className="text-xs text-sky-500 dark:text-sky-400">
              Hava durumunu görmek için konumunuzu ayarlayın
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/ayarlar')}
          className="shrink-0 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Konumu Ayarla
        </button>
      </div>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
        <div className="w-12 h-12 bg-white/20 rounded-xl" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/20 rounded" />
          <div className="h-7 w-24 bg-white/20 rounded" />
        </div>
        <div className="ml-auto flex items-center gap-2 text-white/70">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Yükleniyor…</span>
        </div>
      </div>
    );
  }

  // Hata
  if (error || !data) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
        <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-700 dark:text-red-300">Hava durumu alınamadı</p>
          <p className="text-xs text-red-500 dark:text-red-400">İnternet bağlantınızı kontrol edin</p>
        </div>
      </div>
    );
  }

  const { label, emoji } = getWeatherDescription(data.weathercode, data.isDay);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 dark:from-sky-600 dark:via-blue-700 dark:to-indigo-700 rounded-2xl p-5 shadow-lg">
      {/* Dekoratif blur daireler */}
      <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Sol: emoji + sıcaklık */}
        <div className="flex items-center gap-4">
          <div className="text-5xl leading-none select-none">{emoji}</div>
          <div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Hava Durumu</p>
            <p className="text-white text-4xl font-black leading-none">
              {data.temperature}°C
            </p>
            <p className="text-white/80 text-sm font-medium">{label}</p>
          </div>
        </div>

        {/* Sağ: detaylar */}
        <div className="sm:ml-auto flex flex-wrap gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5 text-white/90">
            <Thermometer className="w-4 h-4 text-white/70" />
            <span className="text-sm">Hissedilen <span className="font-bold">{data.feelsLike}°C</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <Droplets className="w-4 h-4 text-white/70" />
            <span className="text-sm">Nem <span className="font-bold">%{data.humidity}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <Wind className="w-4 h-4 text-white/70" />
            <span className="text-sm">Rüzgar <span className="font-bold">{data.windspeed} km/s</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <Sunrise className="w-4 h-4 text-yellow-200" />
            <span className="text-sm">Gün Doğumu <span className="font-bold">{formatSunTime(data.sunrise)}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <Sunset className="w-4 h-4 text-orange-200" />
            <span className="text-sm">Gün Batımı <span className="font-bold">{formatSunTime(data.sunset)}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <MapPin className="w-4 h-4 text-white/70" />
            <span className="text-sm font-bold">{konum.sehir}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
