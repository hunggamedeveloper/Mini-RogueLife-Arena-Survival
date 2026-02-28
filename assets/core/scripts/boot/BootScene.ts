// ============================================================
// BootScene.ts — Entry point. Loads "core" bundle then transitions
// to Lobby scene. Shows loading progress.
// ============================================================

import { _decorator, Component, Label, ProgressBar, assetManager, director } from 'cc';
import { SaveService } from '../../../shared/scripts/services/SaveService';

const { ccclass, property } = _decorator;

@ccclass('BootScene')
export class BootScene extends Component {

    @property(ProgressBar) progressBar:   ProgressBar = null!;
    @property(Label)       progressLabel: Label       = null!;

    onLoad(): void {
        SaveService.load();
        this._loadBundles();
    }

    private _loadBundles(): void {
        let loaded = 0;
        const total = 2;

        const advance = () => {
            loaded++;
            const progress = loaded / total;
            if (this.progressBar)   this.progressBar.progress   = progress;
            if (this.progressLabel) this.progressLabel.string = `${Math.round(progress * 100)}%`;
            if (loaded >= total) {
                this.scheduleOnce(() => director.loadScene('Lobby'), 0.3);
            }
        };

        // Load "core" bundle (scenes + UI)
        assetManager.loadBundle('core', (err) => {
            if (err) { console.error('[Boot] Failed to load core bundle', err); return; }
            advance();
        });

        // Pre-load "gameplay" bundle in background
        assetManager.loadBundle('gameplay', (err) => {
            if (err) { console.error('[Boot] Failed to load gameplay bundle', err); return; }
            advance();
        });
    }
}
