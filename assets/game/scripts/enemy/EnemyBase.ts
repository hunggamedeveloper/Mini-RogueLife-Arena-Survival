// ============================================================
// EnemyBase.ts — Base class for all enemy types.
// Handles HP, death, EXP drop, collision with player bullets,
// and returning self to pool.
// Subclasses override onUpdate() for behavior.
// ============================================================

import { _decorator, Component, Vec3, Node } from 'cc';
import { IPoolable, IEnemyDef, EnemyType } from '../../../shared/scripts/types/GameTypes';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { PoolManager } from '../pool/PoolManager';
import { Projectile } from '../projectile/Projectile';

// GameManager imported lazily to avoid circular dependency
type PlayerStatsRef = import('../player/PlayerStats').PlayerStats;

const { ccclass, property } = _decorator;

@ccclass('EnemyBase')
export class EnemyBase extends Component implements IPoolable {

    protected _def: IEnemyDef | null = null;
    protected _hp:  number = 1;
    protected _playerNode:  Node | null = null;
    protected _playerStats: PlayerStatsRef | null = null;

    // Pre-allocated Vec3 for movement — no GC in update
    private _moveVec: Vec3 = new Vec3();

    protected _poolKey: string = 'enemyMelee';

    // ---- Pool lifecycle ----

    onGetFromPool(): void {
        if (this._def) this._hp = this._def.hp;
        this.node.active = true;
    }

    onReturnToPool(): void {
        this.node.active = false;
    }

    // ---- Init ----

    init(def: IEnemyDef, playerNode: Node, playerStats?: PlayerStatsRef): void {
        this._def         = def;
        this._hp          = def.hp;
        this._playerNode  = playerNode;
        this._playerStats = playerStats ?? null;
        this._poolKey     = this._poolKeyForType(def.type);
    }

    // ---- Lifecycle ----

    update(dt: number): void {
        if (!this._def || !this._playerNode) return;
        if (!EventBus.playing) return;
        this.onUpdate(dt);
    }

    /** Override in subclasses for AI behavior */
    protected onUpdate(_dt: number): void {}

    // ---- Movement helpers ----

    protected moveTowardsPlayer(dt: number): void {
        if (!this._def || !this._playerNode) return;
        const myPos = this.node.worldPosition;
        const plPos = this._playerNode.worldPosition;

        const dx  = plPos.x - myPos.x;
        const dy  = plPos.y - myPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;

        const speed = this._def.moveSpeed;
        Vec3.set(this._moveVec, (dx / len) * speed * dt, (dy / len) * speed * dt, 0);
        this.node.translate(this._moveVec);
    }

    protected distToPlayer(): number {
        if (!this._playerNode) return Infinity;
        const myPos = this.node.worldPosition;
        const plPos = this._playerNode.worldPosition;
        const dx    = plPos.x - myPos.x;
        const dy    = plPos.y - myPos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ---- Combat ----

    /** Called from Projectile collision detection */
    takeDamage(amount: number): void {
        this._hp -= amount;
        EventBus.emit(GameEvents.ENEMY_DAMAGED, { hpRemaining: this._hp });

        if (this._hp <= 0) {
            this._die();
        }
    }

    /** AABB overlap — bullet treated as point vs enemy rect */
    checkBulletCollision(bullets: Projectile[]): void {
        const myPos = this.node.worldPosition;
        const hw = this._def?.hitHalfW ?? 40;
        const hh = this._def?.hitHalfH ?? 22;

        for (const b of bullets) {
            if (!b.isValid || !b.node.active || !b.isPlayerOwned) continue;
            const bp = b.node.worldPosition;
            const dx = bp.x - myPos.x;
            const dy = bp.y - myPos.y;
            if (dx > -hw && dx < hw && dy > -hh && dy < hh) {
                b.registerHit();
                this.takeDamage(b.damage);
                if (!this.node.active) break;
            }
        }
    }

    protected _die(): void {
        const pos = this.node.worldPosition;
        EventBus.emit(GameEvents.ENEMY_DIED, { type: this._def!.type, posX: pos.x, posY: pos.y });
        EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'enemy_death' });

        // Spawn death VFX from pool
        const vfx = PoolManager.instance?.get<Component>('deathEffect', this.node.parent!);
        if (vfx) vfx.node.setWorldPosition(pos);

        // Drop EXP directly into PlayerStats
        this._playerStats?.addExp(this._def!.expReward);

        PoolManager.instance?.put(this._poolKey, this);
    }

    get enemyDef(): IEnemyDef | null { return this._def; }

    private _poolKeyForType(type: EnemyType): string {
        switch (type) {
            case EnemyType.Melee:  return 'enemyMelee';
            case EnemyType.Ranged: return 'enemyRanged';
            case EnemyType.Tank:   return 'enemyTank';
        }
    }
}
