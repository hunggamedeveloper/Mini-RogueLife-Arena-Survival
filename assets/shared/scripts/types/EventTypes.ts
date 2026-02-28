// ============================================================
// EventTypes.ts — All EventBus event string constants
// ============================================================

import { GameState, EnemyType, IUpgradeDef, IGameResult, IDebugData } from './GameTypes';

export const GameEvents = {
    // --- State ---
    STATE_CHANGE:            'state:change',        // { from: GameState, to: GameState }
    GAME_START:              'game:start',
    GAME_PAUSE:              'game:pause',
    GAME_RESUME:             'game:resume',
    GAME_OVER:               'game:over',           // IGameResult

    // --- Player ---
    PLAYER_DAMAGED:          'player:damaged',      // { amount: number, hpRemaining: number }
    PLAYER_HEALED:           'player:healed',       // { amount: number }
    PLAYER_DIED:             'player:died',
    PLAYER_LEVEL_UP:         'player:levelUp',      // { newLevel: number, options: IUpgradeDef[] }
    PLAYER_EXP_GAINED:       'player:expGained',    // { amount: number, total: number, required: number }
    PLAYER_STATS_CHANGED:    'player:statsChanged', // IPlayerStats snapshot

    // --- Enemy ---
    ENEMY_SPAWNED:           'enemy:spawned',       // { type: EnemyType }
    ENEMY_DIED:              'enemy:died',           // { type: EnemyType, posX: number, posY: number }
    ENEMY_DAMAGED:           'enemy:damaged',        // { hpRemaining: number }

    // --- Upgrade ---
    UPGRADE_CHOSEN:          'upgrade:chosen',      // { upgradeId: string }
    UPGRADE_APPLIED:         'upgrade:applied',     // IUpgradeDef

    // --- Combat ---
    BULLET_FIRED:            'bullet:fired',        // IProjectileData
    BULLET_HIT:              'bullet:hit',          // { posX: number, posY: number }

    // --- Wave ---
    WAVE_STARTED:            'wave:started',        // { waveId: number }
    WAVE_COMPLETED:          'wave:completed',      // { waveId: number }

    // --- UI ---
    UI_UPGRADE_PANEL_OPEN:   'ui:upgradePanel:open',
    UI_UPGRADE_PANEL_CLOSE:  'ui:upgradePanel:close',
    UI_PAUSE_OPEN:           'ui:pause:open',
    UI_PAUSE_CLOSE:          'ui:pause:close',
    UI_RESULT_OPEN:          'ui:result:open',      // IGameResult
    UI_SETTINGS_OPEN:        'ui:settings:open',
    UI_SETTINGS_CLOSE:       'ui:settings:close',

    // --- Audio ---
    AUDIO_PLAY_SFX:          'audio:sfx',           // { key: string }
    AUDIO_PLAY_BGM:          'audio:bgm',           // { key: string, loop: boolean }
    AUDIO_STOP_BGM:          'audio:bgm:stop',
    AUDIO_SETTINGS_CHANGED:  'audio:settings',      // { master: number, sfx: number, bgm: number }

    // --- Debug ---
    DEBUG_UPDATE:            'debug:update',        // IDebugData
} as const;

export type GameEventKey = typeof GameEvents[keyof typeof GameEvents];
