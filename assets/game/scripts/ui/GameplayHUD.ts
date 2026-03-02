// ============================================================
// GameplayHUD.ts — In-game HUD: HP bar, EXP bar, timer, kills.
// Only listens to EventBus — no direct gameplay component refs.
// ============================================================

import { _decorator, Component, Label, ProgressBar, Button, input, Input, KeyCode, EventKeyboard } from 'cc';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { GameManager } from '../core/GameManager';
import { UpgradeStat, IUpgradeDef } from '../../../shared/scripts/types/GameTypes';

const { ccclass, property } = _decorator;

@ccclass('GameplayHUD')
export class GameplayHUD extends Component {

    @property(ProgressBar) hpBar:   ProgressBar = null!;
    @property(ProgressBar) expBar:  ProgressBar = null!;
    @property(Label)       hpLabel: Label       = null!;
    @property(Label)       expLabel: Label      = null!;
    @property(Label)       timerLabel: Label    = null!;
    @property(Label)       killsLabel: Label    = null!;
    @property(Label)       levelLabel: Label    = null!;
    @property(Label)       waveLabel:  Label    = null!;
    @property(Button)      pauseBtn:   Button   = null!;

    private _hpMax:       number = 100;
    private _hpCurrent:   number = 100;
    private _expRequired: number = 20;

    // Store callback references for EventBus cleanup
    private _onDamaged!:         (p: { amount: number; hpRemaining: number }) => void;
    private _onHealed!:          (p: { amount: number }) => void;
    private _onExpGained!:       (p: { amount: number; total: number; required: number }) => void;
    private _onLevelUp!:         (p: { newLevel: number }) => void;
    private _onWaveStarted!:     (p: { waveId: number }) => void;
    private _onGameStart!:       () => void;
    private _onUpgradeApplied!:  (def: IUpgradeDef) => void;

    onLoad(): void {
        this._onDamaged = ({ hpRemaining }) => {
            // Ignore signal events from enemies (hpRemaining=-1);
            // only react to the real event emitted by PlayerStats
            if (hpRemaining >= 0) {
                this._hpCurrent = hpRemaining;
                this._refreshHP();
            }
        };
        EventBus.on(GameEvents.PLAYER_DAMAGED, this._onDamaged);

        this._onHealed = ({ amount }) => {
            this._hpCurrent = Math.min(this._hpMax, this._hpCurrent + amount);
            this._refreshHP();
        };
        EventBus.on(GameEvents.PLAYER_HEALED, this._onHealed);

        this._onExpGained = ({ total, required }) => {
            if (required > 0) {
                this._expRequired = required;
                if (this.expBar)   this.expBar.progress = Math.min(total / required, 1);
                if (this.expLabel) this.expLabel.string  = `${Math.floor(total)}/${required}`;
            }
        };
        EventBus.on(GameEvents.PLAYER_EXP_GAINED, this._onExpGained);

        this._onLevelUp = ({ newLevel }) => {
            if (this.levelLabel) this.levelLabel.string = `Lv.${newLevel}`;
            // expRequired will be refreshed by the next PLAYER_EXP_GAINED;
            // reset bar to 0 for now
            if (this.expBar)   this.expBar.progress = 0;
            if (this.expLabel) this.expLabel.string  = `0/${this._expRequired}`;
        };
        EventBus.on(GameEvents.PLAYER_LEVEL_UP, this._onLevelUp);

        this._onWaveStarted = ({ waveId }) => {
            if (this.waveLabel) this.waveLabel.string = `Wave ${waveId}`;
        };
        EventBus.on(GameEvents.WAVE_STARTED, this._onWaveStarted);

        this._onGameStart = () => this._resetDisplay();
        EventBus.on(GameEvents.GAME_START, this._onGameStart);

        this._onUpgradeApplied = (def) => {
            if (def.stat === UpgradeStat.HPMax) {
                const oldMax = this._hpMax;
                this._hpMax = def.applyMode === 'add'
                    ? this._hpMax + def.value
                    : this._hpMax * def.value;
                this._hpCurrent = Math.round(this._hpCurrent * (this._hpMax / oldMax));
                this._refreshHP();
            }
        };
        EventBus.on(GameEvents.UPGRADE_APPLIED, this._onUpgradeApplied);

        // Pause triggers
        this.pauseBtn?.node.on(Button.EventType.CLICK, () => {
            EventBus.emit(GameEvents.GAME_PAUSE);
        }, this);
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    onDestroy(): void {
        EventBus.off(GameEvents.PLAYER_DAMAGED, this._onDamaged);
        EventBus.off(GameEvents.PLAYER_HEALED, this._onHealed);
        EventBus.off(GameEvents.PLAYER_EXP_GAINED, this._onExpGained);
        EventBus.off(GameEvents.PLAYER_LEVEL_UP, this._onLevelUp);
        EventBus.off(GameEvents.WAVE_STARTED, this._onWaveStarted);
        EventBus.off(GameEvents.GAME_START, this._onGameStart);
        EventBus.off(GameEvents.UPGRADE_APPLIED, this._onUpgradeApplied);
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    private _onKeyDown(evt: EventKeyboard): void {
        if (evt.keyCode === KeyCode.ESCAPE && EventBus.playing) {
            EventBus.emit(GameEvents.GAME_PAUSE);
        }
    }

    update(_dt: number): void {
        const gm = GameManager.instance;
        if (gm) {
            const t = gm.elapsedTime;
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            if (this.timerLabel) this.timerLabel.string = `${m}:${s.toString().padStart(2, '0')}`;
            if (this.killsLabel) this.killsLabel.string = `${gm.killCount}`;
        }
    }

    private _refreshHP(): void {
        if (this.hpBar)   this.hpBar.progress = Math.max(0, this._hpCurrent / this._hpMax);
        if (this.hpLabel) this.hpLabel.string  = `${Math.ceil(this._hpCurrent)}/${this._hpMax}`;
    }

    private _resetDisplay(): void {
        this._hpCurrent = this._hpMax;
        if (this.hpBar)      this.hpBar.progress    = 1;
        if (this.hpLabel)    this.hpLabel.string     = `${this._hpMax}/${this._hpMax}`;
        if (this.expBar)     this.expBar.progress    = 0;
        if (this.expLabel)   this.expLabel.string    = `0/${this._expRequired}`;
        if (this.timerLabel) this.timerLabel.string   = '0:00';
        if (this.killsLabel) this.killsLabel.string   = '0';
        if (this.levelLabel) this.levelLabel.string   = 'Lv.1';
        if (this.waveLabel)  this.waveLabel.string    = 'Wave 1';
    }

    setHpMax(max: number): void {
        this._hpMax = max;
    }
}
