// ============================================================
// LobbyScene.ts — Lobby / main menu logic.
// ============================================================

import { _decorator, Component, Button, Label, director } from 'cc';
import { SaveService } from '../../../shared/scripts/services/SaveService';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass, property } = _decorator;

@ccclass('LobbyScene')
export class LobbyScene extends Component {

    @property(Button) playBtn:       Button = null!;
    @property(Button) settingsBtn:   Button = null!;
    @property(Label)  bestTimeLabel: Label  = null!;
    @property(Label)  bestKillsLabel:Label  = null!;

    onLoad(): void {
        SaveService.load();
        this._updateBestScores();

        this.playBtn?.node.on(Button.EventType.CLICK, this._onClickPlay, this);
        this.settingsBtn?.node.on(Button.EventType.CLICK, this._onClickSettings, this);
    }

    onDestroy(): void {
        this.playBtn?.node?.off(Button.EventType.CLICK, this._onClickPlay, this);
        this.settingsBtn?.node?.off(Button.EventType.CLICK, this._onClickSettings, this);
    }

    private _onClickPlay(): void {
        director.loadScene('Gameplay');
    }

    private _onClickSettings(): void {
        EventBus.emit(GameEvents.UI_SETTINGS_OPEN);
    }

    private _updateBestScores(): void {
        const d = SaveService.data;
        const t = d.bestSurvivalTime;
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        if (this.bestTimeLabel)  this.bestTimeLabel.string  = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (this.bestKillsLabel) this.bestKillsLabel.string = `${d.bestKillCount}`;
    }
}
