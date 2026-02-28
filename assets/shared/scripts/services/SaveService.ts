// ============================================================
// SaveService.ts — Persistence via cc.sys.localStorage.
// Stores volume settings + best time/kills.
// ============================================================

import { sys } from 'cc';
import { ISaveData } from '../types/GameTypes';

const SAVE_KEY = 'mrlas_save';

const DEFAULT_SAVE: ISaveData = {
    volumeMaster: 1.0,
    volumeSFX:    1.0,
    volumeBGM:    0.7,
    bestSurvivalTime: 0,
    bestKillCount:    0,
};

class SaveServiceImpl {
    private _data: ISaveData = { ...DEFAULT_SAVE };

    load(): void {
        const raw = sys.localStorage.getItem(SAVE_KEY);
        if (raw) {
            try {
                this._data = { ...DEFAULT_SAVE, ...JSON.parse(raw) };
            } catch {
                this._data = { ...DEFAULT_SAVE };
            }
        }
    }

    save(): void {
        sys.localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
    }

    get data(): Readonly<ISaveData> { return this._data; }

    setVolume(master: number, sfx: number, bgm: number): void {
        this._data.volumeMaster = master;
        this._data.volumeSFX    = sfx;
        this._data.volumeBGM    = bgm;
        this.save();
    }

    /** Returns true if either record was beaten. */
    submitResult(survivalTime: number, killCount: number): { newBestTime: boolean; newBestKills: boolean } {
        const newBestTime  = survivalTime > this._data.bestSurvivalTime;
        const newBestKills = killCount    > this._data.bestKillCount;

        if (newBestTime)  this._data.bestSurvivalTime = survivalTime;
        if (newBestKills) this._data.bestKillCount     = killCount;

        if (newBestTime || newBestKills) this.save();
        return { newBestTime, newBestKills };
    }
}

export const SaveService = new SaveServiceImpl();
