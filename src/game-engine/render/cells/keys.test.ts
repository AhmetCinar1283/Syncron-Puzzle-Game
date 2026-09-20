/**
 * DOSYA AMACI: On iki hücre rasterleyicisinin `key()` fonksiyonlarının
 * 00-ilkeler §3.1'deki sözleşmeye uyduğunu kanıtlamak: aynı görüntüyü veren
 * girdi için AYNI dizgi, farklı görüntü için FARKLI dizgi. `key()` saf olduğu
 * için canvas/`document` gerekmez (00-ilkeler §6.1 — tuvale çizim testi bu izin
 * kapsamı dışında, ama anahtarlama saf mantık ve burada test edilir).
 *
 * `cell`, `cell.id` veya ilgisiz `customData` GİRMEDİĞİNİ de kanıtlar: iki
 * farklı `cell.id`'li ama aynı `type`'lı girdi aynı anahtarı vermeli.
 */

import { describe, expect, it } from 'vitest';
import type { Cell, CellTypes } from '../../logic/cellTypes';
import type { CellPaintInput, SpritePainter } from '../types';
import { CELL_SPRITES } from './index';
import { normalCellSprite } from './normal';
import { obstacleCellSprite } from './obstacle';
import { forbiddenCellSprite } from './forbidden';
import { iceAmbientSprite, iceCellSprite, iceIsAnimated } from './ice';
import { powerCellSprite } from './power';
import { toggleCellSprite } from './toggle';
import { conveyorAmbientSprite, conveyorCellSprite, conveyorIsAnimated } from './conveyor';
import { trampolineCellSprite } from './trampoline';
import { teleportAmbientSprite, teleportCellSprite, teleportIsAnimated } from './teleport';
import { targetAmbientSprite, targetCellSprite, targetIsAnimated } from './target';
import { controlSwitchCellSprite } from './controlSwitch';
import { directionDeflectorCellSprite } from './directionDeflector';

const ALL_TYPES: CellTypes[] = [
    'normal', 'obstacle', 'forbidden', 'ice', 'power', 'toggle',
    'conveyor', 'trampoline', 'teleport', 'target', 'control_switch', 'direction_deflector',
];

function makeCell(overrides: Partial<Cell> = {}): Cell {
    return {
        id: 'cell-1',
        type: 'normal',
        position: { row: 0, col: 0 },
        def: { friction: 1, isWalkable: true },
        isElectrified: false,
        customData: {},
        ...overrides,
    };
}

function makeInput(overrides: Partial<CellPaintInput> = {}): CellPaintInput {
    return { cell: makeCell(), theme: 'legacy', isOccupied: false, isActive: false, phase: 0, ...overrides };
}

/** İki girdinin anahtarları aynı mı? Okunurluk için. */
function sameKey(painter: SpritePainter<CellPaintInput>, a: Partial<CellPaintInput>, b: Partial<CellPaintInput>): boolean {
    return painter.key(makeInput(a)) === painter.key(makeInput(b));
}

describe('CELL_SPRITES kaydı', () => {
    it('on iki hücre tipinin hepsi kayıtlıdır (faz planı §4)', () => {
        for (const type of ALL_TYPES) {
            expect(CELL_SPRITES[type], type).toBeDefined();
        }
        expect(Object.keys(CELL_SPRITES).length).toBe(12);
    });

    it('hiçbir tip `normal` rasterleyicisine düşmez — yedek yol kaldırıldı', () => {
        for (const type of ALL_TYPES.filter(t => t !== 'normal')) {
            expect(CELL_SPRITES[type], type).not.toBe(normalCellSprite);
        }
    });
});

