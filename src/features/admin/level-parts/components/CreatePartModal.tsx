'use client';

import { INPUT_STYLE } from '../lib/helpers';
import { NeonBtn } from './NeonBtn';
import { Modal } from './Modal';

export function CreatePartModal({
  newName,
  setNewName,
  newUnlock,
  setNewUnlock,
  creating,
  onClose,
  onCreate,
}: {
  newName: string;
  setNewName: (v: string) => void;
  newUnlock: string;
  setNewUnlock: (v: string) => void;
  creating: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <Modal title="New Part" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Part Name
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Basics, Advanced..."
            style={INPUT_STYLE}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Unlock after (levels completed)
          </label>
          <input
            type="number"
            value={newUnlock}
            onChange={(e) => setNewUnlock(e.target.value)}
            style={{ ...INPUT_STYLE, width: 100 }}
            min={0}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <NeonBtn color="#475569" onClick={onClose}>Cancel</NeonBtn>
          <NeonBtn color="#00ff88" onClick={onCreate} disabled={!newName.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </NeonBtn>
        </div>
      </div>
    </Modal>
  );
}
