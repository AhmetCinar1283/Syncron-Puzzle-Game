'use client';

import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { Modal } from '@/components/ui';

interface LevelNotesModalProps {
  notes?: string;
  onClose: () => void;
}

/** Seviye notları modalı. */
export function LevelNotesModal({ notes, onClose }: LevelNotesModalProps) {
  const t = useT();

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t('hud.level_notes')}
      icon={<GameIcon name="lightbulb" size={18} color="#fbbf24" />}
      accentColor="#fbbf24"
      maxWidth={440}
      closeButtonText={t('hud.level_notes_close') || t('common.close')}
      showCloseButton={true}
    >
      <div
        style={{
          color: '#cbd5e1',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          padding: '4px 2px',
        }}
      >
        {notes}
      </div>
    </Modal>
  );
}
