import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, ArrowLeft } from 'lucide-react';
import { clearAuth } from '../lib/authStorage';
import { texts } from '../themes';

export default function JudiciaryPortal() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    clearAuth();
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 max-w-sm"
      >
        <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-400">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{texts.judiciary.title}</h1>
          <p className="text-slate-500">
            {texts.judiciary.description}
          </p>
        </div>

        <div className="pt-4">
          <span className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-full">
            {texts.judiciary.comingSoon}
          </span>
        </div>

        <button
          onClick={handleBack}
          className="flex items-center gap-2 mx-auto text-slate-400 hover:text-slate-600 transition-colors pt-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {texts.judiciary.backToLogin}
        </button>
      </motion.div>
    </div>
  );
}
