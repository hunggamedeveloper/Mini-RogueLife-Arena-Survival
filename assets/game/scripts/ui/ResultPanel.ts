// ============================================================
// ResultPanel.ts — Game over / result screen.
// Shows survival time, kills, level, and new-best badges.
// ============================================================

import { _decorator, Component, Label, Button, Node } from 'cc';
import { IGameResult } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends Component {

    @property(Label)  timeLabel:      Label  = null!;
    @property(Label)  killsLabel:     Label  = null!;
    @property(Label)  levelLabel:     Label  = null!;
    @property(Node)   newBestTimeNode: Node  = null!;
    @property(Node)   newBestKillsNode:Node  = null!;
    @property(Button) retryBtn:       Button = null!;
    @property(Button) lobbyBtn:       Button = null!;

    onLoad(): void {
        EventBus.on<IGameResult>(GameEvents.UI_RESULT_OPEN, (result) => this._show(result));

        this.retryBtn?.node.on(Button.EventType.CLICK, () => {
            // Reload gameplay scene
            const { director } = require('cc');
            director.loadScene('Gameplay');
        }, this);

        this.lobbyBtn?.node.on(Button.EventType.CLICK, () => {
            GameManager.instance?.goToLobby();
        }, this);

        this.node.active = false;
    }

    private _show(result: IGameResult): void {
        this.node.active = true;

        const t = result.survivalTime;
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        if (this.timeLabel)   this.timeLabel.string  = `${m}:${s.toString().padStart(2, '0')}`;
        if (this.killsLabel)  this.killsLabel.string  = `${result.killCount}`;
        if (this.levelLabel)  this.levelLabel.string  = `Lv.${result.level}`;

        if (this.newBestTimeNode)  this.newBestTimeNode.active  = result.isNewBestTime;
        if (this.newBestKillsNode) this.newBestKillsNode.active = result.isNewBestKills;
    }
}
