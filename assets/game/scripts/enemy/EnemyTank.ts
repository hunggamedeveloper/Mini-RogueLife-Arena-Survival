// ============================================================
// EnemyTank.ts — Slow, high HP, deals heavy melee damage.
// ============================================================

import { _decorator } from 'cc';
import { EnemyBase } from './EnemyBase';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass } = _decorator;

@ccclass('EnemyTank')
export class EnemyTank extends EnemyBase {

    private _attackCooldown: number = 0;
    private readonly ATTACK_RATE = 0.5;

    protected onUpdate(dt: number): void {
        this.moveTowardsPlayer(dt);

        this._attackCooldown -= dt;
        if (this._attackCooldown <= 0 && this._def) {
            const dist = this.distToPlayer();
            if (dist <= (this._def.attackRange + 30)) {
                this._attackCooldown = 1 / this.ATTACK_RATE;
                EventBus.emit(GameEvents.PLAYER_DAMAGED, {
                    amount:      this._def.damage,
                    hpRemaining: -1,
                });
                EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'player_hurt' });
            }
        }
    }

    onGetFromPool(): void {
        super.onGetFromPool();
        this._attackCooldown = 0.5;
    }
}
