// ============================================================
// AudioService.ts — Wraps Cocos AudioSource for BGM + SFX.
// Listen to EventBus audio events and play sounds.
// ============================================================

import { AudioClip, AudioSource, Node, resources, assetManager } from 'cc';
import { EventBus } from '../../../assets/game/scripts/core/EventBus';
import { GameEvents } from '../types/EventTypes';
import { SaveService } from './SaveService';

class AudioServiceImpl {
    private _bgmSource: AudioSource | null = null;
    private _sfxSources: AudioSource[] = [];
    private _sfxIndex: number = 0;
    private readonly SFX_POOL_SIZE = 8;

    private _clips: Map<string, AudioClip> = new Map();

    /** Call once after scene with AudioSource nodes is loaded */
    init(bgmNode: Node, sfxPoolNode: Node): void {
        this._bgmSource = bgmNode.getComponent(AudioSource);

        for (let i = 0; i < this.SFX_POOL_SIZE; i++) {
            const src = sfxPoolNode.getComponent(AudioSource) ?? sfxPoolNode.addComponent(AudioSource);
            this._sfxSources.push(src);
        }

        this._applyVolumes();
        this._registerEvents();
    }

    preloadBundle(bundleName: string, keys: string[]): void {
        assetManager.loadBundle(bundleName, (err, bundle) => {
            if (err) { console.error('[AudioService] Bundle load error', err); return; }
            keys.forEach(key => {
                bundle.load(key, AudioClip, (e, clip) => {
                    if (e) { console.error('[AudioService] Clip load error', key, e); return; }
                    this._clips.set(key, clip);
                });
            });
        });
    }

    private _registerEvents(): void {
        EventBus.on<{ key: string }>(GameEvents.AUDIO_PLAY_SFX, ({ key }) => this.playSFX(key));
        EventBus.on<{ key: string; loop: boolean }>(GameEvents.AUDIO_PLAY_BGM, ({ key, loop }) => this.playBGM(key, loop));
        EventBus.on(GameEvents.AUDIO_STOP_BGM, () => this.stopBGM());
        EventBus.on<{ master: number; sfx: number; bgm: number }>(
            GameEvents.AUDIO_SETTINGS_CHANGED,
            ({ master, sfx, bgm }) => {
                SaveService.setVolume(master, sfx, bgm);
                this._applyVolumes();
            }
        );
    }

    playBGM(key: string, loop: boolean = true): void {
        if (!this._bgmSource) return;
        const clip = this._clips.get(key);
        if (!clip) { console.warn('[AudioService] BGM clip not found:', key); return; }
        this._bgmSource.clip = clip;
        this._bgmSource.loop = loop;
        this._bgmSource.play();
    }

    stopBGM(): void {
        this._bgmSource?.stop();
    }

    playSFX(key: string): void {
        const clip = this._clips.get(key);
        if (!clip) { console.warn('[AudioService] SFX clip not found:', key); return; }
        const src = this._sfxSources[this._sfxIndex % this.SFX_POOL_SIZE];
        this._sfxIndex++;
        src.playOneShot(clip, SaveService.data.volumeSFX * SaveService.data.volumeMaster);
    }

    private _applyVolumes(): void {
        const d = SaveService.data;
        if (this._bgmSource) {
            this._bgmSource.volume = d.volumeBGM * d.volumeMaster;
        }
    }
}

export const AudioService = new AudioServiceImpl();
