'use client';

import { useLevelPartsPage } from './hooks/useLevelPartsPage';
import { NeonBtn } from './components/NeonBtn';
import { PartCard } from './components/PartCard';
import { CreatePartModal } from './components/CreatePartModal';
import { MapDesignerModal } from './components/MapDesignerModal';

export default function LevelPartsPage() {
  const {
    router,
    role,
    loading,
    parts,
    dataLoading,
    savingAll,
    isDirty,
    designerPart,
    setDesignerPart,
    showCreate,
    setShowCreate,
    newName,
    setNewName,
    newUnlock,
    setNewUnlock,
    creating,
    handleSaveMapLayout,
    handleCreatePart,
    handleUpdatePartName,
    handleUpdatePartUnlock,
    handleDeletePart,
    handleReorderLevel,
    handleDeleteLevel,
    handleReset,
    handleSaveChanges,
    handleEditLevel,
  } = useLevelPartsPage();

  if (loading || role !== 'admin') {
    return (
      <main style={{ minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em' }}>Loading...</span>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#030712', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(3,7,18,0.97)', borderBottom: '1px solid rgba(0,196,255,0.15)' }}>
        <button
          onClick={() => router.push('/admin')}
          style={{ background: 'none', border: 'none', color: '#334155', fontSize: 12, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          ← Admin
        </button>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#00c4ff', textShadow: '0 0 10px rgba(0,196,255,0.5)' }}>
          Level Parts
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isDirty && (
            <>
              <NeonBtn color="#ef4444" onClick={handleReset} disabled={savingAll} small>
                Discard
              </NeonBtn>
              <NeonBtn color="#00ff88" onClick={handleSaveChanges} disabled={savingAll} small>
                {savingAll ? 'Saving...' : 'Save Changes'}
              </NeonBtn>
            </>
          )}
          <NeonBtn color="#00c4ff" onClick={() => setShowCreate(true)} small>
            + New Part
          </NeonBtn>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 800, width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        {dataLoading ? (
          <div style={{ textAlign: 'center', color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em', paddingTop: 60 }}>
            Loading...
          </div>
        ) : parts.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ color: '#1e3a5f', fontSize: 13 }}>No parts yet. Create one to get started.</p>
          </div>
        ) : (
          parts.map((part) => (
            <PartCard
              key={part.partId}
              part={part}
              onUpdateName={(name) => handleUpdatePartName(part.partId, name)}
              onUpdateUnlock={(req) => handleUpdatePartUnlock(part.partId, req)}
              onDelete={() => handleDeletePart(part.partId, part.name)}
              onReorderLevel={(levelId, dir) => handleReorderLevel(part.partId, levelId, dir)}
              onDeleteLevel={(levelId) => handleDeleteLevel(part.partId, levelId)}
              onEditLevel={handleEditLevel}
              onDesignMap={() => setDesignerPart(part)}
            />
          ))
        )}
      </div>

      {/* Create Part modal */}
      {showCreate && (
        <CreatePartModal
          newName={newName}
          setNewName={setNewName}
          newUnlock={newUnlock}
          setNewUnlock={setNewUnlock}
          creating={creating}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreatePart}
        />
      )}

      {/* Map Designer Modal */}
      {designerPart && (
        <MapDesignerModal
          part={designerPart}
          onClose={() => setDesignerPart(null)}
          onSave={handleSaveMapLayout}
        />
      )}
    </div>
  );
}
