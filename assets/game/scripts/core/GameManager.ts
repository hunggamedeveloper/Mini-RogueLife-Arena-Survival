// ============================================================
// GameManager.ts — Root singleton Component on Gameplay scene.
// Owns StateMachine, references all sub-managers.
// ============================================================

import { _decorator, Component, Node, director } from 'cc';
import { GameState, IGameResult } from '../../../shared/scripts/types/GameTypes';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { StateMachine } from './StateMachine';
import { EventBus } from './EventBus';
import { EnemyBase } from '../enemy/EnemyBase';
import { EnemySpawner } from '../enemy/EnemySpawner';
import { SaveService } from '../../../shared/scripts/services/SaveService';

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
    @property(EnemySpawner) enemySpawner: EnemySpawner = null!;

    /** Exposed for AutoShooter nearest-enemy lookup */
    get activeEnemies(): ReadonlyArray<EnemyBase> {
        return this.enemySpawner?.activeEnemies ?? [];
    }

    private _sm: StateMachine = new StateMachine();
    private _elapsedTime: number = 0;
    private _killCount: number = 0;
    private _isGameActive: boolean = false;

    get stateMachine(): StateMachine { return this._sm; }
    get elapsedTime(): number { return this._elapsedTime; }
    get killCount(): number { return this._killCount; }

    onLoad(): void {
        if (GameManager._instance && GameManager._instance !== this) {
            this.destroy();
            return;
        }
        GameManager._instance = this;
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
                this._isGameActive = true;
                this._elapsedTime = 0;
                this._killCount = 0;
                EventBus.emit(GameEvents.GAME_START);
            },
            onExit: (_next) => {
                this._isGameActive = false;
            },
            onUpdate: (_dt) => {},
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
