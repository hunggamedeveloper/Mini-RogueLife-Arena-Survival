// ============================================================
// UpgradePanel.ts — UI overlay shown on level up.
// Displays 3 upgrade buttons; player picks one.
// ============================================================

import { _decorator, Component, Node, Label, Button } from 'cc';
import { IUpgradeDef } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from '../../../shared/scripts/core/EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

const { ccclass, property } = _decorator;

@ccclass('UpgradePanel')
export class UpgradePanel extends Component {

    @property(Node)     content: Node     = null!;
    @property([Button]) btns:    Button[] = [];   // 3 buttons in Inspector

    private _options: IUpgradeDef[] = [];
    private _onOpen  = ({ options }: { newLevel: number; options: IUpgradeDef[] }) => this._show(options);
    private _onClose = () => this._hide();

    onLoad(): void {
        EventBus.on(GameEvents.UI_UPGRADE_PANEL_OPEN, this._onOpen);
        EventBus.on(GameEvents.UI_UPGRADE_PANEL_CLOSE, this._onClose);

        for (let i = 0; i < this.btns.length; i++) {
            const idx = i;
            this.btns[i]?.node.on(Button.EventType.CLICK, () => this._choose(idx), this);
        }

        this.content.active = false;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.UI_UPGRADE_PANEL_OPEN, this._onOpen);
        EventBus.off(GameEvents.UI_UPGRADE_PANEL_CLOSE, this._onClose);
    }

    private _show(options: IUpgradeDef[]): void {
        this._options = options;
        this.content.active = true;

        for (let i = 0; i < this.btns.length; i++) {
            const btn = this.btns[i];
            if (!btn) continue;

            if (i < options.length) {
                btn.node.active = true;
                const lbl = btn.node.getComponentInChildren(Label);
                if (lbl) lbl.string = `${options[i].label}\n${options[i].description}`;
            } else {
                btn.node.active = false;
            }
        }
    }

    private _hide(): void {
        this.content.active = false;
    }

    private _choose(index: number): void {
        if (index >= this._options.length) return;
        this._hide();
        EventBus.emit(GameEvents.UPGRADE_CHOSEN, { upgradeId: this._options[index].id });
        EventBus.emit(GameEvents.UI_UPGRADE_PANEL_CLOSE);
        EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'level_up' });
    }
}
