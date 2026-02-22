import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './IconLibrary';
import { toDataURL } from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

interface ShareProps {
  show: boolean;
  onClose: () => void;
  designId: string | null;
  uid: string | null;
  onScanSuccess: (decodedText: string) => void;
}

type ShareMode = 'show' | 'scan';

const Share: React.FC<ShareProps> = ({ show, onClose, designId, uid, onScanSuccess }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [mode, setMode] = useState<ShareMode>('show');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    if (show && mode === 'show' && designId && uid) {
      const path = `users/${uid}/designs/${designId}`;
      toDataURL(path, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
        .then(url => setQrCode(url))
        .catch(err => console.error("QR Gen Error:", err));
    }
  }, [show, mode, designId, uid]);

  useEffect(() => {
    if (!show) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Scanner stop on close failed:", err));
      }
      return;
    }

    if (mode === 'scan') {
      const handleSuccess = (decodedText: string) => {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop()
            .then(() => {
              onScanSuccess(decodedText);
              onClose();
            })
            .catch(err => {
              console.error("Scanner stop after success failed:", err);
              // Fallback to ensure UI doesn't get stuck
              onScanSuccess(decodedText);
              onClose();
            });
        }
      };

      const startScanner = async () => {
        if (!readerRef.current) return;
        
        const html5QrCode = new Html5Qrcode(readerRef.current.id, /* verbose=*/ false);
        scannerRef.current = html5QrCode;

        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length) {
            setCameraPermission('granted');
            const cameraId = cameras.find(c => c.label.toLowerCase().includes('back'))?.id || cameras[0].id;
            await html5QrCode.start(
              cameraId,
              { fps: 10, qrbox: { width: 250, height: 250 } },
              handleSuccess,
              (errorMessage) => { /* ignore scan failure */ }
            );
          } else {
            setCameraPermission('denied');
          }
        } catch (err) {
          console.error("Camera permission or start error:", err);
          setCameraPermission('denied');
        }
      };

      startScanner();
    } 

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(err => {
           // This error is expected if the success handler already stopped it.
           // console.log("Cleanup stop failed, likely already stopped.");
        });
      }
    };
  }, [show, mode, onScanSuccess, onClose]);

  if (!show) return null;

  const renderContent = () => {
    if (mode === 'scan') {
      return (
        <div className="aspect-square w-full rounded-2xl bg-zinc-800 overflow-hidden relative flex items-center justify-center">
          <div id="qr-reader" ref={readerRef} className="w-full h-full absolute top-0 left-0"></div>
          {cameraPermission === 'denied' && (
              <div className="z-10 text-center p-4 bg-black/50 rounded-lg">
                  <p className="text-white font-semibold">Camera Permission Denied</p>
                  <p className="text-white/60 text-sm">Please enable camera access in your browser settings to continue.</p>
              </div>
          )}
          {cameraPermission === 'prompt' && (
              <div className="z-10 flex flex-col items-center justify-center gap-4">
                  <Icons.Camera className="w-12 h-12 text-white/30" />
                  <p className="text-white/60 text-sm font-medium">Requesting Camera...</p>
              </div>
          )}
          <div className="absolute inset-0 border-[12px] border-black/30 rounded-[32px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
          {cameraPermission === 'granted' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-4 border-dashed border-white/40 rounded-3xl animate-pulse"></div>}
        </div>
      );
    }

    return (
      <div className="aspect-square w-full rounded-2xl bg-white p-4 flex items-center justify-center">
        {qrCode ? (
          <img src={qrCode} alt="Design QR Code" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl p-6 flex flex-col gap-6" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Collaborate</h2>
          <p className="text-white/50 text-sm">{mode === 'show' ? 'Let others scan your design' : 'Scan a code to view a design'}</p>
        </div>
        
        {renderContent()}

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setMode('show')} 
            className={`px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'show' ? 'bg-lime-400 text-black shadow-lg shadow-lime-500/20' : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'}`}>
            <Icons.QrCode className="w-5 h-5" />
            Show QR
          </button>
          <button 
            onClick={() => setMode('scan')} 
            className={`px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'scan' ? 'bg-lime-400 text-black shadow-lg shadow-lime-500/20' : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'}`}>
            <Icons.Camera className="w-5 h-5" />
            Scan
          </button>
        </div>
        <button onClick={onClose} className="text-center w-full py-2 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Close</button>
      </div>
    </div>
  );
};

export default Share;
