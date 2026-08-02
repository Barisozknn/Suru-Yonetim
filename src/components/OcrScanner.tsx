import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Scan, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface OcrScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const OcrScanner: React.FC<OcrScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Arka kamerayı hedefler
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError('Kamera izni reddedildi veya bulunamadı.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Görüntüyü yüksek çözünürlükte almak için video boyutlarını kullanıyoruz
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (ctx) {
      // Görüntüyü canvas'a çiz
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      try {
        // Tesseract ile OCR işlemi
        const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
        
        console.log("OCR Sonucu:", text);

        // 'TR' veya 'tr' ile başlayan ve devamında sayılar/boşluklar olan yapıyı bul
        const match = text.match(/TR\s*\d+/i);
        if (match) {
           onScan(match[0].toUpperCase().replace(/\s+/g, '')); // TR 27 -> TR27 yapar (tercihen bitişik veya ayrı verebiliriz, standart olsun)
           onClose();
        } else {
           // TR bulamazsa en az 4 haneli düz bir sayı öbeği ara
           const numberMatch = text.match(/\d{4,}/);
           if (numberMatch) {
             onScan(numberMatch[0]);
             onClose();
           } else {
             alert('Küpe numarası net okunamadı. Lütfen yaklaşıp tekrar deneyin.');
           }
        }
      } catch (err) {
        console.error("OCR Hatası:", err);
        setError('Metin tanıma sırasında bir hata oluştu.');
      }
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col">
        <div className="p-4 bg-earth-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Scan className="w-5 h-5" />
            <h3 className="font-bold">Akıllı Küpe Okuyucu (OCR)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition" disabled={isScanning}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="relative aspect-square sm:aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-400 p-4 text-center font-medium">{error}</p>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[4px] border-nature-500/60 m-12 rounded-xl pointer-events-none flex flex-col items-center justify-center">
                 <div className="bg-nature-500/80 text-white px-3 py-1 rounded-full text-xs font-bold -mt-8">Küpeyi Buraya Hizalayın</div>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {isScanning && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-10">
              <Loader2 className="w-12 h-12 animate-spin mb-3 text-nature-500" />
              <p className="font-bold">Yapay Zeka Okuyor...</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-earth-50 dark:bg-gray-900 text-center">
          <p className="text-earth-600 dark:text-gray-400 text-sm mb-4">
            Kamerayı netleştirip küpe üzerindeki "TR..." yazısına odaklanın ve okut tuşuna basın.
          </p>
          <button 
            onClick={handleScan}
            disabled={isScanning || !!error}
            className="w-full py-4 bg-nature-600 text-white font-black rounded-xl hover:bg-nature-700 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2"
          >
            <Camera className="w-6 h-6" />
            {isScanning ? 'Okunuyor...' : 'Hemen Oku'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OcrScanner;
