'use client';

import React from 'react';
import { Modal as UiModal } from '@/components/ui';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <UiModal
      open={true}
      onClose={onClose}
      title={title}
      accentColor="#00c4ff"
      maxWidth={440}
      showCloseButton={false}
    >
      {children}
    </UiModal>
  );
}
