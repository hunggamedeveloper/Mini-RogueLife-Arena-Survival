// ============================================================
// DebugOverlay.ts — FPS + enemy count + bullet count + pool sizes.
// Toggle with backtick (`) in editor builds.
// ============================================================

import { _decorator, Component, Label, KeyCode, input, Input, EventKeyboard, Node } from 'cc';
import { PoolManager } from '../pool/PoolManager';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { IDebugData } from '../../../shared/scripts/types/GameTypes';
import { GameManager } from '../core/GameManager';
import { EnemySpawner } from '../enemy/EnemySpawner';

const { ccclass, property } = _decorator;

const UPDATE_INTERVAL = 0.25; // seconds between stat refresh

@ccclass('DebugOverlay')
export class DebugOverlay extends Component {

    @property(Node)        content:      Node         = null!;
    @property(Label)       fpsLabel:     Label        = null!;
    @property(Label)       enemyLabel:   Label        = null!;
    @property(Label)       bulletLabel:  Label        = null!;
    @property(Label)       poolLabel:    Label        = null!;
    @property(EnemySpawner)spawner:      EnemySpawner = null!;

    private _timer:       number = 0;
    private _frameCount:  number = 0;
    private _fpsAccum:    number = 0;
    private _lastFPS:     number = 0;

    onLoad(): void {
        input.on(Input.EventType.KEY_DOWN, this._onKey, this);
        // Default: hidden in release, shown in debug
        this.content.active = true; // flip to false before release build
    }

    onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this._onKey, this);
    }

    update(dt: number): void {
        if (!this.content.active) return;

        // FPS tracking
        this._frameCount++;
        this._fpsAccum += dt;

        this._timer += dt;
        if (this._timer < UPDATE_INTERVAL) return;
        this._timer -= UPDATE_INTERVAL;

        this._lastFPS   = Math.round(this._frameCount / this._fpsAccum);
        this._frameCount = 0;
        this._fpsAccum   = 0;

        const pm          = PoolManager.instance;
        const poolStats   = pm?.getStats() ?? {};
        const enemyCount  = this.spawner?.activeEnemies.length ?? 0;
        const bulletActive= (poolStats['bulletPlayer']?.active ?? 0) + (poolStats['bulletEnemy']?.active ?? 0);

        if (this.fpsLabel)    this.fpsLabel.string    = `FPS: ${this._lastFPS}`;
        if (this.enemyLabel)  this.enemyLabel.string  = `Enemies: ${enemyCount}`;
        if (this.bulletLabel) this.bulletLabel.string = `Bullets: ${bulletActive}`;

        if (this.poolLabel) {
            const lines = Object.entries(poolStats)
                .map(([k, v]) => `${k}: ${v.active}/${v.active + v.free}`)
                .join('\n');
            this.poolLabel.string = lines;
        }

        // Broadcast for external tools
        EventBus.emit<IDebugData>(GameEvents.DEBUG_UPDATE, {
            fps:         this._lastFPS,
            enemyCount,
            bulletCount: bulletActive,
            poolSizes:   poolStats,
        });
    }

    private _onKey(evt: EventKeyboard): void {
        if (evt.keyCode === KeyCode.BACKQUOTE) {
            this.content.active = !this.content.active;
        }
    }
}
