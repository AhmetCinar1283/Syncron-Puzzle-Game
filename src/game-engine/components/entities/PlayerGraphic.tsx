// components/entities/PlayerGraphic.tsx
//
// Varlık (Entity) → maskot köprüsü. Oyuncunun görünüşü burada ÇİZİLMEZ: beş
// temanın tek çizicisi `render/entities/player.ts`, DOM'a yerleştirme
// `MascotView`. Bu dosya yalnızca `entity.customData`'yı ve temayı props'a çevirir;
// `ENTITY_RENDERERS`, menü ve editör bu imzayı kullanmaya devam eder.

import type { Ref } from 'react';
import { Entity } from '../../logic/entityTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { ThemeDefinition } from '../../themes/themeConfig';
import type { MascotController } from '../../mascot/controller';
import { MascotView, type MascotHandle } from './MascotView';

interface PlayerGraphicProps {
    entity: Entity;
    themeConfig?: ThemeDefinition;
    /** İfadeleri dışarıdan tetiklemek için paylaşılan denetleyici (kimlik = `entity.id`). */
    controller?: MascotController;
    ref?: Ref<MascotHandle>;
}

export const PlayerGraphic = ({ entity, themeConfig: propThemeConfig, controller, ref }: PlayerGraphicProps) => {
    const { themeConfig: contextThemeConfig } = useGameTheme();
    const themeConfig = propThemeConfig ?? contextThemeConfig;

    return (
        <MascotView
            ref={ref}
            theme={themeConfig.id}
            playerIndex={(entity.customData.playerIndex as number) ?? 0}
            mode={(entity.customData.mode as 'normal' | 'reversed') ?? 'normal'}
            locked={Boolean(entity.customData.isLocked)}
            id={entity.id}
            controller={controller}
        />
    );
};
