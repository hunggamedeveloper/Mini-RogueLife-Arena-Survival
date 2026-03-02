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

    onLoad(): void {
        EventBus.on(GameEvents.GAME_PAUSE,  () => this.content.active = true);
        EventBus.on(GameEvents.GAME_RESUME, () => this.content.active = false);

        this.resumeBtn?.node.on(Button.EventType.CLICK, () => {
            EventBus.emit(GameEvents.GAME_RESUME);
        }, this);

        this.lobbyBtn?.node.on(Button.EventType.CLICK, () => {
            GameManager.instance?.goToLobby();
        }, this);

        this.content.active = false;
    }
}
