// ============================================================
// EnemyRanged.ts — Keeps distance, periodically fires bullets.
// ============================================================

import { _decorator, Node } from 'cc';
import { EnemyBase } from './EnemyBase';
import { IEnemyDef, IProjectileData } from '../../../shared/scripts/types/GameTypes';
import { PoolManager } from '../pool/PoolManager';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass } = _decorator;

const PREFERRED_DIST = 300;
const RETREAT_DIST   = 180;

@ccclass('EnemyRanged')
export class EnemyRanged extends EnemyBase {

    private _fireCooldown: number = 0;

    protected onUpdate(dt: number): void {
        if (!this._def || !this._playerNode) return;

        const dist = this.distToPlayer();

        if (dist < RETREAT_DIST) {
            // Move away from player
            this._moveAwayFromPlayer(dt);
        } else if (dist > PREFERRED_DIST + 50) {
            // Close gap
            this.moveTowardsPlayer(dt);
        }
        // else: stay in preferred range

        this._fireCooldown -= dt;
        if (this._fireCooldown <= 0) {
            this._fireCooldown = 1 / (this._def.fireRate ?? 1.0);
            this._shoot();
        }
    }

    onGetFromPool(): void {
        super.onGetFromPool();
        this._fireCooldown = 1.0;
    }

    private _shoot(): void {
        if (!this._def || !this._playerNode) return;

        const myPos = this.node.worldPosition;
        const plPos = this._playerNode.worldPosition;
        const dx    = plPos.x - myPos.x;
        const dy    = plPos.y - myPos.y;
        const len   = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;

        const data: IProjectileData = {
            damage:        this._def.damage,
            speed:         this._def.bulletSpeed ?? 200,
            dirX:          dx / len,
            dirY:          dy / len,
            isPlayerOwned: false,
            maxRange:      500,
            pierce:        0,
        };

        const proj = PoolManager.instance?.get<import('../projectile/Projectile').Projectile>(
            'bulletEnemy',
            this.node.parent!,
        );
        if (proj) {
            proj.node.setWorldPosition(myPos);
            proj.init(data);
        }

        EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'shoot' });
    }

    private _moveAwayFromPlayer(dt: number): void {
        if (!this._def || !this._playerNode) return;
        const myPos = this.node.worldPosition;
        const plPos = this._playerNode.worldPosition;
        const dx    = myPos.x - plPos.x;
        const dy    = myPos.y - plPos.y;
        const len   = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const speed = this._def.moveSpeed;
        this.node.translate((dx / len) * speed * dt, (dy / len) * speed * dt, 0);
    }
}
