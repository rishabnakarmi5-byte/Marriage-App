import React from 'react';
import { useLanguage } from './LanguageContext';
import { motion } from 'motion/react';
import { playTap } from './sounds';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg overflow-hidden">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { playTap(); setLanguage('ne'); }}
        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${
          language === 'ne' 
          ? 'bg-amber-500 text-slate-900 shadow-md' 
          : 'text-slate-400 hover:text-white'
        }`}
      >
        नेपाली
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { playTap(); setLanguage('en'); }}
        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${
          language === 'en' 
          ? 'bg-amber-500 text-slate-900 shadow-md' 
          : 'text-slate-400 hover:text-white'
        }`}
      >
        EN
      </motion.button>
    </div>
  );
};
