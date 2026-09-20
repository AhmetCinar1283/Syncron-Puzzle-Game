/**
 * DOSYA AMACI: Canvas render izinin tüm fazlarının paylaştığı arayüzler ve
 * sabitler. Burada yeni tip TANIMLANMAZ; mevcut modüllerden içe aktarılıp
 * yeniden dışa aktarılır. Tek istisna aşağıda gerekçesiyle işaretlenmiştir.
 *
 * NEDEN tek dosya: sprite sözleşmesi (`SpritePainter`) izin merkezi kararı
 * (bkz. .plans/canvas-render/00-ilkeler.md §3.1). Sonraki yedi faz bu imzaları
 * doldurur, değiştirmez.
 */

import type { Cell } from '../logic/cellTypes';
import type { Entity } from '../logic/entityTypes';
import type { RoomState } from '../logic/types';
import type { GameTheme } from '../themes/themeConfig';
import type { BoardAmbientMode } from '../components/board/boardKeyframes';
import { NATIVE_CELL_SIZE } from '../components/play-screen/constants';

export { NATIVE_CELL_SIZE };
export type { BoardAmbientMode };

/** Üst üste duran üç tuvalin adları; z-sırası da bu sıradır (00-ilkeler §2.3). */
export type LayerName = 'static' | 'ambient' | 'actors';

/**
 * Animasyonlu bir süsün kaç kareye örneklendiği (00-ilkeler §3.2). Süsler kare
 * döngüsünde hesaplanmaz; 12 sprite önbelleğe alınır ve zamandan faz seçilir.
 */
export const PHASES = 12;

/**
 * `calculateRoomLayoutOffsets`'ın oda başına döndürdüğü kutu.
 *
 * NEDEN burada tanımlı: bu şekil `rooms.ts` içinde satır içi (anonim) yazılmış,
 * dışa aktarılmış bir adı yok. `BoardScene` ona ad vermek zorunda; `rooms.ts`
 * bu izin kapsamı dışında olduğu için orada değiştirilmedi.
 */
export interface RoomOffset {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Bir hücrenin görünümünü belirleyen her şey. */
export interface CellPaintInput {
    cell: Cell;
    theme: GameTheme;
    /** Üzerinde veya bir önceki karede üzerinde varlık var mıydı. */
    isOccupied: boolean;
    /**
     * Hücrenin GEÇİCİ "çalışıyor" hâli: konveyör 800ms, teleport 600ms,
     * trambolin 500ms. Diğer hücre tipleri bu alanı yok sayar.
     *
     * NEDEN sözleşmeye eklendi (00-ilkeler §3.1'de yoktu): kaynak DOM çizicileri
     * bu üç hücrede React state + `setTimeout` tutuyor ve o süre boyunca arka
     * plan, kenar, gölge ve süsler DEĞİŞİYOR. `isOccupied` bunu veremez; alan
     * olmadan üç hücre DOM'dan görünür biçimde ayrılırdı (00-ilkeler §4).
     * Durumun kendisi `cells/activity.ts`'te tutulur. Proje sahibi onayladı.
     */
    isActive: boolean;
    /** Animasyonlu süsün kaçıncı fazı (0..PHASES-1). Durağan sprite'ta 0. */
    phase: number;
}

export interface SpritePainter<TInput> {
    /**
     * Aynı görüntüyü veren her girdi için AYNI dizgiyi döndürmeli.
     * Yanlış anahtar = ya yanlış görüntü ya da sınırsız büyüyen önbellek.
     */
    key(input: TInput): string;
    /**
     * Sprite'ı BİR KEZ çizer. Gölge/filtre YALNIZCA burada serbesttir.
     *
     * `false` döndürmek "bu sprite'ı önbelleğe ALMA" demektir: çizim için
     * gereken bir kaynak (ör. henüz yüklenmemiş bir ikon) hazır değildi, bir
     * sonraki karede yeniden denenmeli (bkz. `icons.ts`).
     */
    draw(ctx: CanvasRenderingContext2D, input: TInput): void | boolean;
    /** Sprite kutusu (CSS pikseli). Hücreler 64x64; taşan parlama için büyütülebilir. */
    size(input: TInput): { w: number; h: number };
}

/** Bir karede çizilecek her şeyin tek okunur kaynağı. */
export interface BoardScene {
    rooms: Record<string, RoomState>;
    entities: Entity[];
    prevEntities: Entity[] | null;
    roomPositions: Record<string, RoomOffset>;
    totalWidth: number;
    totalHeight: number;
    theme: GameTheme;
    controlledRoomIds: string[] | undefined;
    ambientMode: BoardAmbientMode;
    /** Tick geçişinin ms cinsinden süresi — hareket interpolasyonunun tabanı. */
    frameMs: number;
    /** Bu tick'in başladığı `performance.now()` damgası. */
    tickStartedAt: number;
}
