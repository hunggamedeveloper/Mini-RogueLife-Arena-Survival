// ============================================================
// PoolManager.ts — Central pool registry.
// Holds pre-warmed ObjectPool instances for every poolable type.
// Place as Component on Gameplay scene root alongside GameManager.
// ============================================================

import { _decorator, Component, Node, Prefab } from 'cc';
import { ObjectPool } from './ObjectPool';

const { ccclass, property } = _decorator;

@ccclass('PoolManager')
export class PoolManager extends Component {

    private static _instance: PoolManager | null = null;
    static get instance(): PoolManager | null { return PoolManager._instance; }

    // ---- Prefab references — assign in Inspector ----
    @property(Prefab) bulletPlayerPrefab: Prefab = null!;
    @property(Prefab) bulletEnemyPrefab:  Prefab = null!;
    @property(Prefab) enemyMeleePrefab:   Prefab = null!;
    @property(Prefab) enemyRangedPrefab:  Prefab = null!;
    @property(Prefab) enemyTankPrefab:    Prefab = null!;
    @property(Prefab) hitEffectPrefab:    Prefab = null!;
    @property(Prefab) deathEffectPrefab:  Prefab = null!;

    // ---- Pool container node (off render tree) ----
    @property(Node) poolContainer: Node = null!;

    private _pools: Map<string, any> = new Map();

    onLoad(): void {
        PoolManager._instance = this;
    }

    start(): void {
        this._initPools();
    }

    onDestroy(): void {
        if (PoolManager._instance === this) {
            PoolManager._instance = null;
        }
        this._pools.forEach(pool => pool.clear());
        this._pools.clear();
    }

    private _initPools(): void {
        if (this.bulletPlayerPrefab)
            this._pools.set('bulletPlayer', new ObjectPool(this.bulletPlayerPrefab, this.poolContainer, 50, 20, 'Projectile'));
        if (this.bulletEnemyPrefab)
            this._pools.set('bulletEnemy',  new ObjectPool(this.bulletEnemyPrefab,  this.poolContainer, 50, 20, 'Projectile'));
        if (this.enemyMeleePrefab)
            this._pools.set('enemyMelee',   new ObjectPool(this.enemyMeleePrefab,   this.poolContainer, 80, 30, 'EnemyMelee'));
        if (this.enemyRangedPrefab)
            this._pools.set('enemyRanged',  new ObjectPool(this.enemyRangedPrefab,  this.poolContainer, 40, 20, 'EnemyRanged'));
        if (this.enemyTankPrefab)
            this._pools.set('enemyTank',    new ObjectPool(this.enemyTankPrefab,    this.poolContainer, 20, 10, 'EnemyTank'));
        if (this.hitEffectPrefab)
            this._pools.set('hitEffect',    new ObjectPool(this.hitEffectPrefab,    this.poolContainer, 30, 10, 'HitEffect'));
        if (this.deathEffectPrefab)
            this._pools.set('deathEffect',  new ObjectPool(this.deathEffectPrefab,  this.poolContainer, 20, 10));
    }

    get<T>(key: string, parent: Node): T | null {
        const pool = this._pools.get(key);
        if (!pool) {
            console.warn(`[PoolManager] Pool not found: ${key}`);
            return null;
        }
        return pool.get(parent) as T;
    }

    put(key: string, comp: any): void {
        this._pools.get(key)?.put(comp);
    }

    getActiveNodes(key: string): ReadonlySet<Node> | null {
        return this._pools.get(key)?.activeNodes ?? null;
    }

    getStats(): { [key: string]: { active: number; free: number } } {
        const stats: { [key: string]: { active: number; free: number } } = {};
        this._pools.forEach((pool, key) => {
            stats[key] = { active: pool.activeCount, free: pool.freeCount };
        });
        return stats;
    }
}
