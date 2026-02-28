// ============================================================
// UpgradePanel.ts — UI overlay shown on level up.
// Displays 3 upgrade cards; player picks one.
// Communicates exclusively via EventBus.
// ============================================================

import { _decorator, Component, Node, Label, Button } from 'cc';
import { IUpgradeDef } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass, property } = _decorator;

@ccclass('UpgradePanel')
export class UpgradePanel extends Component {

    // Assign 3 card root Nodes in Inspector
    @property([Node])  cards:       Node[]  = [];
    @property([Label]) cardLabels:  Label[] = [];
    @property([Label]) cardDescs:   Label[] = [];
    @property([Button])cardBtns:    Button[] = [];

    private _options: IUpgradeDef[] = [];

    onLoad(): void {
        EventBus.on<{ newLevel: number; options: IUpgradeDef[] }>(
            GameEvents.PLAYER_LEVEL_UP,
            ({ options }) => this._show(options),
        );
        EventBus.on(GameEvents.UI_UPGRADE_PANEL_CLOSE, () => this._hide());

        // Wire button clicks
        for (let i = 0; i < this.cardBtns.length; i++) {
            const idx = i;
            this.cardBtns[i]?.node.on(Button.EventType.CLICK, () => this._choose(idx), this);
        }

        this.node.active = false;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.PLAYER_LEVEL_UP, this._show.bind(this));
        EventBus.off(GameEvents.UI_UPGRADE_PANEL_CLOSE, this._hide.bind(this));
    }

    private _show(options: IUpgradeDef[]): void {
        this._options = options;
        this.node.active = true;

        // Pause gameplay via EventBus
        EventBus.emit(GameEvents.GAME_PAUSE);

        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            if (!card) continue;

            if (i < options.length) {
                card.active = true;
                if (this.cardLabels[i]) this.cardLabels[i].string = options[i].label;
                if (this.cardDescs[i])  this.cardDescs[i].string  = options[i].description;
            } else {
                card.active = false;
            }
        }
    }

    private _hide(): void {
        this.node.active = false;
        // Resume gameplay
        EventBus.emit(GameEvents.GAME_RESUME);
    }

    private _choose(index: number): void {
        if (index >= this._options.length) return;
        EventBus.emit(GameEvents.UPGRADE_CHOSEN, { upgradeId: this._options[index].id });
        EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'level_up' });
    }
}
