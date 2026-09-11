import { useState } from 'react';
import type { DragEvent } from 'react';

/**
 * HTML5 drag-and-drop reordering of the saved-levels list. On drop the new id
 * order is handed to `onReorder` (persists to the Dexie `levelOrder` table).
 * State lives in the dialog (not the list) so it survives tab switches, as before.
 */
export function useLevelReorderDrag<T extends { id: number }>(items: T[], onReorder: (newOrder: number[]) => void) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedLevels = [...items];
    const [draggedItem] = updatedLevels.splice(draggedIndex, 1);
    updatedLevels.splice(index, 0, draggedItem);

    const newOrder = updatedLevels.map((lv) => lv.id);
    onReorder(newOrder);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return { draggedIndex, dragOverIndex, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}

export type LevelReorderDragApi = ReturnType<typeof useLevelReorderDrag>;
