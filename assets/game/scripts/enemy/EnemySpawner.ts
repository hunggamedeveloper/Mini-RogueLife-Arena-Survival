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
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { PlayerStats } from '../player/PlayerStats';

const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {

    @property(Node)     enemyParent: Node     = null!;
    @property(Node)     playerNode:  Node     = null!;
    @property(ArenaMap) arenaMap:    ArenaMap = null!;

    private _activeEnemies: EnemyBase[] = [];
    private _playerStats: PlayerStats | null = null;

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

        if (!this._playerStats) {
            this._playerStats = this.playerNode.getComponent(PlayerStats);
        }
        enemy.init(def, this.playerNode, this._playerStats!);

        // Spawn outside visible area, around the player
        const plPos = this.playerNode.worldPosition;
        const edge  = this._randomOffscreenOffset(600);
        enemy.node.setWorldPosition(plPos.x + edge.x, plPos.y + edge.y, 0);

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

    /** Random offset that lands outside the visible screen */
    private _randomOffscreenOffset(dist: number): { x: number; y: number } {
        const angle = Math.random() * Math.PI * 2;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    }

    private _poolKeyForType(type: EnemyType): string {
        switch (type) {
            case EnemyType.Melee:  return 'enemyMelee';
            case EnemyType.Ranged: return 'enemyRanged';
            case EnemyType.Tank:   return 'enemyTank';
        }
    }
}
