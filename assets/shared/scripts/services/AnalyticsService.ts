// ============================================================
// AnalyticsService.ts — Mock analytics, logs to console.
// Swap out the _send() implementation for a real backend later.
// ============================================================

import { IGameResult } from '../types/GameTypes';

class AnalyticsServiceImpl {
    private _enabled: boolean = true;

    trackGameStart(): void {
        this._send('game_start', {});
    }

    trackGameOver(result: IGameResult): void {
        this._send('game_over', {
            survival_time:  Math.floor(result.survivalTime),
            kill_count:     result.killCount,
            level:          result.level,
        });
    }

    trackUpgradeChosen(upgradeId: string, level: number): void {
        this._send('upgrade_chosen', { upgrade_id: upgradeId, level });
    }

    trackWaveReached(waveId: number): void {
        this._send('wave_reached', { wave_id: waveId });
    }

    private _send(event: string, params: object): void {
        if (!this._enabled) return;
        // TODO: replace with real analytics call (Firebase, etc.)
        console.log(`[Analytics] ${event}`, params);
    }
}

export const AnalyticsService = new AnalyticsServiceImpl();