describe('normalCellSprite.key', () => {
    it('yalnızca temaya bağlıdır', () => {
        expect(normalCellSprite.key(makeInput({ theme: 'legacy' })))
            .toBe(normalCellSprite.key(makeInput({ theme: 'legacy' })));
    });

    it('farklı temalar farklı anahtar üretir', () => {
        expect(normalCellSprite.key(makeInput({ theme: 'legacy' })))
            .not.toBe(normalCellSprite.key(makeInput({ theme: 'cosmic' })));
    });

    it('cell.id anahtara girmez', () => {
        const a = normalCellSprite.key(makeInput({ cell: makeCell({ id: 'a' }) }));
        const b = normalCellSprite.key(makeInput({ cell: makeCell({ id: 'b' }) }));
        expect(a).toBe(b);
    });
});

describe('obstacleCellSprite.key', () => {
    it('beş tema için beş farklı anahtar üretir', () => {
        const themes = ['legacy', 'arcade', 'neon', 'blueprint', 'cosmic'] as const;
        const keys = themes.map(theme => obstacleCellSprite.key(makeInput({ theme })));
        expect(new Set(keys).size).toBe(5);
    });
});

describe('forbiddenCellSprite.key', () => {
    it('cell.customData anahtara girmez', () => {
        const a = forbiddenCellSprite.key(makeInput({ cell: makeCell({ customData: { foo: 1 } }) }));
        const b = forbiddenCellSprite.key(makeInput({ cell: makeCell({ customData: { bar: 2 } }) }));
        expect(a).toBe(b);
    });
});

describe('iceCellSprite.key (durağan gövde)', () => {
    it('isOccupied farklıysa farklı anahtar üretir', () => {
        const idle = iceCellSprite.key(makeInput({ theme: 'cosmic', isOccupied: false }));
        const occ = iceCellSprite.key(makeInput({ theme: 'cosmic', isOccupied: true }));
        expect(idle).not.toBe(occ);
    });

    it('legacy temasında isOccupied görüntüyü etkilemediği için anahtar aynıdır', () => {
        const idle = iceCellSprite.key(makeInput({ theme: 'legacy', isOccupied: false }));
        const occ = iceCellSprite.key(makeInput({ theme: 'legacy', isOccupied: true }));
        expect(idle).toBe(occ);
    });

    it('phase durağan gövdenin anahtarını etkilemez (animasyon ambient katmanında)', () => {
        const p0 = iceCellSprite.key(makeInput({ theme: 'cosmic', isOccupied: true, phase: 0 }));
        const p5 = iceCellSprite.key(makeInput({ theme: 'cosmic', isOccupied: true, phase: 5 }));
        expect(p0).toBe(p5);
    });
});

describe('iceAmbientSprite.key (animasyonlu süs)', () => {
    it('her faz farklı bir anahtar üretir — örnek doğru anahtar deseni', () => {
        expect(iceAmbientSprite.key(makeInput({ theme: 'cosmic', isOccupied: true, phase: 0 })))
            .toBe('ice|cosmic|occ1|p0');
    });

    it('12 fazın hepsi birbirinden farklıdır', () => {
        const keys = Array.from({ length: 12 }, (_, phase) =>
            iceAmbientSprite.key(makeInput({ theme: 'cosmic', isOccupied: true, phase })));
        expect(new Set(keys).size).toBe(12);
    });
});

describe('iceIsAnimated', () => {
    it('legacy temasında hiçbir zaman animasyonlu değildir', () => {
        expect(iceIsAnimated(makeInput({ theme: 'legacy', isOccupied: true }))).toBe(false);
    });

    it('diğer temalarda yalnızca doluyken animasyonludur', () => {
        expect(iceIsAnimated(makeInput({ theme: 'arcade', isOccupied: true }))).toBe(true);
        expect(iceIsAnimated(makeInput({ theme: 'arcade', isOccupied: false }))).toBe(false);
    });
});

// ─── Faz 03: kalan sekiz hücre ───────────────────────────────────────────────

