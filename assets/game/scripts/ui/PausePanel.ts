// ============================================================
// PausePanel.ts — Pause overlay (resume / back to lobby).
// ============================================================

import { _decorator, Component, Button, Node } from 'cc';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('PausePanel')
export class PausePanel extends Component {

    @property(Node)   content:   Node   = null!;
    @property(Button) resumeBtn: Button = null!;
    @property(Button) lobbyBtn:  Button = null!;

    private _onPause!:  () => void;
    private _onResume!: () => void;

    onLoad(): void {
        this._onPause  = () => this.content.active = true;
        this._onResume = () => this.content.active = false;
        EventBus.on(GameEvents.GAME_PAUSE,  this._onPause);
        EventBus.on(GameEvents.GAME_RESUME, this._onResume);

        this.resumeBtn?.node.on(Button.EventType.CLICK, this._onClickResume, this);
        this.lobbyBtn?.node.on(Button.EventType.CLICK, this._onClickLobby, this);

        this.content.active = false;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.GAME_PAUSE,  this._onPause);
        EventBus.off(GameEvents.GAME_RESUME, this._onResume);
        this.resumeBtn?.node?.off(Button.EventType.CLICK, this._onClickResume, this);
        this.lobbyBtn?.node?.off(Button.EventType.CLICK, this._onClickLobby, this);
    }

    private _onClickResume(): void {
        EventBus.emit(GameEvents.GAME_RESUME);
    }

    private _onClickLobby(): void {
        GameManager.instance?.goToLobby();
    }
}
