import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Save, X, ImagePlus, UserCircle2 } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import OcrScanner from './OcrScanner';
import { v4 as uuidv4 } from 'uuid';
import { COMMON_DISEASES, normalizeDiseaseName } from '../constants/diseases';

export const STANDART_IRKLAR = [
  "Holstein", "Jersey", "Ayrshire", "Simmental", "Montofon", "Şarole", 
  "Angus", "Limuzin", "Hereford", "Belçika Mavisi", "Yerli Kara", 
  "Boz Irk", "Doğu Anadolu Kırmızısı", "Melez"
];

const parseInitialIrk = (irk: string | undefined) => {
  if (!irk) return { selectValue: '', digerValue: '', melezValue: '' };
  if (STANDART_IRKLAR.includes(irk)) return { selectValue: irk, digerValue: '', melezValue: '' };
  
  if (irk.startsWith('Melez (') && irk.endsWith(')')) {
    return { 
      selectValue: 'Melez', 
      digerValue: '', 
      melezValue: irk.slice(7, -1) 
    };
  }
  
  return { selectValue: 'Diğer', digerValue: irk, melezValue: '' };
};

const schema = z.object({
  kupeNo: z.string().min(3, 'Küpe numarası en az 3 karakter olmalıdır'),
  tur: z.enum(['İnek', 'Tosun', 'Boğa', 'Öküz', 'Düve', 'Dana', 'Buzağı']),
  irk: z.string().min(2, 'Irk bilgisi zorunludur'),
  dogumTarihi: z.string().optional(),
  ciftligeGelisTarihi: z.string().optional(),
  cinsiyet: z.enum(['Erkek', 'Dişi']),
  guncelAgirlikKg: z.number().min(0, 'Ağırlık 0\'dan küçük olamaz'),
  durum: z.enum(['Aktif', 'Satıldı', 'Öldü']),
  grupId: z.string().optional(),
  anneKupeNo: z.string().optional(),
  babaKupeNo: z.string().optional(),
  fotografUrl: z.string().optional(),
  notlar: z.string().optional(),
  kisirlastirildiMi: z.boolean().optional(),
  satisFiyati: z.number().or(z.nan()).optional(),
  satisTarihi: z.string().optional(),
  olumTarihi: z.string().optional(),
  olumNedeniTipi: z.enum(['Hastalık', 'Kaza / Travma', 'Zehirlenme', 'Güç Doğum', 'Yaşlılık', 'Diğer']).optional(),
  olumNedeniDetay: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AnimalFormProps {
  initialData?: FormData & { id: string };
  onClose: () => void;
  onSuccess: () => void;
}

const AnimalForm: React.FC<AnimalFormProps> = ({ initialData, onClose, onSuccess }) => {
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray());
  const [scannerTarget, setScannerTarget] = useState<'kupeNo' | 'anneKupeNo' | 'babaKupeNo' | null>(null);
  const [fotografOnizleme, setFotografOnizleme] = useState<string>(initialData?.fotografUrl || '');
  
  const initialIrkData = parseInitialIrk(initialData?.irk);
  const [digerIrk, setDigerIrk] = useState<string>(initialIrkData.digerValue);
  const [melezDetay, setMelezDetay] = useState<string>(initialIrkData.melezValue);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFotografSec = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setFotografOnizleme(base64);
      setValue('fotografUrl', base64);
    };
    reader.readAsDataURL(file);
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData ? {
      ...initialData,
      irk: initialIrkData.selectValue
    } : {
      tur: 'İnek',
      cinsiyet: 'Dişi',
      durum: 'Aktif',
      grupId: '',
      guncelAgirlikKg: 0,
      dogumTarihi: new Date().toISOString().split('T')[0],
      ciftligeGelisTarihi: new Date().toISOString().split('T')[0]
    }
  });

  // Ensure initialData.grupId is mapped correctly when form resets or initializes
  React.useEffect(() => {
    if (initialData) {
      setValue('grupId', initialData.grupId || '');
    }
  }, [initialData, setValue]);

  const currentCinsiyet = watch('cinsiyet');
  const currentTur = watch('tur');
  const currentDurum = watch('durum');
  
  const [olumTarihi, setOlumTarihi] = useState(initialData?.olumTarihi || new Date().toISOString().split('T')[0]);
  const [olumNedeniTipi, setOlumNedeniTipi] = useState<'Hastalık' | 'Kaza / Travma' | 'Zehirlenme' | 'Güç Doğum' | 'Yaşlılık' | 'Diğer'>(initialData?.olumNedeniTipi || 'Hastalık');
  const [olumNedeniDetay, setOlumNedeniDetay] = useState(initialData?.olumNedeniDetay || '');
  const [showHastalikDropdown, setShowHastalikDropdown] = useState(false);

  React.useEffect(() => {
    if (['İnek', 'Düve'].includes(currentTur)) {
      setValue('cinsiyet', 'Dişi');
    } else if (['Tosun', 'Boğa', 'Öküz'].includes(currentTur)) {
      setValue('cinsiyet', 'Erkek');
    }
  }, [currentTur, setValue]);

  if (!gruplar) return null; // Wait for groups to load so that select options are populated before form initialization

  const isCinsiyetLocked = ['İnek', 'Düve', 'Tosun', 'Boğa', 'Öküz'].includes(currentTur);

  const onSubmit = async (data: FormData) => {
    try {
      if (data.irk === 'Diğer') {
        if (!digerIrk || digerIrk.length < 2) {
          alert('Lütfen diğer ırk adını en az 2 karakter olacak şekilde giriniz.');
          return;
        }
        data.irk = digerIrk;
      } else if (data.irk === 'Melez' && melezDetay.trim().length > 0) {
        data.irk = `Melez (${melezDetay.trim()})`;
      }

      const isUpdate = !!initialData;
      const id = isUpdate ? initialData.id : uuidv4();
      
      // Yaşa göre akıllı tür ataması
      if (data.dogumTarihi) {
        const { calculateAgeInDays } = await import('../utils/calfCalculations');
        const ageDays = calculateAgeInDays(data.dogumTarihi);
        
        if (ageDays <= 180) {
          data.tur = 'Buzağı';
        } else if (ageDays > 180 && ageDays <= 365) {
          data.tur = 'Dana';
        } else if (ageDays > 365) {
          if (data.cinsiyet === 'Erkek') {
             data.tur = 'Boğa';
          } else {
             // Dişi ise Düve veya İnek (kullanıcı İnek seçtiyse saygı duy)
             data.tur = data.tur === 'İnek' ? 'İnek' : 'Düve';
          }
        }
      }

      if (data.durum === 'Satıldı' || data.durum === 'Öldü') {
        data.grupId = null as any; // Clear group if dead or sold
      } else if (!data.grupId) {
        data.grupId = null as any;
      }

      if (data.durum === 'Satıldı') {
        if (!data.satisTarihi) {
          data.satisTarihi = new Date().toISOString().split('T')[0];
        }
        if (isNaN(data.satisFiyati as any) || !data.satisFiyati) {
          data.satisFiyati = 0;
        }
      } else {
        data.satisTarihi = undefined;
        data.satisFiyati = undefined;
      }

      if (data.durum === 'Öldü') {
        data.olumTarihi = olumTarihi;
        data.olumNedeniTipi = olumNedeniTipi;
        data.olumNedeniDetay = olumNedeniTipi === 'Hastalık' && olumNedeniDetay.trim() 
          ? normalizeDiseaseName(olumNedeniDetay) 
          : olumNedeniDetay;
      } else {
        data.olumTarihi = undefined;
        data.olumNedeniTipi = undefined;
        data.olumNedeniDetay = undefined;
      }

      const payload = {
        ...(isUpdate ? initialData : {}),
        ...data,
        id,
      };

      if (isUpdate) {
        await db.hayvanlar.put(payload as any);
        await db.syncQueue.add({
          table: 'hayvanlar',
          action: 'UPDATE',
          payload,
          created_at: Date.now()
        });
      } else {
        await db.hayvanlar.add(payload as any);
        await db.syncQueue.add({
          table: 'hayvanlar',
          action: 'INSERT',
          payload,
          created_at: Date.now()
        });
      }

      if (navigator.onLine) {
        const { processSyncQueue } = await import('../services/syncService');
        processSyncQueue();
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Kayıt sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-earth-900/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-nature-50 dark:bg-nature-900/30 rounded-t-2xl flex-shrink-0">
          <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">
            {initialData ? 'Hayvanı Düzenle' : 'Yeni Hayvan Ekle'}
          </h2>
          <button type="button" onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Küpe Numarası *</label>
              <div className="flex space-x-2">
                <input 
                  {...register('kupeNo')} 
                  className="flex-1 p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500"
                  placeholder="TR-..."
                />
                <button type="button" onClick={() => setScannerTarget('kupeNo')} className="p-2 bg-nature-100 dark:bg-nature-900/50 text-nature-700 dark:text-nature-300 rounded-lg hover:bg-nature-200">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              {errors.kupeNo && <p className="text-xs text-red-500">{errors.kupeNo.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Irk *</label>
              <select 
                {...register('irk')} 
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-800"
              >
                <option value="">Irk Seçiniz...</option>
                <optgroup label="Sütçü Irklar">
                  <option value="Holstein">Holstein</option>
                  <option value="Jersey">Jersey</option>
                  <option value="Ayrshire">Ayrshire</option>
                </optgroup>
                <optgroup label="Kombine (Süt ve Et) Irklar">
                  <option value="Simmental">Simmental</option>
                  <option value="Montofon">Montofon (Brown Swiss)</option>
                  <option value="Şarole">Şarole</option>
                </optgroup>
                <optgroup label="Etçi Irklar">
                  <option value="Angus">Angus</option>
                  <option value="Limuzin">Limuzin</option>
                  <option value="Hereford">Hereford</option>
                  <option value="Belçika Mavisi">Belçika Mavisi</option>
                </optgroup>
                <optgroup label="Yerli & Diğer">
                  <option value="Yerli Kara">Yerli Kara</option>
                  <option value="Boz Irk">Boz Irk</option>
                  <option value="Doğu Anadolu Kırmızısı">Doğu Anadolu Kırmızısı</option>
                  <option value="Melez">Melez (Çapraz)</option>
                  <option value="Diğer">Diğer</option>
                </optgroup>
              </select>
              {errors.irk && <p className="text-xs text-red-500">{errors.irk.message}</p>}
              
              {watch('irk') === 'Diğer' && (
                <div className="mt-2">
                  <input 
                    type="text"
                    value={digerIrk}
                    onChange={(e) => setDigerIrk(e.target.value)}
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500"
                    placeholder="Lütfen ırk adını yazınız..."
                  />
                </div>
              )}
              
              {watch('irk') === 'Melez' && (
                <div className="mt-2">
                  <input 
                    type="text"
                    value={melezDetay}
                    onChange={(e) => setMelezDetay(e.target.value)}
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500"
                    placeholder="Hangi ırkların melezi? (Opsiyonel)"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Tür</label>
              <select {...register('tur')} className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg">
                <option value="İnek">İnek (Doğurmuş Dişi)</option>
                <option value="Tosun">Tosun (1-2 Yaşında Damızlıkta Kullanılmamış Erkek)</option>
                <option value="Boğa">Boğa (Damızlıkta Kullanılmış Erkek)</option>
                <option value="Öküz">Öküz (2+ Yaş Kısır Erkek)</option>
                <option value="Düve">Düve (1+ Yaş Doğurmamış Dişi)</option>
                <option value="Dana">Dana (6-12 Aylık Dişi/Erkek)</option>
                <option value="Buzağı">Buzağı (0-6 Aylık Dişi/Erkek)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Cinsiyet</label>
              <select 
                {...register('cinsiyet')} 
                disabled={isCinsiyetLocked}
                className={`w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg ${isCinsiyetLocked ? 'bg-earth-100 dark:bg-gray-800 opacity-70 cursor-not-allowed' : ''}`}
              >
                <option value="Dişi">Dişi</option>
                <option value="Erkek">Erkek</option>
              </select>
              {isCinsiyetLocked && (
                <p className="text-xs text-earth-500 dark:text-gray-400 mt-1">Bu tür için cinsiyet otomatiktir.</p>
              )}
            </div>

            {currentCinsiyet === 'Erkek' && (
              <div className="space-y-1 flex items-center mt-6">
                <input 
                  type="checkbox" 
                  {...register('kisirlastirildiMi')} 
                  id="kisirlastirildiMi"
                  className="w-4 h-4 text-nature-600 dark:text-nature-400 border-earth-300 dark:border-gray-600 rounded focus:ring-nature-500"
                />
                <label htmlFor="kisirlastirildiMi" className="ml-2 text-sm font-semibold text-earth-700 dark:text-gray-300">
                  Kısırlaştırılmış (Öküz adayı)
                </label>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Grup</label>
              <select {...register('grupId')} className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg">
                <option value="">Grup Yok</option>
                {gruplar.map(g => (
                  <option key={g.id} value={g.id}>{g.ad}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Durum</label>
              <select {...register('durum')} className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg">
                <option value="Aktif">Aktif</option>
                <option value="Satıldı">Satıldı</option>
                <option value="Öldü">Öldü</option>
              </select>
            </div>

            {currentDurum === 'Satıldı' && (
              <div className="col-span-1 md:col-span-2 space-y-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30 mt-2">
                <h4 className="font-bold text-blue-800 dark:text-blue-400">Satış Kayıt Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">Satış Fiyatı (₺)</label>
                    <input 
                      type="number" 
                      {...register('satisFiyati', { valueAsNumber: true })} 
                      className="w-full p-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">Satış Tarihi</label>
                    <input 
                      type="date" 
                      {...register('satisTarihi')} 
                      className="w-full p-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentDurum === 'Öldü' && (
              <div className="col-span-1 md:col-span-2 space-y-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800/30 mt-2">
                <h4 className="font-bold text-red-800 dark:text-red-400">Ölüm Kayıt Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-red-700 dark:text-red-300">Ölüm Tarihi</label>
                    <input 
                      type="date" 
                      value={olumTarihi}
                      onChange={e => setOlumTarihi(e.target.value)}
                      className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-red-700 dark:text-red-300">Ölüm Nedeni Tipi</label>
                    <select 
                      value={olumNedeniTipi}
                      onChange={e => {
                        setOlumNedeniTipi(e.target.value as any);
                        setOlumNedeniDetay('');
                      }}
                      className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                    >
                      <option value="Hastalık">Hastalık</option>
                      <option value="Kaza / Travma">Kaza / Travma</option>
                      <option value="Zehirlenme">Zehirlenme</option>
                      <option value="Güç Doğum">Güç Doğum</option>
                      <option value="Yaşlılık">Yaşlılık</option>
                      <option value="Diğer">Diğer Nedenler</option>
                    </select>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {olumNedeniTipi === 'Hastalık' ? 'Hastalık Adı' : 'Nedeni Belirtin'}
                    </label>
                    {olumNedeniTipi === 'Hastalık' ? (
                      <div>
                        <input 
                          type="text" 
                          value={olumNedeniDetay}
                          onChange={e => {
                            setOlumNedeniDetay(e.target.value);
                            setShowHastalikDropdown(true);
                          }}
                          onFocus={() => setShowHastalikDropdown(true)}
                          onBlur={() => setTimeout(() => setShowHastalikDropdown(false), 200)}
                          placeholder="Örn: Ketozis (Seçin/Yazın)"
                          className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                        />
                        {showHastalikDropdown && (
                          <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {COMMON_DISEASES.filter(d => d.toLocaleLowerCase('tr-TR').includes(olumNedeniDetay.toLocaleLowerCase('tr-TR'))).map(d => (
                              <li 
                                key={d} 
                                onMouseDown={() => { setOlumNedeniDetay(d); setShowHastalikDropdown(false); }}
                                className="px-3 py-2 text-sm text-earth-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                              >
                                {d}
                              </li>
                            ))}
                            {olumNedeniDetay && !COMMON_DISEASES.some(d => d.toLocaleLowerCase('tr-TR') === olumNedeniDetay.toLocaleLowerCase('tr-TR')) && (
                              <li 
                                onMouseDown={() => setShowHastalikDropdown(false)}
                                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 italic bg-red-50/50 dark:bg-red-900/10 cursor-pointer"
                              >
                                "{olumNedeniDetay}" olarak kaydet
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={olumNedeniDetay}
                        onChange={e => setOlumNedeniDetay(e.target.value)}
                        placeholder="Örn: Boğulma, Kaza vb."
                        className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Güncel Ağırlık (kg)</label>
              <input 
                type="number" 
                {...register('guncelAgirlikKg', { valueAsNumber: true })} 
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500"
              />
              {errors.guncelAgirlikKg && <p className="text-xs text-red-500">{errors.guncelAgirlikKg.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Doğum Tarihi</label>
              <input 
                type="date" 
                {...register('dogumTarihi')} 
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Çiftliğe Geliş Tarihi</label>
              <input 
                type="date" 
                {...register('ciftligeGelisTarihi')} 
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-earth-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-earth-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Soy Ağacı Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Anne Küpe No</label>
                <div className="flex space-x-2">
                  <input 
                    {...register('anneKupeNo')} 
                    className="flex-1 p-2 border border-earth-300 dark:border-gray-600 rounded-lg"
                  />
                  <button type="button" onClick={() => setScannerTarget('anneKupeNo')} className="p-2 bg-nature-100 dark:bg-nature-900/50 text-nature-700 dark:text-nature-300 rounded-lg hover:bg-nature-200">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-earth-700 dark:text-gray-300">Baba Küpe No / Boğa Kodu</label>
                <div className="flex space-x-2">
                  <input 
                    placeholder="Küpe No veya Boğa Kodu"
                    {...register('babaKupeNo')} 
                    className="flex-1 p-2 border border-earth-300 dark:border-gray-600 rounded-lg placeholder:text-sm placeholder:text-earth-400"
                  />
                  <button type="button" onClick={() => setScannerTarget('babaKupeNo')} className="p-2 bg-nature-100 dark:bg-nature-900/50 text-nature-700 dark:text-nature-300 rounded-lg hover:bg-nature-200">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fotoğraf Yükleme */}
          <div className="pt-4 border-t border-earth-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-earth-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Hayvan Fotoğrafı (Opsiyonel)</h3>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-earth-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-earth-50 dark:bg-gray-900 flex-shrink-0">
                {fotografOnizleme ? (
                  <img src={fotografOnizleme} alt="Önizleme" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 className="w-12 h-12 text-earth-300" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-full space-x-2 px-4 py-2 bg-earth-100 dark:bg-gray-800 text-earth-700 dark:text-gray-300 rounded-lg hover:bg-earth-200 font-semibold transition"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>Fotoğraf Seç</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center w-full space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 border border-blue-200 dark:border-blue-800/50 font-semibold transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Fotoğraf Çek</span>
                </button>
                {fotografOnizleme && (
                  <button type="button" onClick={() => { setFotografOnizleme(''); setValue('fotografUrl', ''); }} className="text-xs text-red-500 hover:underline w-full text-center">
                    Fotoğrafı Kaldır
                  </button>
                )}
                <p className="text-xs text-earth-400 text-center">JPG, PNG — Cihazdan veya Kameradan</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotografSec} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotografSec} />
              </div>
            </div>
            </div>
          </div>

          <div className="p-6 border-t border-earth-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end space-x-3 flex-shrink-0 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-5 py-2 text-earth-600 dark:text-gray-400 font-semibold hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg">İptal</button>
            <button type="submit" className="px-5 py-2 bg-nature-600 text-white font-bold rounded-lg flex items-center space-x-2 hover:bg-nature-700 shadow-sm">
              <Save className="w-5 h-5" />
              <span>Kaydet</span>
            </button>
          </div>
        </form>
      </div>

      {scannerTarget && (
        <OcrScanner 
          onScan={(res) => {
            setValue(scannerTarget, res);
          }}
          onClose={() => setScannerTarget(null)}
        />
      )}
    </div>
  );
};

export default AnimalForm;
