// ============================================================
// Start.ts — Minimal entry point (outside all bundles).
// Loads core + gameplay bundles, then transitions to Boot scene.
// This scene is set as the Build Start Scene because scenes
// inside Asset Bundles cannot be used as Start Scene.
// ============================================================

import { _decorator, Component, Label, assetManager, director } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Start')
export class Start extends Component {

    @property(Label) statusLabel: Label = null!;

    onLoad(): void {
        this._loadBundles();
    }

    private _loadBundles(): void {
        let loaded = 0;
        const total = 2;

        const advance = (bundleName: string) => {
            loaded++;
            if (this.statusLabel) {
                this.statusLabel.string = `Loading... ${Math.round((loaded / total) * 100)}%`;
            }
            if (loaded >= total) {
                this.scheduleOnce(() => director.loadScene('Boot'), 0.2);
            }
        };

        // Load core bundle (contains Boot, Lobby scenes)
        assetManager.loadBundle('core', (err) => {
            if (err) {
                console.error('[Start] Failed to load core bundle', err);
                return;
            }
            advance('core');
        });

        // Load gameplay bundle (contains Gameplay scene + prefabs)
        assetManager.loadBundle('gameplay', (err) => {
            if (err) {
                console.error('[Start] Failed to load gameplay bundle', err);
                return;
            }
            advance('gameplay');
        });
    }
}
