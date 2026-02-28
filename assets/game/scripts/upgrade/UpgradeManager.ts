// ============================================================
// UpgradeManager.ts — Loads upgrades.json, handles weighted
// random selection of 3 options on level-up, applies to PlayerStats.
// ============================================================

import { _decorator, Component, JsonAsset } from 'cc';
import { IUpgradeDef } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { PlayerStats } from '../player/PlayerStats';
import { AnalyticsService } from '../../../shared/scripts/services/AnalyticsService';

const { ccclass, property } = _decorator;

const OPTIONS_COUNT = 3;

@ccclass('UpgradeManager')
export class UpgradeManager extends Component {

    @property(JsonAsset)    upgradesJson: JsonAsset    = null!;
    @property(PlayerStats)  playerStats:  PlayerStats  = null!;

    private _defs: IUpgradeDef[] = [];

    onLoad(): void {
        if (this.upgradesJson?.json) {
            this._defs = this.upgradesJson.json.upgrades ?? [];
        }

        EventBus.on<{ newLevel: number }>(GameEvents.PLAYER_LEVEL_UP, ({ newLevel }) => {
            this._onLevelUp(newLevel);
        });

        EventBus.on<{ upgradeId: string }>(GameEvents.UPGRADE_CHOSEN, ({ upgradeId }) => {
            this._applyUpgrade(upgradeId);
        });
    }

    private _onLevelUp(newLevel: number): void {
        const options = this._pickOptions();
        // Re-emit level up with filled options for UpgradePanel
        EventBus.emit(GameEvents.UI_UPGRADE_PANEL_OPEN);
        EventBus.emit(GameEvents.PLAYER_LEVEL_UP, { newLevel, options });
    }

    /** Weighted random without replacement — respects maxStacks */
    private _pickOptions(): IUpgradeDef[] {
        // Filter to upgrades the player can still take
        const available = this._defs.filter(d => {
            if (!this.playerStats) return true;
            if (d.maxStacks === -1) return true;
            return this.playerStats.getStacks(d.id) < d.maxStacks;
        });

        if (available.length === 0) return [];

        const result: IUpgradeDef[] = [];
        const pool = [...available];

        for (let i = 0; i < OPTIONS_COUNT && pool.length > 0; i++) {
            const totalWeight = pool.reduce((sum, d) => sum + d.weight, 0);
            let r = Math.random() * totalWeight;

            for (let j = 0; j < pool.length; j++) {
                r -= pool[j].weight;
                if (r <= 0) {
                    result.push(pool[j]);
                    pool.splice(j, 1);
                    break;
                }
            }
        }
        return result;
    }

    private _applyUpgrade(id: string): void {
        const def = this._defs.find(d => d.id === id);
        if (!def || !this.playerStats) return;

        const applied = this.playerStats.applyUpgrade(def);
        if (applied) {
            AnalyticsService.trackUpgradeChosen(id, this.playerStats.level);
        }

        EventBus.emit(GameEvents.UI_UPGRADE_PANEL_CLOSE);
    }
}