describe('powerCellSprite.key', () => {
    it('legacy tek anahtar verir; isOccupied görüntüyü etkilemez', () => {
        expect(sameKey(powerCellSprite, { theme: 'legacy' }, { theme: 'legacy', isOccupied: true })).toBe(true);
    });

    it('diğer temalarda isOccupied anahtarı ayırır', () => {
        expect(sameKey(powerCellSprite, { theme: 'cosmic' }, { theme: 'cosmic', isOccupied: true })).toBe(false);
    });

    it('isElectrified anahtara GİRMEZ — DOM çizicisi onu hiç okumuyor', () => {
        const off = makeInput({ theme: 'neon', cell: makeCell({ isElectrified: false }) });
        const on = makeInput({ theme: 'neon', cell: makeCell({ isElectrified: true }) });
        expect(powerCellSprite.key(off)).toBe(powerCellSprite.key(on));
    });

    it('cell.position ve customData.explored anahtara girmez', () => {
        const a = makeInput({ theme: 'neon', cell: makeCell({ position: { row: 3, col: 7 }, customData: { explored: true } }) });
        const b = makeInput({ theme: 'neon', cell: makeCell({ position: { row: 0, col: 0 }, customData: { explored: false } }) });
        expect(powerCellSprite.key(a)).toBe(powerCellSprite.key(b));
    });
});

describe('toggleCellSprite.key', () => {
    it('beş tema için beş farklı anahtar üretir', () => {
        const themes = ['legacy', 'arcade', 'neon', 'blueprint', 'cosmic'] as const;
        const keys = themes.map(theme => toggleCellSprite.key(makeInput({ theme })));
        expect(new Set(keys).size).toBe(5);
    });

    it('customData.trailPlayerIndex anahtara girmez', () => {
        const a = makeInput({ theme: 'neon', cell: makeCell({ customData: { trailPlayerIndex: 1 } }) });
        const b = makeInput({ theme: 'neon', cell: makeCell({ customData: { trailPlayerIndex: 2 } }) });
        expect(toggleCellSprite.key(a)).toBe(toggleCellSprite.key(b));
    });
});

describe('conveyorCellSprite.key', () => {
    const powered = (extra: Partial<CellPaintInput> = {}) =>
        makeInput({ theme: 'neon', cell: makeCell({ isElectrified: true, customData: { direction: 'right' } }), ...extra });

    it('yön anahtara girer', () => {
        const right = conveyorCellSprite.key(powered());
        const down = conveyorCellSprite.key(makeInput({
            theme: 'neon', cell: makeCell({ isElectrified: true, customData: { direction: 'down' } }),
        }));
        expect(right).not.toBe(down);
    });

    it('isElectrified anahtara girer (sönük görünüm)', () => {
        const dim = conveyorCellSprite.key(makeInput({ theme: 'neon', cell: makeCell({ customData: { direction: 'right' } }) }));
        expect(dim).not.toBe(conveyorCellSprite.key(powered()));
    });

    it('elektrikliyken çalışma penceresi anahtarı ayırır', () => {
        expect(conveyorCellSprite.key(powered())).not.toBe(conveyorCellSprite.key(powered({ isActive: true })));
    });

    it('SÖNÜKKEN çalışma penceresi görüntüyü etkilemez, anahtar aynıdır', () => {
        const base = { theme: 'neon' as const, cell: makeCell({ customData: { direction: 'right' } }) };
        expect(sameKey(conveyorCellSprite, base, { ...base, isActive: true })).toBe(true);
    });
});

describe('conveyorIsAnimated', () => {
    it('yalnızca legacy dışı + elektrikli + etkin hâlde animasyonludur', () => {
        const cell = makeCell({ isElectrified: true });
        expect(conveyorIsAnimated(makeInput({ theme: 'neon', cell, isActive: true }))).toBe(true);
        expect(conveyorIsAnimated(makeInput({ theme: 'neon', cell, isActive: false }))).toBe(false);
        expect(conveyorIsAnimated(makeInput({ theme: 'legacy', cell, isActive: true }))).toBe(false);
        expect(conveyorIsAnimated(makeInput({ theme: 'neon', cell: makeCell(), isActive: true }))).toBe(false);
    });
});

