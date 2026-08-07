import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Scan, Loader2, ZoomIn } from 'lucide-react';
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
  
  // Zoom yetenekleri için state
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const trackRef = useRef<MediaStreamTrack | null>(null);

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
          
          // Kamera track'ini al ve zoom desteğini kontrol et
          const track = stream.getVideoTracks()[0];
          trackRef.current = track;
          
          // Bazı tarayıcılarda getCapabilities asenkrondur veya desteklenmeyebilir
          if (track.getCapabilities) {
            const capabilities = track.getCapabilities() as any;
            if (capabilities.zoom) {
              setZoomSupported(true);
              setMinZoom(capabilities.zoom.min || 1);
              setMaxZoom(capabilities.zoom.max || 5);
              setZoom(capabilities.zoom.min || 1);
            }
          }
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

  // Zoom değiştiğinde kameraya uygula
  useEffect(() => {
    if (trackRef.current && zoomSupported) {
      try {
        trackRef.current.applyConstraints({
          advanced: [{ zoom: zoom }]
        } as any);
      } catch (e) {
        console.warn("Zoom constraint uygulanamadı:", e);
      }
    }
  }, [zoom, zoomSupported]);

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // 1. Hedef Alanı Belirleme (ROI - Region of Interest)
      // Ekranda ortadaki hedef kutusunun videodaki gerçek piksel karşılığını hesaplıyoruz.
      // Kutunun eni videonun %60'ı, boyu %35'i civarında olsun.
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Sadece küpenin olduğu alanı kesiyoruz
      const roiWidth = videoWidth * 0.6;
      const roiHeight = videoHeight * 0.35;
      const roiX = (videoWidth - roiWidth) / 2;
      const roiY = (videoHeight - roiHeight) / 2;

      // Canvas boyutunu hedef alana eşitliyoruz ki sadece o kısmı işlesin
      canvas.width = roiWidth;
      canvas.height = roiHeight;
      
      // 2. Kırpma İşlemi
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      // 3. Görüntü İyileştirme (Siyah-Beyaz ve Kontrast)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Grayscale çevrimi (Ağırlıklı yöntem)
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Kontrast artırma (Koyu olanları daha koyu, açık olanları daha açık yap)
        if (gray < 120) {
           gray = gray * 0.5; // Koyu kısımları koyult
        } else {
           gray = Math.min(255, gray * 1.5); // Açık kısımları daha açık yap
        }

        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg');
      
      try {
        // Tesseract ile OCR işlemi
        const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
        
        console.log("OCR Ham Sonucu:", text);

        // 4. Regex Geliştirmesi
        // TR, T R, 7R, TR- gibi okuma hatalarını yakalar
        const match = text.match(/(?:TR|T\s*R|7R)\s*-?\s*(\d+)/i);
        if (match) {
           const cleanedNumber = match[1]; // Sadece rakam kısmını al
           onScan(`TR${cleanedNumber}`);
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
        setError('Metin tanıma sırasında bir hata oluştu. İnternet bağlantınızı kontrol edin.');
      }
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-earth-900 border border-earth-700/50 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col">
        <div className="p-4 bg-earth-800/80 text-white flex justify-between items-center border-b border-earth-700/50">
          <div className="flex items-center space-x-2">
            <Scan className="w-5 h-5 text-nature-400" />
            <h3 className="font-bold">Akıllı Küpe Okuyucu</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition" disabled={isScanning}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative aspect-[3/4] sm:aspect-square bg-black flex flex-col items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-400 p-4 text-center font-medium bg-red-900/20 rounded-xl m-4">{error}</p>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-90" />
              
              {/* Ortadaki Odaklanma Çerçevesi */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-[60%] h-[35%] border-[3px] border-nature-400/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center">
                   <div className="absolute -top-10 bg-nature-500/90 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-lg">Küpeyi Buraya Hizalayın</div>
                   {/* Köşe belirteçleri */}
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg -mt-1 -ml-1"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-lg -mt-1 -mr-1"></div>
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-lg -mb-1 -ml-1"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg -mb-1 -mr-1"></div>
                 </div>
              </div>

              {/* Zoom Çubuğu */}
              {zoomSupported && (
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
              <p className="font-bold text-lg tracking-wide">Fotoğraf Analiz Ediliyor...</p>
              <p className="text-sm text-gray-400 mt-2">Bu işlem birkaç saniye sürebilir</p>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-earth-900 text-center border-t border-earth-700/50">
          <button 
            onClick={handleScan}
            disabled={isScanning || !!error}
            className="w-full py-4 bg-gradient-to-r from-nature-600 to-nature-500 text-white font-black text-lg rounded-2xl hover:from-nature-500 hover:to-nature-400 disabled:opacity-50 transition shadow-lg shadow-nature-900/50 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Camera className="w-6 h-6" />
            {isScanning ? 'Okunuyor...' : 'HEMEN OKU'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OcrScanner;
