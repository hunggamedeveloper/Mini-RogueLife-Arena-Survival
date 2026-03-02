// ============================================================
// ResultPanel.ts — Game over / result screen.
// Shows survival time, kills, level, and new-best badges.
// ============================================================

import { _decorator, Component, Label, Button, Node, director } from 'cc';
import { IGameResult } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends Component {

    @property(Node)   content:        Node   = null!;
    @property(Label)  timeLabel:      Label  = null!;
    @property(Label)  killsLabel:     Label  = null!;
    @property(Label)  levelLabel:     Label  = null!;
    @property(Node)   newBestTimeNode: Node  = null!;
    @property(Node)   newBestKillsNode:Node  = null!;
    @property(Button) retryBtn:       Button = null!;
    @property(Button) lobbyBtn:       Button = null!;

    private _onResultOpen!: (result: IGameResult) => void;

    onLoad(): void {
        this._onResultOpen = (result) => this._show(result);
        EventBus.on(GameEvents.UI_RESULT_OPEN, this._onResultOpen);

        this.retryBtn?.node.on(Button.EventType.CLICK, this._onClickRetry, this);
        this.lobbyBtn?.node.on(Button.EventType.CLICK, this._onClickLobby, this);

        this.content.active = false;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.UI_RESULT_OPEN, this._onResultOpen);
        this.retryBtn?.node?.off(Button.EventType.CLICK, this._onClickRetry, this);
        this.lobbyBtn?.node?.off(Button.EventType.CLICK, this._onClickLobby, this);
    }

    private _onClickRetry(): void {
        director.loadScene('Gameplay');
    }

    private _onClickLobby(): void {
        GameManager.instance?.goToLobby();
    }

    private _show(result: IGameResult): void {
        this.content.active = true;

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