describe('conveyorAmbientSprite.key', () => {
    it('12 fazın hepsi birbirinden farklıdır', () => {
        const keys = Array.from({ length: 12 }, (_, phase) =>
            conveyorAmbientSprite.key(makeInput({ theme: 'neon', isActive: true, phase })));
        expect(new Set(keys).size).toBe(12);
    });
});

describe('trampolineCellSprite.key', () => {
    it('yön anahtara girer', () => {
        const up = trampolineCellSprite.key(makeInput({ theme: 'neon', cell: makeCell({ customData: { direction: 'up' } }) }));
        const left = trampolineCellSprite.key(makeInput({ theme: 'neon', cell: makeCell({ customData: { direction: 'left' } }) }));
        expect(up).not.toBe(left);
    });

    it('zıplama penceresi anahtarı ayırır; legacy temasında etkilemez', () => {
        expect(sameKey(trampolineCellSprite, { theme: 'neon' }, { theme: 'neon', isActive: true })).toBe(false);
        expect(sameKey(trampolineCellSprite, { theme: 'legacy' }, { theme: 'legacy', isActive: true })).toBe(true);
    });
});

describe('teleportCellSprite.key', () => {
    const withData = (data: Record<string, unknown>, extra: Partial<CellPaintInput> = {}) =>
        makeInput({ theme: 'neon', cell: makeCell({ customData: data }), ...extra });

    it('group RENGİ belirlediği için anahtara girer', () => {
        const a = teleportCellSprite.key(withData({ group: 'A' }));
        const b = teleportCellSprite.key(withData({ group: 'B' }));
        const c = teleportCellSprite.key(withData({ group: 'C' }));
        expect(new Set([a, b, c]).size).toBe(3);
    });

    it('isIn anahtara girer (simge ve renk yoğunluğu değişiyor)', () => {
        expect(teleportCellSprite.key(withData({ group: 'A', isIn: true })))
            .not.toBe(teleportCellSprite.key(withData({ group: 'A', isIn: false })));
    });

    it('ışınlanma penceresi anahtarı ayırır; legacy temasında etkilemez', () => {
        expect(teleportCellSprite.key(withData({ group: 'A' })))
            .not.toBe(teleportCellSprite.key(withData({ group: 'A' }, { isActive: true })));
        const legacy = { theme: 'legacy' as const, cell: makeCell({ customData: { group: 'A' } }) };
        expect(sameKey(teleportCellSprite, legacy, { ...legacy, isActive: true })).toBe(true);
    });

    it('customData.cableConnections anahtara girmez', () => {
        expect(teleportCellSprite.key(withData({ group: 'A', cableConnections: ['up'] })))
            .toBe(teleportCellSprite.key(withData({ group: 'A', cableConnections: ['down', 'left'] })));
    });
});

describe('teleportIsAnimated', () => {
    it('yalnızca legacy dışı + etkin pencerede animasyonludur', () => {
        expect(teleportIsAnimated(makeInput({ theme: 'cosmic', isActive: true }))).toBe(true);
        expect(teleportIsAnimated(makeInput({ theme: 'cosmic', isActive: false }))).toBe(false);
        expect(teleportIsAnimated(makeInput({ theme: 'legacy', isActive: true }))).toBe(false);
    });
});

describe('teleportAmbientSprite.key', () => {
    it('12 fazın hepsi birbirinden farklıdır', () => {
        const keys = Array.from({ length: 12 }, (_, phase) =>
            teleportAmbientSprite.key(makeInput({ theme: 'neon', isActive: true, phase })));
        expect(new Set(keys).size).toBe(12);
    });
});

