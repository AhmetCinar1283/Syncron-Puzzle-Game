'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';

interface StatusMessagesProps {
  error: string | null;
  successMsg: string | null;
}

export function StatusMessages({ error, successMsg }: StatusMessagesProps) {
  const t = useT();
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255, 45, 85, 0.08)',
            border: '1px solid rgba(255, 45, 85, 0.3)',
            color: '#ff2d55',
            borderRadius: '8px',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          ⚠️ {error.startsWith('friends.') ? t(error) : error}
        </motion.div>
      )}

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(0, 255, 136, 0.08)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            color: '#00ff88',
            borderRadius: '8px',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          ✓ {t(successMsg)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default StatusMessages;
