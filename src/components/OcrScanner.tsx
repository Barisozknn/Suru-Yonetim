import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Scan, Loader2, ZoomIn, QrCode, Type, ScanLine } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface OcrScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

type ScanMode = 'barcode' | 'ocr';

const OcrScanner: React.FC<OcrScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [mode, setMode] = useState<ScanMode>('barcode'); // Default to barcode
  
  // Zoom yetenekleri için state
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const zxingReader = useRef(new BrowserMultiFormatReader());

  // Bip sesi için basit bir AudioContext
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Ses çalınamadı", e);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
  };

  // Kamerayı başlatma (OCR modu için manuel, Barcode modu için zxing veya yine manuel)
  useEffect(() => {
    let isMounted = true;
    stopCamera();
    setError('');

    if (mode === 'barcode') {
       // ZXing ile sürekli tarama
       if (videoRef.current) {
           zxingReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
               if (isMounted && controls) {
                   zxingControlsRef.current = controls;
               }
               if (result && isMounted) {
                   playBeep();
                   const text = result.getText();
                   onScan(text);
                   if (controls) controls.stop();
                   onClose();
               }
           }).catch(e => {
               console.error(e);
               if (isMounted) setError('Kamera izni reddedildi veya arka kamera bulunamadı.');
           });
       }
    } else {
       // OCR Modu için manuel kamera açılışı
       const startCustomCamera = async () => {
         try {
           const stream = await navigator.mediaDevices.getUserMedia({
             video: { facingMode: 'environment' }
           });
           
           if (isMounted && videoRef.current) {
             videoRef.current.srcObject = stream;
             streamRef.current = stream;
             
             const track = stream.getVideoTracks()[0];
             trackRef.current = track;
             
             if (track.getCapabilities) {
               const capabilities = track.getCapabilities() as any;
               if (capabilities.zoom) {
                 setZoomSupported(true);
                 setMinZoom(capabilities.zoom.min || 1);
                 setMaxZoom(capabilities.zoom.max || 5);
                 setZoom(capabilities.zoom.min || 1);
               } else {
                 setZoomSupported(false);
               }
             }
           }
         } catch (err) {
           console.error(err);
           if (isMounted) setError('Kamera izni reddedildi veya bulunamadı.');
         }
       };
       startCustomCamera();
    }

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [mode]);

  // Zoom değiştiğinde kameraya uygula (Sadece OCR modunda çalışır, ZXing kamerasını yönetmiyoruz)
  useEffect(() => {
    if (mode === 'ocr' && trackRef.current && zoomSupported) {
      try {
        trackRef.current.applyConstraints({
          advanced: [{ zoom: zoom }]
        } as any);
      } catch (e) {
        console.warn("Zoom constraint uygulanamadı:", e);
      }
    }
  }, [zoom, zoomSupported, mode]);

  const handleOcrScan = async () => {
    if (mode !== 'ocr' || !videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      const roiWidth = videoWidth * 0.6;
      const roiHeight = videoHeight * 0.35;
      const roiX = (videoWidth - roiWidth) / 2;
      const roiY = (videoHeight - roiHeight) / 2;

      canvas.width = roiWidth;
      canvas.height = roiHeight;
      
      ctx.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        if (gray < 120) {
           gray = gray * 0.5;
        } else {
           gray = Math.min(255, gray * 1.5);
        }

        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg');
      
      try {
        const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
        console.log("OCR Ham Sonucu:", text);

        const match = text.match(/(?:TR|T\s*R|7R)\s*-?\s*(\d+)/i);
        if (match) {
           playBeep();
           const cleanedNumber = match[1];
           onScan(`TR${cleanedNumber}`);
           onClose();
        } else {
           const numberMatch = text.match(/\d{4,}/);
           if (numberMatch) {
             playBeep();
             onScan(numberMatch[0]);
             onClose();
           } else {
             alert('Küpe numarası net okunamadı. Lütfen yaklaşıp tekrar deneyin.');
           }
        }
      } catch (err) {
        console.error("OCR Hatası:", err);
        setError('Metin tanıma sırasında bir hata oluştu. İnternet bağlantınızı kontrol edin.');
      }
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-earth-900 border border-earth-700/50 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col">
        {/* Başlık ve Mod Değiştirici */}
        <div className="p-4 bg-earth-800/80 border-b border-earth-700/50 flex flex-col gap-4">
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center space-x-2">
              <Scan className="w-5 h-5 text-nature-400" />
              <h3 className="font-bold">Akıllı Küpe Okuyucu</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition" disabled={isScanning}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex bg-earth-900 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setMode('barcode')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                mode === 'barcode' 
                ? 'bg-nature-500 text-white shadow-md' 
                : 'text-earth-400 hover:text-white hover:bg-earth-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Barkod (Önerilen)
            </button>
            <button
              onClick={() => setMode('ocr')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                mode === 'ocr' 
                ? 'bg-nature-500 text-white shadow-md' 
                : 'text-earth-400 hover:text-white hover:bg-earth-800'
              }`}
            >
              <Type className="w-4 h-4" />
              Metin Oku
            </button>
          </div>
        </div>
        
        {/* Kamera Ekranı */}
        <div className="relative aspect-[3/4] sm:aspect-square bg-black flex flex-col items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-400 p-4 text-center font-medium bg-red-900/20 rounded-xl m-4">{error}</p>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />
              
              {/* Ortadaki Odaklanma Çerçevesi (Moda göre değişen) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className={`border-[3px] rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center transition-all duration-300 ${
                   mode === 'barcode' ? 'w-[75%] h-[25%] border-blue-400/80' : 'w-[60%] h-[35%] border-nature-400/80'
                 }`}>
                   <div className={`absolute -top-10 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-lg ${
                     mode === 'barcode' ? 'bg-blue-500/90' : 'bg-nature-500/90'
                   }`}>
                     {mode === 'barcode' ? 'Barkodu Çerçeveye Hizalayın' : 'Küpe No (TR) Kısmını Hizalayın'}
                   </div>
                   
                   {/* Köşe belirteçleri */}
                   <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg -mt-1 -ml-1"></div>
                   <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg -mt-1 -mr-1"></div>
                   <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg -mb-1 -ml-1"></div>
                   <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg -mb-1 -mr-1"></div>
                   
                   {/* Barkod lazer animasyonu */}
                   {mode === 'barcode' && (
                     <div className="absolute w-[90%] h-[2px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)] animate-[scan_2s_ease-in-out_infinite]"></div>
                   )}
                 </div>
              </div>

              {/* Zoom Çubuğu Sadece OCR'de kullanışlı */}
              {mode === 'ocr' && zoomSupported && (
                <div className="absolute bottom-8 left-0 right-0 px-8 flex items-center gap-3">
                  <ZoomIn className="w-5 h-5 text-white/70" />
                  <input 
                    type="range" 
                    min={minZoom} 
                    max={maxZoom} 
                    step="0.1" 
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-nature-500 bg-white/20 rounded-full h-2 appearance-none outline-none"
                  />
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {isScanning && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white backdrop-blur-sm z-10">
              <Loader2 className="w-14 h-14 animate-spin mb-4 text-nature-400" />
              <p className="font-bold text-lg tracking-wide">Analiz Ediliyor...</p>
              <p className="text-sm text-gray-400 mt-2">Lütfen bekleyin</p>
            </div>
          )}
        </div>
        
        {/* Alt Panel */}
        <div className="p-6 bg-earth-900 text-center border-t border-earth-700/50">
          {mode === 'barcode' ? (
             <div className="w-full py-4 bg-earth-800 text-earth-300 font-bold rounded-2xl flex items-center justify-center gap-3 border border-earth-700/50">
                <ScanLine className="w-6 h-6 animate-pulse text-blue-400" />
                Otomatik Tarama Aktif
             </div>
          ) : (
             <button 
               onClick={handleOcrScan}
               disabled={isScanning || !!error}
               className="w-full py-4 bg-gradient-to-r from-nature-600 to-nature-500 text-white font-black text-lg rounded-2xl hover:from-nature-500 hover:to-nature-400 disabled:opacity-50 transition shadow-lg shadow-nature-900/50 flex items-center justify-center gap-3 active:scale-[0.98]"
             >
               <Camera className="w-6 h-6" />
               {isScanning ? 'Okunuyor...' : 'HEMEN OKU'}
             </button>
          )}
        </div>
      </div>
      
      {/* Tailwind'de özel animasyon (scan) eklemek için bir stil etiketi kullanabiliriz veya CSS'e yazabiliriz. Burada satıriçi ekleyelim */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0.8; }
          50% { top: 90%; opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default OcrScanner;
