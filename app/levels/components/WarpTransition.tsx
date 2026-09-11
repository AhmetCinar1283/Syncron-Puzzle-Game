'use client';

import { AnimatePresence, motion } from 'framer-motion';

/**
 * Bölüm (chapter) geçişi efekti. Öncekinde 1.2s+1.1s süren, `backdrop-filter: blur` içeren
 * ağır bir keyframe animasyonuydu; burada sadece opacity/scale (transform-only, GPU-ucuz)
 * kullanan, ~450ms süren sade bir versiyonu var.
 */
export function WarpTransition({ active, label }: { active: boolean; label: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 z-[100] flex items-center justify-center bg-[#03050a]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.h2
            className="text-xl font-black uppercase tracking-[0.3em] text-emerald-400"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {label}
          </motion.h2>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
