/**
 * DOSYA AMACI: Açık `Modal`'ların yığınını (stack) tutar. Böylece
 * - `body[data-modal-open]` işareti, iç içe modallar arasında da doğru kalır
 *   (üstteki kapanınca alttaki hâlâ açıksa işaret silinmez),
 * - yalnızca EN ÜSTTEKİ modal klavye/d-pad girdisini sahiplenir,
 * - arka plan dinleyicileri `isAnyModalOpen()` ile girdiyi yok sayabilir.
 */

const stack: number[] = [];
let nextId = 1;

function syncBodyFlag() {
  if (typeof document === 'undefined') return;
  if (stack.length > 0) document.body.setAttribute('data-modal-open', 'true');
  else document.body.removeAttribute('data-modal-open');
}

/** Modal açıldığında çağrılır; kaydı kaldıran temizleme işlevini döndürür. */
export function pushModal(): { id: number; remove: () => void } {
  const id = nextId++;
  stack.push(id);
  syncBodyFlag();
  return {
    id,
    remove: () => {
      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);
      syncBodyFlag();
    },
  };
}

export function isTopModal(id: number): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

export function isAnyModalOpen(): boolean {
  return stack.length > 0;
}
