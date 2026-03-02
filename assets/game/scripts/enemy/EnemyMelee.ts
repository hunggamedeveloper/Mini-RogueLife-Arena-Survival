// ============================================================
// EnemyMelee.ts — Chases player, deals contact damage.
// ============================================================

import { _decorator, Component } from 'cc';
import { EnemyBase } from './EnemyBase';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { PoolManager } from '../pool/PoolManager';

const { ccclass } = _decorator;

@ccclass('EnemyMelee')
export class EnemyMelee extends EnemyBase {

    private _attackCooldown: number = 0;
    private readonly ATTACK_RATE = 1.0; // attacks per second

    protected onUpdate(dt: number): void {
        this.moveTowardsPlayer(dt);

        this._attackCooldown -= dt;
        if (this._attackCooldown <= 0 && this._def) {
            const dist = this.distToPlayer();
            if (dist <= (this._def.attackRange + 20)) {
                this._attackCooldown = 1 / this.ATTACK_RATE;
                EventBus.emit(GameEvents.PLAYER_DAMAGED, {
                    amount:      this._def.damage,
                    hpRemaining: -1,    // PlayerStats resolves actual HP
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
        this._attackCooldown = 0;
    }
}
