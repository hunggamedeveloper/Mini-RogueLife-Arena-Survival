// ============================================================
// Projectile.ts — Shared component for player and enemy bullets.
// Self-returns to pool when range exceeded or hit registered.
// No allocations in update() — all state stored on instance.
// ============================================================

import { _decorator, Component, Vec3 } from 'cc';
import { IPoolable, IProjectileData } from '../../../shared/scripts/types/GameTypes';
import { PoolManager } from '../pool/PoolManager';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass } = _decorator;

@ccclass('Projectile')
export class Projectile extends Component implements IPoolable {

    private _damage:        number  = 0;
    private _speed:         number  = 0;
    private _dirX:          number  = 1;
    private _dirY:          number  = 0;
    private _isPlayerOwned: boolean = true;
    private _maxRange:      number  = 600;
    private _pierce:        number  = 0;
    private _travelDist:    number  = 0;
    private _pierceCount:   number  = 0;
    private _poolKey:       string  = 'bulletPlayer';

    // Pre-allocated Vec3 to avoid GC in update
    private _delta: Vec3 = new Vec3();

    init(data: IProjectileData): void {
        this._damage        = data.damage;
        this._speed         = data.speed;
        this._dirX          = data.dirX;
        this._dirY          = data.dirY;
        this._isPlayerOwned = data.isPlayerOwned;
        this._maxRange      = data.maxRange;
        this._pierce        = data.pierce;
        this._poolKey       = data.isPlayerOwned ? 'bulletPlayer' : 'bulletEnemy';
    }

    // ---- IPoolable ----

    onGetFromPool(): void {
        this._travelDist  = 0;
        this._pierceCount = 0;
    }

    onReturnToPool(): void {}

    // ---- Lifecycle ----

    update(dt: number): void {
        if (!EventBus.playing) return;
        const dist = this._speed * dt;
        this._travelDist += dist;

        // Reuse _delta to avoid Vec3 allocation
        Vec3.set(this._delta, this._dirX * dist, this._dirY * dist, 0);
        this.node.translate(this._delta);

        if (this._travelDist >= this._maxRange) {
            this._returnToPool();
        }
    }

    /** Called by EnemyBase or PlayerStats when a collision is detected */
    registerHit(): boolean {
        const pos = this.node.worldPosition;
        EventBus.emit(GameEvents.BULLET_HIT, { posX: pos.x, posY: pos.y });
        EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'hit' });

        // Spawn hit VFX at impact point
        const vfx = PoolManager.instance?.get<Component>('hitEffect', this.node.parent!);
        if (vfx) vfx.node.setWorldPosition(pos.x, pos.y, pos.z);

        this._pierceCount++;
        if (this._pierceCount > this._pierce) {
            this._returnToPool();
            return true; // destroyed
        }
        return false;
    }

    get damage():        number  { return this._damage; }
    get isPlayerOwned(): boolean { return this._isPlayerOwned; }

    private _returnToPool(): void {
        PoolManager.instance?.put(this._poolKey, this);
    }
}
