// ============================================================
// BootScene.ts — Initializes game services and transitions
// to Lobby. Bundles are already loaded by Start scene.
// ============================================================

import { _decorator, Component, Label, ProgressBar, director } from 'cc';
import { SaveService } from '../../../shared/scripts/services/SaveService';

const { ccclass, property } = _decorator;

@ccclass('BootScene')
export class BootScene extends Component {

    @property(ProgressBar) progressBar:   ProgressBar = null!;
    @property(Label)       progressLabel: Label       = null!;

    onLoad(): void {
        SaveService.load();

        if (this.progressBar)   this.progressBar.progress = 1;
        if (this.progressLabel) this.progressLabel.string  = '100%';

        this.scheduleOnce(() => director.loadScene('Lobby'), 0.3);
    }
}
