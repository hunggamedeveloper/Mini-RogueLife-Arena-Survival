// ============================================================
// PlayerStats.ts — Runtime stat container for the player.
// applyUpgrade() is the single entry point for all upgrades.
// No upgrade-specific logic lives here — that's UpgradeManager's job.
// ============================================================

import { _decorator, Component } from 'cc';
import { UpgradeStat, IUpgradeDef } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass, property } = _decorator;

@ccclass('PlayerStats')
export class PlayerStats extends Component {

    // ---- Base stats (tweak in Inspector) ----
    @property hpMax:           number = 100;
    @property moveSpeed:       number = 200;
    @property damage:          number = 10;
    @property fireRate:        number = 2;    // shots per second
    @property projectileCount: number = 1;
    @property expGainMult:     number = 1.0;

    // ---- Runtime ----
    hpCurrent:   number = 0;
    expCurrent:  number = 0;
    expRequired: number = 20;
    level:       number = 1;

    // Track stacks per upgrade id
    private _stacks: Map<string, number> = new Map();

    onLoad(): void {
        this.hpCurrent   = this.hpMax;
        this.expRequired = this._expForLevel(this.level);

        // Listen to enemy deaths to collect EXP
        EventBus.on<{ type: string; posX: number; posY: number }>(
            GameEvents.ENEMY_DIED,
            (_payload) => {
                // expReward encoded in payload requires EnemyBase to emit it
                // We handle it via direct call from EnemyBase._die() instead — no-op here
            },
        );

        // Direct damage from enemy attacks
        EventBus.on<{ amount: number; hpRemaining: number }>(
            GameEvents.PLAYER_DAMAGED,
            ({ amount, hpRemaining }) => {
                if (hpRemaining === -1) {
                    // Enemy attack — amount is raw damage
                    this.takeDamage(amount);
                }
            },
        );
    }

    // ---- EXP / Level ----

    addExp(amount: number): void {
        const gained = amount * this.expGainMult;
        this.expCurrent += gained;
        EventBus.emit(GameEvents.PLAYER_EXP_GAINED, {
            amount:   gained,
            total:    this.expCurrent,
            required: this.expRequired,
        });

        while (this.expCurrent >= this.expRequired) {
            this.expCurrent -= this.expRequired;
            this.level++;
            this.expRequired = this._expForLevel(this.level);
            EventBus.emit(GameEvents.PLAYER_LEVEL_UP, { newLevel: this.level, options: [] });
            // UpgradeManager listens and fills options via a follow-up emit
        }
    }

    private _expForLevel(level: number): number {
        return Math.floor(20 * Math.pow(1.3, level - 1));
    }

    // ---- Damage / Heal ----

    takeDamage(amount: number): void {
        this.hpCurrent = Math.max(0, this.hpCurrent - amount);
        EventBus.emit(GameEvents.PLAYER_DAMAGED, { amount, hpRemaining: this.hpCurrent });

        if (this.hpCurrent <= 0) {
            EventBus.emit(GameEvents.PLAYER_DIED);
        }
    }

    heal(amount: number): void {
        this.hpCurrent = Math.min(this.hpMax, this.hpCurrent + amount);
        EventBus.emit(GameEvents.PLAYER_HEALED, { amount });
    }

    // ---- Upgrade ----

    applyUpgrade(def: IUpgradeDef): boolean {
        const stacks = this._stacks.get(def.id) ?? 0;
        if (def.maxStacks !== -1 && stacks >= def.maxStacks) return false;

        this._stacks.set(def.id, stacks + 1);

        switch (def.stat) {
            case UpgradeStat.Damage:
                this.damage = def.applyMode === 'add'
                    ? this.damage + def.value
                    : this.damage * def.value;
                break;
            case UpgradeStat.FireRate:
                this.fireRate = def.applyMode === 'add'
                    ? this.fireRate + def.value
                    : this.fireRate * def.value;
                break;
            case UpgradeStat.ProjectileCount:
                this.projectileCount = def.applyMode === 'add'
                    ? this.projectileCount + def.value
                    : Math.round(this.projectileCount * def.value);
                break;
            case UpgradeStat.MoveSpeed:
                this.moveSpeed = def.applyMode === 'add'
                    ? this.moveSpeed + def.value
                    : this.moveSpeed * def.value;
                break;
            case UpgradeStat.HPMax: {
                const oldMax = this.hpMax;
                this.hpMax = def.applyMode === 'add'
                    ? this.hpMax + def.value
                    : this.hpMax * def.value;
                // Scale current HP proportionally
                this.hpCurrent = Math.round(this.hpCurrent * (this.hpMax / oldMax));
                break;
            }
            case UpgradeStat.ExpGain:
                this.expGainMult = def.applyMode === 'add'
                    ? this.expGainMult + def.value
                    : this.expGainMult * def.value;
                break;
        }

        EventBus.emit(GameEvents.UPGRADE_APPLIED, def);
        return true;
    }

    getStacks(upgradeId: string): number {
        return this._stacks.get(upgradeId) ?? 0;
    }
}
