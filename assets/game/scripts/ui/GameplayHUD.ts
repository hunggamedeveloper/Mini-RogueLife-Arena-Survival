// ============================================================
// GameplayHUD.ts — In-game HUD: HP bar, EXP bar, timer, kills.
// Only listens to EventBus — no direct gameplay component refs.
// ============================================================

import { _decorator, Component, Label, ProgressBar } from 'cc';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('GameplayHUD')
export class GameplayHUD extends Component {

    @property(ProgressBar) hpBar:   ProgressBar = null!;
    @property(ProgressBar) expBar:  ProgressBar = null!;
    @property(Label)       hpLabel: Label       = null!;
    @property(Label)       timerLabel: Label    = null!;
    @property(Label)       killsLabel: Label    = null!;
    @property(Label)       levelLabel: Label    = null!;
    @property(Label)       waveLabel:  Label    = null!;

    private _hpMax:      number = 100;
    private _expRequired:number = 20;
    private _waveTimer:  number = 0;
    private _waveMsgDur: number = 2;

    onLoad(): void {
        EventBus.on<{ amount: number; hpRemaining: number }>(
            GameEvents.PLAYER_DAMAGED,
            ({ hpRemaining }) => this._updateHP(hpRemaining),
        );

        EventBus.on<{ amount: number; total: number; required: number }>(
            GameEvents.PLAYER_EXP_GAINED,
            ({ total, required }) => {
                if (required > 0) {
                    this._expRequired = required;
                    if (this.expBar) this.expBar.progress = Math.min(total / required, 1);
                }
            },
        );

        EventBus.on<{ newLevel: number }>(GameEvents.PLAYER_LEVEL_UP, ({ newLevel }) => {
            if (this.levelLabel) this.levelLabel.string = `Lv.${newLevel}`;
        });

        EventBus.on<{ waveId: number }>(GameEvents.WAVE_STARTED, ({ waveId }) => {
            if (this.waveLabel) {
                this.waveLabel.string  = `Wave ${waveId}`;
                this.waveLabel.node.active = true;
                this._waveTimer = this._waveMsgDur;
            }
        });

        // Capture hpMax from first damage event baseline
        EventBus.on(GameEvents.GAME_START, () => this._resetDisplay());
    }

    onDestroy(): void {
        // EventBus.clear() called by GameManager.onDestroy
    }

    update(dt: number): void {
        // Timer
        const gm = GameManager.instance;
        if (gm) {
            const t = gm.elapsedTime;
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            if (this.timerLabel) this.timerLabel.string = `${m}:${s.toString().padStart(2, '0')}`;
            if (this.killsLabel) this.killsLabel.string = `${gm.killCount}`;
        }

        // Wave label fade
        if (this._waveTimer > 0) {
            this._waveTimer -= dt;
            if (this._waveTimer <= 0 && this.waveLabel) {
                this.waveLabel.node.active = false;
            }
        }
    }

    private _updateHP(hpRemaining: number): void {
        if (this.hpBar)   this.hpBar.progress = Math.max(0, hpRemaining / this._hpMax);
        if (this.hpLabel) this.hpLabel.string  = `${Math.ceil(hpRemaining)}/${this._hpMax}`;
    }

    private _resetDisplay(): void {
        if (this.hpBar)    this.hpBar.progress  = 1;
        if (this.expBar)   this.expBar.progress  = 0;
        if (this.timerLabel) this.timerLabel.string = '0:00';
        if (this.killsLabel) this.killsLabel.string = '0';
        if (this.levelLabel) this.levelLabel.string = 'Lv.1';
        if (this.waveLabel)  this.waveLabel.node.active = false;
    }

    setHpMax(max: number): void {
        this._hpMax = max;
    }
}
