
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';

interface CreditPopupProps {
  show: boolean;
  onClose: () => void;
  onCtaClick: () => void;
}

const CreditPopup: React.FC<CreditPopupProps> = ({ show, onClose, onCtaClick }) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-sm"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-75"></div>
            <div className="relative bg-white rounded-2xl p-6 text-center shadow-lg">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">You got 100 free credits!</h2>
              <p className="text-gray-600 mb-6">Use your AI credits to generate stunning designs.</p>
              <button
                onClick={onCtaClick}
                className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
              >
                Use AI Credits
              </button>
              <button
                onClick={onClose}
                className="mt-4 text-gray-500 hover:text-gray-700 transition-colors text-sm"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreditPopup;
