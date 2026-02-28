// ============================================================
// PausePanel.ts — Pause overlay (resume / back to lobby).
// ============================================================

import { _decorator, Component, Button } from 'cc';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('PausePanel')
export class PausePanel extends Component {

    @property(Button) resumeBtn: Button = null!;
    @property(Button) lobbyBtn:  Button = null!;

    onLoad(): void {
        EventBus.on(GameEvents.GAME_PAUSE,  () => this.node.active = true);
        EventBus.on(GameEvents.GAME_RESUME, () => this.node.active = false);

        this.resumeBtn?.node.on(Button.EventType.CLICK, () => {
            EventBus.emit(GameEvents.GAME_RESUME);
        }, this);

        this.lobbyBtn?.node.on(Button.EventType.CLICK, () => {
            GameManager.instance?.goToLobby();
        }, this);

        this.node.active = false;
    }
}
