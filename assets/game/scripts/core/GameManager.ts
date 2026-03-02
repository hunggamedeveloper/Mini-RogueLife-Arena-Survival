// ============================================================
// GameManager.ts — Root singleton Component on Gameplay scene.
// Owns StateMachine, references all sub-managers.
// ============================================================

import { _decorator, Component, Node, director } from 'cc';
import { GameState, IGameResult } from '../../../shared/scripts/types/GameTypes';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { StateMachine } from './StateMachine';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { EnemyBase } from '../enemy/EnemyBase';
import { EnemySpawner } from '../enemy/EnemySpawner';
import { Projectile } from '../projectile/Projectile';
import { PoolManager } from '../pool/PoolManager';
import { PlayerStats } from '../player/PlayerStats';
import { SaveService } from '../../../shared/scripts/services/SaveService';
import { AudioService } from '../../../shared/scripts/services/AudioService';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    private static _instance: GameManager | null = null;
    static get instance(): GameManager | null { return GameManager._instance; }

    // Sub-manager references set via Inspector
    @property(Node) poolManagerNode:    Node = null!;
    @property(Node) waveManagerNode:    Node = null!;
    @property(Node) upgradeManagerNode: Node = null!;
    @property(Node) hudNode:            Node = null!;
    @property(Node) bgmNode:            Node = null!;
    @property(Node) sfxPoolNode:        Node = null!;
    @property(EnemySpawner) enemySpawner: EnemySpawner = null!;

    /** Exposed for AutoShooter nearest-enemy lookup */
    get activeEnemies(): ReadonlyArray<EnemyBase> {
        return this.enemySpawner?.activeEnemies ?? [];
    }

    private _sm: StateMachine = new StateMachine();
    private _elapsedTime: number = 0;
    private _killCount: number = 0;
    private _isGameActive: boolean = false;

    private _setPlaying(v: boolean): void {
        this._isGameActive = v;
        EventBus.playing = v;
    }

    // Reusable arrays to avoid allocation each frame
    private _bulletCache: Projectile[] = [];
    private _enemyBulletCache: Projectile[] = [];
    private _playerStats: PlayerStats | null = null;

    get stateMachine(): StateMachine { return this._sm; }
    get elapsedTime(): number { return this._elapsedTime; }
    get killCount(): number { return this._killCount; }
    get isPlaying(): boolean { return this._isGameActive; }

    onLoad(): void {
        if (GameManager._instance && GameManager._instance !== this) {
            this.destroy();
            return;
        }
        GameManager._instance = this;
        AudioService.init(this.bgmNode, this.sfxPoolNode);
        AudioService.preloadBundle('audio', ['gameplay_bgm', 'sfx_shoot', 'sfx_hit', 'sfx_death']);
        this._registerStates();
        this._registerListeners();
    }

    start(): void {
        this._sm.start(GameState.Gameplay);
    }

    onDestroy(): void {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
        EventBus.clear();
    }

    update(dt: number): void {
        this._sm.update(dt);
        if (this._isGameActive) {
            this._elapsedTime += dt;
        }
    }

    private _registerStates(): void {
        this._sm.register({
            name: GameState.Gameplay,
            onEnter: (_prev) => {
                this._setPlaying(true);
                this._elapsedTime = 0;
                this._killCount = 0;
                EventBus.emit(GameEvents.GAME_START);
            },
            onExit: (_next) => {
                this._setPlaying(false);
            },
            onUpdate: (_dt) => {
                this._checkCollisions();
            },
        });

        this._sm.register({
            name: GameState.Pause,
            onEnter: (_prev) => {
                EventBus.emit(GameEvents.GAME_PAUSE);
            },
            onExit: (_next) => {
                EventBus.emit(GameEvents.GAME_RESUME);
            },
            onUpdate: (_dt) => {},
        });

        this._sm.register({
            name: GameState.Result,
            onEnter: (_prev) => {},
            onExit: (_next) => {},
            onUpdate: (_dt) => {},
        });
    }

    private _registerListeners(): void {
        EventBus.on(GameEvents.GAME_PAUSE, () => {
            if (this._sm.currentState === GameState.Gameplay) {
                this._sm.transition(GameState.Pause);
            }
        });

        EventBus.on(GameEvents.GAME_RESUME, () => {
            if (this._sm.currentState === GameState.Pause) {
                this._sm.transition(GameState.Gameplay);
            }
        });

        EventBus.on<IGameResult>(GameEvents.GAME_OVER, (result) => {
            this._sm.transition(GameState.Result);
            EventBus.emit(GameEvents.UI_RESULT_OPEN, result);
        });

        EventBus.on(GameEvents.ENEMY_DIED, () => {
            this._killCount++;
        });

        EventBus.on<{ level: number }>(GameEvents.PLAYER_DIED, ({ level }) => {
            if (this._isGameActive) {
                this.triggerGameOver(level);
            }
        });

        // Pause/resume game time for upgrade panel without entering Pause state
        EventBus.on(GameEvents.UI_UPGRADE_PANEL_OPEN, () => {
            this._setPlaying(false);
        });
        EventBus.on(GameEvents.UI_UPGRADE_PANEL_CLOSE, () => {
            if (this._sm.currentState === GameState.Gameplay) {
                this._setPlaying(true);
            }
        });
    }

    private _checkCollisions(): void {
        const pm = PoolManager.instance;
        if (!pm) return;

        // --- Player bullets → Enemies ---
        const bulletNodes = pm.getActiveNodes('bulletPlayer');
        if (bulletNodes && bulletNodes.size > 0) {
            const enemies = this.enemySpawner?.activeEnemies;
            if (enemies && enemies.length > 0) {
                this._bulletCache.length = 0;
                for (const node of bulletNodes) {
                    if (!node.active) continue;
                    const proj = node.getComponent('Projectile') as Projectile;
                    if (proj) this._bulletCache.push(proj);
                }
                for (const enemy of enemies) {
                    if (!enemy.isValid || !enemy.node.active) continue;
                    enemy.checkBulletCollision(this._bulletCache);
                }
            }
        }

        // --- Enemy bullets → Player ---
        const enemyBulletNodes = pm.getActiveNodes('bulletEnemy');
        if (!enemyBulletNodes || enemyBulletNodes.size === 0) return;

        const playerNode = this.enemySpawner?.playerNode;
        if (!playerNode) return;

        if (!this._playerStats) {
            this._playerStats = playerNode.getComponent('PlayerStats') as PlayerStats;
        }
        if (!this._playerStats) return;

        const plPos = playerNode.worldPosition;
        const hitRadius = 30; // player hit radius px
        const hitRadiusSq = hitRadius * hitRadius;

        this._enemyBulletCache.length = 0;
        for (const node of enemyBulletNodes) {
            if (!node.active) continue;
            const proj = node.getComponent('Projectile') as Projectile;
            if (proj && !proj.isPlayerOwned) this._enemyBulletCache.push(proj);
        }

        for (const b of this._enemyBulletCache) {
            if (!b.isValid || !b.node.active) continue;
            const bp = b.node.worldPosition;
            const dx = bp.x - plPos.x;
            const dy = bp.y - plPos.y;
            if (dx * dx + dy * dy < hitRadiusSq) {
                b.registerHit();
                this._playerStats.takeDamage(b.damage);
            }
        }
    }

    triggerGameOver(level: number): void {
        const { newBestTime, newBestKills } = SaveService.submitResult(this._elapsedTime, this._killCount);
        const result: IGameResult = {
            survivalTime:   this._elapsedTime,
            killCount:      this._killCount,
            level,
            isNewBestTime:  newBestTime,
            isNewBestKills: newBestKills,
        };
        EventBus.emit(GameEvents.GAME_OVER, result);
    }

    goToLobby(): void {
        director.loadScene('Lobby');
    }
}
