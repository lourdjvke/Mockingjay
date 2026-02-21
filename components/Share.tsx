import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './IconLibrary';
import QRCode from 'qrcode';

interface ShareProps {
  show: boolean;
  onClose: () => void;
  designId: string | null;
}

const Share: React.FC<ShareProps> = ({ show, onClose, designId }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (show && designId) {
      QRCode.toDataURL(designId, { width: 300, color: { dark: '#000000', light: '#FFFFFF' } })
        .then(url => {
          setQrCode(url);
        })
        .catch(err => {
          console.error(err);
        });
    }
  }, [show, designId]);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase">Share Design</h2>
            <p className="text-white/40 text-sm">Scan the QR code to collaborate</p>
          </div>
          <div className="flex justify-center">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" />
            ) : (
              <div className="w-[300px] h-[300px] bg-gray-700 animate-pulse rounded-lg" />
            )}
          </div>
        </div>
        <button onClick={onClose} className="w-full py-5 text-white/30 text-xs font-bold uppercase tracking-widest border-t border-white/5 hover:text-white transition-colors">Close</button>
      </div>
    </div>
  );
};

export default Share;
