// ============================================================
// EnemySpawner.ts — Instantiates enemies from pool at arena edges.
// Receives spawn orders from WaveManager.
// Maintains the live activeEnemies array for GameManager.
// ============================================================

import { _decorator, Component, Node } from 'cc';
import { IEnemyDef, EnemyType } from '../../../shared/scripts/types/GameTypes';
import { PoolManager } from '../pool/PoolManager';
import { EnemyBase } from './EnemyBase';
import { EnemyMelee } from './EnemyMelee';
import { EnemyRanged } from './EnemyRanged';
import { EnemyTank } from './EnemyTank';
import { ArenaMap } from '../map/ArenaMap';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {

    @property(Node)     enemyParent: Node     = null!;
    @property(Node)     playerNode:  Node     = null!;
    @property(ArenaMap) arenaMap:    ArenaMap = null!;

    private _activeEnemies: EnemyBase[] = [];

    get activeEnemies(): ReadonlyArray<EnemyBase> { return this._activeEnemies; }

    onLoad(): void {
        EventBus.on<{ type: EnemyType }>(GameEvents.ENEMY_SPAWNED, () => {});
        EventBus.on<{ type: EnemyType }>(GameEvents.ENEMY_DIED, ({ type }) => {
            this._pruneInactive();
        });
    }

    onDestroy(): void {
        this._activeEnemies.length = 0;
    }

    spawnBatch(def: IEnemyDef, count: number): void {
        for (let i = 0; i < count; i++) {
            this._spawnOne(def);
        }
    }

    private _spawnOne(def: IEnemyDef): void {
        const pm = PoolManager.instance;
        if (!pm) return;

        const poolKey = this._poolKeyForType(def.type);
        const enemy   = pm.get<EnemyBase>(poolKey, this.enemyParent);
        if (!enemy) return;

        enemy.init(def, this.playerNode);

        // Place at random arena edge
        const spawnPos = this.arenaMap
            ? this.arenaMap.randomEdgePoint(20)
            : { x: (Math.random() - 0.5) * 1400, y: (Math.random() - 0.5) * 800 };

        enemy.node.setWorldPosition(spawnPos.x, spawnPos.y, 0);

        this._activeEnemies.push(enemy);
        EventBus.emit(GameEvents.ENEMY_SPAWNED, { type: def.type });
    }

    /** Remove dead enemies from the active list */
    private _pruneInactive(): void {
        let write = 0;
        for (let i = 0; i < this._activeEnemies.length; i++) {
            const e = this._activeEnemies[i];
            if (e.isValid && e.node.active) {
                this._activeEnemies[write++] = e;
            }
        }
        this._activeEnemies.length = write;
    }

    private _poolKeyForType(type: EnemyType): string {
        switch (type) {
            case EnemyType.Melee:  return 'enemyMelee';
            case EnemyType.Ranged: return 'enemyRanged';
            case EnemyType.Tank:   return 'enemyTank';
        }
    }
}
