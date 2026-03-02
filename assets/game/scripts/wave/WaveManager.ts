// ============================================================
// WaveManager.ts — Drives wave spawning from waves.json.
// Uses a timeline of IWaveDef trigger times.
// Between defined waves: continuous spawn with difficulty curve.
// ============================================================

import { _decorator, Component, JsonAsset } from 'cc';
import { IWaveDef, IEnemyDef, EnemyType } from '../../../shared/scripts/types/GameTypes';
import { EnemySpawner } from '../enemy/EnemySpawner';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { AnalyticsService } from '../../../shared/scripts/services/AnalyticsService';

const { ccclass, property } = _decorator;

@ccclass('WaveManager')
export class WaveManager extends Component {

    @property(JsonAsset)    wavesJson:      JsonAsset      = null!;
    @property(JsonAsset)    enemiesJson:    JsonAsset      = null!;
    @property(EnemySpawner) enemySpawner:   EnemySpawner   = null!;

    private _waves:       IWaveDef[]  = [];
    private _enemyDefs:   Map<string, IEnemyDef> = new Map();
    private _waveIndex:   number = 0;
    private _elapsed:     number = 0;

    // Sub-event timer within a wave
    private _pendingEvents: { triggerAt: number; def: IEnemyDef; count: number }[] = [];

    // Continuous spawn between waves
    private _continuousTimer: number = 0;
    private _continuousInterval: number = 5;

    onLoad(): void {
        this._loadEnemyDefs();
        this._loadWaves();

        EventBus.on(GameEvents.GAME_START, () => this._reset());
    }

    update(dt: number): void {
        if (!EventBus.playing) return;

        this._elapsed += dt;

        // Check next wave trigger
        if (this._waveIndex < this._waves.length) {
            const nextWave = this._waves[this._waveIndex];
            if (this._elapsed >= nextWave.triggerTime) {
                this._startWave(nextWave);
                this._waveIndex++;
            }
        }

        // Process pending spawn events for current wave
        for (let i = this._pendingEvents.length - 1; i >= 0; i--) {
            const ev = this._pendingEvents[i];
            if (this._elapsed >= ev.triggerAt) {
                this.enemySpawner.spawnBatch(ev.def, ev.count);
                this._pendingEvents.splice(i, 1);
            }
        }

        // Continuous background spawning
        this._continuousTimer -= dt;
        if (this._continuousTimer <= 0) {
            this._continuousTimer = this._continuousInterval;
            this._spawnContinuous();
        }
    }

    private _startWave(wave: IWaveDef): void {
        EventBus.emit(GameEvents.WAVE_STARTED, { waveId: wave.waveId });
        AnalyticsService.trackWaveReached(wave.waveId);

        for (const ev of wave.spawnEvents) {
            const def = this._defForType(ev.enemyType);
            if (!def) continue;
            this._pendingEvents.push({
                triggerAt: this._elapsed + ev.time,
                def,
                count: ev.count,
            });
        }
    }

    private _spawnContinuous(): void {
        // Difficulty: more enemies over time
        const diffFactor = 1 + Math.floor(this._elapsed / 45) * 0.25;
        const count      = Math.ceil(2 * diffFactor);
        const type       = this._randomEnemyType();
        const def        = this._defForType(type);
        if (def) this.enemySpawner.spawnBatch(def, count);
    }

    private _randomEnemyType(): EnemyType {
        const r = Math.random();
        if (r < 0.55) return EnemyType.Melee;
        if (r < 0.85) return EnemyType.Ranged;
        return EnemyType.Tank;
    }

    private _defForType(type: EnemyType): IEnemyDef | null {
        for (const [, def] of this._enemyDefs) {
            if (def.type === type) return def;
        }
        return null;
    }

    private _reset(): void {
        this._elapsed          = 0;
        this._waveIndex        = 0;
        this._continuousTimer  = 5;
        this._pendingEvents    = [];
    }

    private _loadEnemyDefs(): void {
        if (!this.enemiesJson?.json) return;
        const defs: IEnemyDef[] = this.enemiesJson.json.enemies ?? [];
        for (const d of defs) {
            this._enemyDefs.set(d.id, d);
        }
    }

    private _loadWaves(): void {
        if (!this.wavesJson?.json) return;
        this._waves = (this.wavesJson.json.waves ?? []) as IWaveDef[];
        this._waves.sort((a, b) => a.triggerTime - b.triggerTime);
    }
}
