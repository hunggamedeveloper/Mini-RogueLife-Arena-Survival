// ============================================================
// SettingsPanel.ts — Volume sliders + close.
// ============================================================

import { _decorator, Component, Button, Slider, Label } from 'cc';
import { SaveService } from '../../../shared/scripts/services/SaveService';
import { EventBus } from '../../../game/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass, property } = _decorator;

@ccclass('SettingsPanel')
export class SettingsPanel extends Component {

    @property(Slider) masterSlider: Slider = null!;
    @property(Slider) sfxSlider:    Slider = null!;
    @property(Slider) bgmSlider:    Slider = null!;
    @property(Label)  masterLabel:  Label  = null!;
    @property(Label)  sfxLabel:     Label  = null!;
    @property(Label)  bgmLabel:     Label  = null!;
    @property(Button) closeBtn:     Button = null!;

    onLoad(): void {
        EventBus.on(GameEvents.UI_SETTINGS_OPEN,  () => this._open());
        EventBus.on(GameEvents.UI_SETTINGS_CLOSE, () => this.node.active = false);

        this.closeBtn?.node.on(Button.EventType.CLICK, () => {
            EventBus.emit(GameEvents.UI_SETTINGS_CLOSE);
        }, this);

        this.masterSlider?.node.on('slide', () => this._onSliderChange(), this);
        this.sfxSlider?.node.on('slide',    () => this._onSliderChange(), this);
        this.bgmSlider?.node.on('slide',    () => this._onSliderChange(), this);

        this.node.active = false;
    }

    private _open(): void {
        const d = SaveService.data;
        if (this.masterSlider) this.masterSlider.progress = d.volumeMaster;
        if (this.sfxSlider)    this.sfxSlider.progress    = d.volumeSFX;
        if (this.bgmSlider)    this.bgmSlider.progress    = d.volumeBGM;
        this._updateLabels(d.volumeMaster, d.volumeSFX, d.volumeBGM);
        this.node.active = true;
    }

    private _onSliderChange(): void {
        const master = this.masterSlider?.progress ?? 1;
        const sfx    = this.sfxSlider?.progress    ?? 1;
        const bgm    = this.bgmSlider?.progress    ?? 0.7;
        this._updateLabels(master, sfx, bgm);
        EventBus.emit(GameEvents.AUDIO_SETTINGS_CHANGED, { master, sfx, bgm });
    }

    private _updateLabels(m: number, s: number, b: number): void {
        if (this.masterLabel) this.masterLabel.string = `${Math.round(m * 100)}%`;
        if (this.sfxLabel)    this.sfxLabel.string    = `${Math.round(s * 100)}%`;
        if (this.bgmLabel)    this.bgmLabel.string    = `${Math.round(b * 100)}%`;
    }
}