describe('targetCellSprite.key', () => {
    const forPlayer = (playerIndex: number, extra: Partial<CellPaintInput> = {}) =>
        makeInput({ theme: 'neon', cell: makeCell({ customData: { playerIndex } }), ...extra });

    it('playerIndex RENGİ belirlediği için anahtara girer', () => {
        expect(targetCellSprite.key(forPlayer(0))).not.toBe(targetCellSprite.key(forPlayer(1)));
    });

    it('phase durağan gövdenin anahtarını etkilemez', () => {
        expect(targetCellSprite.key(forPlayer(0, { phase: 0 }))).toBe(targetCellSprite.key(forPlayer(0, { phase: 7 })));
    });

    it('isOccupied görüntüyü etkilemez', () => {
        expect(targetCellSprite.key(forPlayer(0))).toBe(targetCellSprite.key(forPlayer(0, { isOccupied: true })));
    });
});

describe('targetIsAnimated', () => {
    it('legacy durağandır (target-pulse-blue sınıfının keyframe gövdesi yok)', () => {
        expect(targetIsAnimated(makeInput({ theme: 'legacy' }))).toBe(false);
        expect(targetIsAnimated(makeInput({ theme: 'arcade' }))).toBe(true);
    });
});

describe('targetAmbientSprite.key', () => {
    it('12 fazın hepsi birbirinden farklıdır', () => {
        const keys = Array.from({ length: 12 }, (_, phase) =>
            targetAmbientSprite.key(makeInput({ theme: 'neon', phase })));
        expect(new Set(keys).size).toBe(12);
    });
});

describe('controlSwitchCellSprite.key', () => {
    const withAction = (action: string, extra: Partial<CellPaintInput> = {}) =>
        makeInput({ theme: 'neon', cell: makeCell({ customData: { action } }), ...extra });

    it('customData.action ALT ETİKETİN metni olduğu için anahtara girer', () => {
        expect(controlSwitchCellSprite.key(withAction('cycle')))
            .not.toBe(controlSwitchCellSprite.key(withAction('swap')));
    });

    it('legacy alt etiketi çizmediği için action anahtara girmez', () => {
        const a = makeInput({ theme: 'legacy', cell: makeCell({ customData: { action: 'cycle' } }) });
        const b = makeInput({ theme: 'legacy', cell: makeCell({ customData: { action: 'swap' } }) });
        expect(controlSwitchCellSprite.key(a)).toBe(controlSwitchCellSprite.key(b));
    });

    it('isOccupied anahtarı ayırır', () => {
        expect(controlSwitchCellSprite.key(withAction('cycle')))
            .not.toBe(controlSwitchCellSprite.key(withAction('cycle', { isOccupied: true })));
    });
});

describe('directionDeflectorCellSprite.key', () => {
    const withMapping = (mapping: Record<string, string>) =>
        makeInput({ theme: 'neon', cell: makeCell({ customData: { mapping } }) });

    it('mapping dört oku belirlediği için anahtara girer', () => {
        const a = withMapping({ up: 'right', right: 'down', down: 'left', left: 'up' });
        const b = withMapping({ up: 'left', right: 'up', down: 'right', left: 'down' });
        expect(directionDeflectorCellSprite.key(a)).not.toBe(directionDeflectorCellSprite.key(b));
    });

    it('varsayılan mapping ile açıkça yazılmış varsayılan aynı anahtarı verir', () => {
        const implicit = makeInput({ theme: 'neon' });
        const explicit = withMapping({ up: 'right', right: 'down', down: 'left', left: 'up' });
        expect(directionDeflectorCellSprite.key(implicit)).toBe(directionDeflectorCellSprite.key(explicit));
    });

    it('legacy okları çizmediği için mapping anahtara girmez', () => {
        const a = makeInput({ theme: 'legacy', cell: makeCell({ customData: { mapping: { up: 'left' } } }) });
        const b = makeInput({ theme: 'legacy' });
        expect(directionDeflectorCellSprite.key(a)).toBe(directionDeflectorCellSprite.key(b));
    });
});

describe('on iki rasterleyicinin anahtarları çakışmaz', () => {
    it('her tip kendi ön ekini kullanır', () => {
        const keys = ALL_TYPES.map(type => CELL_SPRITES[type].key(makeInput({ theme: 'neon', cell: makeCell({ type }) })));
        expect(new Set(keys).size).toBe(ALL_TYPES.length);
    });
});
