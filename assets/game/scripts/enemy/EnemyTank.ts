// ============================================================
// EnemyTank.ts — Slow, high HP, deals heavy melee damage.
// ============================================================

import { _decorator, Component } from 'cc';
import { EnemyBase } from './EnemyBase';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { PoolManager } from '../pool/PoolManager';

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

                // Spawn hit VFX at player position
                const plPos = this._playerNode!.worldPosition;
                const vfx = PoolManager.instance?.get<Component>('hitEffect', this.node.parent!);
                if (vfx) vfx.node.setWorldPosition(plPos);
            }
        }
    }

    onGetFromPool(): void {
        super.onGetFromPool();
        this._attackCooldown = 0.5;
    }
}
