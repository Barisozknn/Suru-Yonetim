import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let isComponentMounted = true;

    codeReader.listVideoInputDevices()
      .then((videoInputDevices) => {
        if (!isComponentMounted) return;
        
        if (videoInputDevices.length === 0) {
          setError('Kamera bulunamadı.');
          return;
        }

        const backCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('arka'));
        const selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;

        codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current!, (result, err) => {
          if (result) {
            onScan(result.getText());
            codeReader.reset();
            onClose();
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error(err);
          }
        });
      })
      .catch((err) => {
        console.error(err);
        setError('Kamera izni reddedildi veya hata oluştu.');
      });

    return () => {
      isComponentMounted = false;
      codeReader.reset();
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        <div className="p-4 bg-earth-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <h3 className="font-bold">Barkod / QR Okuyucu</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center">
          {error ? (
            <p className="text-red-400 p-4 text-center font-medium">{error}</p>
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover" />
          )}
          {!error && (
            <div className="absolute inset-0 border-[6px] border-nature-500/50 m-12 rounded-xl pointer-events-none"></div>
          )}
        </div>
        
        <div className="p-4 bg-earth-50 dark:bg-gray-900 text-earth-600 dark:text-gray-400 text-sm text-center">
          Kamerayı küpe üzerindeki barkoda doğru tutun. Okuma işlemi otomatik yapılacaktır.
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
