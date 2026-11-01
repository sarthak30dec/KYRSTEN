/**
 * AtlasFrameManager
 * Loads, slices, alpha-mattes, and manages animation frames from the Kyrsten Animation Atlas.
 * Provides caching via IndexedDB and fast Canvas/ImageBitmap rendering.
 */

import {
  ATLAS_FRAME_MANIFEST,
  AtlasFrameRect,
  PHONEME_TO_ATLAS_FRAME,
  EMOTION_TO_ATLAS_FRAME,
} from './atlasManifest';
import { AvatarEmotion } from './types';

const INDEXED_DB_NAME = 'kyrsten_avatar_db';
const INDEXED_DB_STORE = 'atlas_store';
const ATLAS_KEY = 'master_atlas_image';

export class AtlasFrameManager {
  private static instance: AtlasFrameManager | null = null;
  private frames: Map<string, HTMLCanvasElement> = new Map();
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private loadError: string | null = null;
  private atlasSourceUrl: string | null = null;
  private sourceDimensions: { width: number; height: number } = { width: 0, height: 0 };
  private listeners: Set<() => void> = new Set();

  public static getInstance(): AtlasFrameManager {
    if (!AtlasFrameManager.instance) {
      AtlasFrameManager.instance = new AtlasFrameManager();
    }
    return AtlasFrameManager.instance;
  }

  constructor() {
    // Attempt automatic hydration on initialization
    this.initHydration();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getIsLoaded(): boolean {
    return this.isLoaded;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getLoadError(): string | null {
    return this.loadError;
  }

  public getSourceDimensions(): { width: number; height: number } {
    return this.sourceDimensions;
  }

  /**
   * Hydrates from IndexedDB cache or attempts to fetch from static server path
   */
  private async initHydration() {
    try {
      // 1. Check if server has sliced frames manifest from slice_atlas.py
      const manifestRes = await fetch('/avatar/manifest.json', { method: 'HEAD' });
      if (manifestRes.ok) {
        const ok = await this.loadFromManifest('/avatar/manifest.json');
        if (ok) return;
      }

      // 2. Check IndexedDB first for instant local restore
      const cachedBlob = await this.readFromIndexedDB();
      if (cachedBlob) {
        const img = await this.loadImageFromBlob(cachedBlob);
        this.processAtlasImage(img);
        return;
      }

      // 3. Check static server location (/avatar/atlas.png)
      const res = await fetch('/avatar/atlas.png', { method: 'HEAD' });
      if (res.ok) {
        await this.loadFromUrl('/avatar/atlas.png');
      }
    } catch {
      // Graceful silence if not yet available
    }
  }

  /**
   * Load sliced frames from Python slice_atlas manifest.json
   */
  public async loadFromManifest(manifestUrl = '/avatar/manifest.json'): Promise<boolean> {
    this.isLoading = true;
    this.loadError = null;
    this.notify();

    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`Manifest not found at ${manifestUrl}`);
      const manifest = await res.json();
      const framesList: string[] = manifest.generatedFrames || [];
      if (framesList.length === 0) throw new Error('No frames defined in manifest');

      const loadedFrames = new Map<string, HTMLCanvasElement>();
      const basePath = manifestUrl.substring(0, manifestUrl.lastIndexOf('/'));

      await Promise.all(
        framesList.map(async (frameRelPath: string) => {
          try {
            const frameUrl = `${basePath}/${frameRelPath}`;
            const img = await this.loadImageFromUrl(frameUrl);
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            if (w > 0 && h > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const key = frameRelPath.replace(/\.png$/, '');
                loadedFrames.set(key, canvas);
              }
            }
          } catch {
            // Ignore single frame load error
          }
        })
      );

      if (loadedFrames.size > 0) {
        this.frames = loadedFrames;
        this.isLoaded = true;
        this.isLoading = false;
        this.sourceDimensions = {
          width: manifest.sourceWidth || 1536,
          height: manifest.sourceHeight || 1024,
        };
        this.notify();
        return true;
      }
      throw new Error('No valid frames loaded from manifest');
    } catch (err: any) {
      this.isLoading = false;
      this.loadError = err?.message || 'Failed to load from manifest';
      this.notify();
      return false;
    }
  }

  /**
   * Load atlas from URL
   */
  public async loadFromUrl(url: string): Promise<boolean> {
    this.isLoading = true;
    this.loadError = null;
    this.notify();

    try {
      const img = await this.loadImageFromUrl(url);
      this.atlasSourceUrl = url;
      this.processAtlasImage(img);

      // Cache image blob in IndexedDB
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const blob = await resp.blob();
          await this.saveToIndexedDB(blob);
        }
      } catch {
        // Cache failure is non-fatal
      }

      this.isLoading = false;
      this.notify();
      return true;
    } catch (err: any) {
      this.isLoading = false;
      this.loadError = err?.message || 'Failed to load avatar atlas from URL';
      this.notify();
      return false;
    }
  }

  /**
   * Load atlas from User-Selected File or Drag-and-Drop Blob
   */
  public async loadFromFile(file: File | Blob): Promise<boolean> {
    this.isLoading = true;
    this.loadError = null;
    this.notify();

    try {
      const img = await this.loadImageFromBlob(file);
      this.processAtlasImage(img);

      // Save to IndexedDB
      await this.saveToIndexedDB(file);

      // Also upload to server in background so server can save to /public/avatar/atlas.png
      this.uploadToServer(file);

      this.isLoading = false;
      this.notify();
      return true;
    } catch (err: any) {
      this.isLoading = false;
      this.loadError = err?.message || 'Failed to parse uploaded atlas file';
      this.notify();
      return false;
    }
  }

  /**
   * Background upload to server API
   */
  private async uploadToServer(file: File | Blob) {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string)?.split(',')[1];
        if (base64) {
          await fetch('/api/avatar/upload-atlas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 }),
          });
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // Non-fatal
    }
  }

  /**
   * Slices all frames from the loaded master image with alpha-aware background matting
   */
  private processAtlasImage(img: HTMLImageElement) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w <= 0 || h <= 0) {
      throw new Error('Invalid image dimensions');
    }

    this.sourceDimensions = { width: w, height: h };

    // Master canvas for reading source pixels
    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = w;
    masterCanvas.height = h;
    const masterCtx = masterCanvas.getContext('2d', { willReadFrequently: true });
    if (!masterCtx) throw new Error('Cannot create master canvas context');

    masterCtx.drawImage(img, 0, 0);

    const newFrames = new Map<string, HTMLCanvasElement>();

    // Slice every defined frame
    for (const [key, rect] of Object.entries(ATLAS_FRAME_MANIFEST)) {
      const x0 = Math.max(0, Math.min(w - 1, Math.round(rect.x * w)));
      const y0 = Math.max(0, Math.min(h - 1, Math.round(rect.y * h)));
      const cw = Math.max(1, Math.min(w - x0, Math.round(rect.w * w)));
      const ch = Math.max(1, Math.min(h - y0, Math.round(rect.h * h)));

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = cw;
      frameCanvas.height = ch;
      const frameCtx = frameCanvas.getContext('2d');
      if (!frameCtx) continue;

      // Extract raw image data
      const imgData = masterCtx.getImageData(x0, y0, cw, ch);
      const data = imgData.data;

      // Alpha-aware background matting:
      // Preserves cyan holographic glow and delicate hair edges without harsh clipping
      const isOverlay = rect.category === 'overlays';
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum < 6) {
          data[i + 3] = 0;
        } else if (lum < 36) {
          const factor = (lum - 6) / 30;
          data[i + 3] = Math.round(a * factor);
          // Prevent dark halo on glowing cyan rim
          if (factor < 0.9) {
            const boost = Math.min(2.2, 1 / Math.max(0.25, factor));
            data[i] = Math.min(255, Math.round(r * boost));
            data[i + 1] = Math.min(255, Math.round(g * boost));
            data[i + 2] = Math.min(255, Math.round(b * boost));
          }
        }
      }

      frameCtx.putImageData(imgData, 0, 0);
      newFrames.set(key, frameCanvas);
    }

    this.frames = newFrames;
    this.isLoaded = newFrames.size > 0;
  }

  // --- Asset Retrieval Methods ---

  public hasFrame(key: string): boolean {
    return this.frames.has(key);
  }

  public getFrame(key: string): HTMLCanvasElement | null {
    return this.frames.get(key) || null;
  }

  public getBasePortrait(): HTMLCanvasElement | null {
    return this.getFrame('base/kyrsten_idle_000');
  }

  public getIdleFrame(index: number): HTMLCanvasElement | null {
    const safeIdx = Math.max(1, Math.min(8, index));
    const pad = safeIdx.toString().padStart(3, '0');
    return this.getFrame(`idle/idle_${pad}`) || this.getBasePortrait();
  }

  public getHeadFrame(direction: 'left' | 'center' | 'right'): HTMLCanvasElement | null {
    return this.getFrame(`head/look_${direction}`) || this.getBasePortrait();
  }

  public getVisemeFrameKey(viseme: string): string {
    const upper = (viseme || '').toUpperCase();
    if (PHONEME_TO_ATLAS_FRAME[upper]) {
      return PHONEME_TO_ATLAS_FRAME[upper];
    }
    if (this.frames.has(viseme)) {
      return viseme;
    }
    const prefixed = `visemes/viseme_${viseme.toLowerCase()}`;
    if (this.frames.has(prefixed)) {
      return prefixed;
    }
    return 'visemes/viseme_rest';
  }

  public getVisemeFrame(viseme: string): HTMLCanvasElement | null {
    const key = this.getVisemeFrameKey(viseme);
    return this.getFrame(key) || this.getFrame('visemes/viseme_rest');
  }

  public getEyeFrame(name: string): HTMLCanvasElement | null {
    return this.getFrame(`eyes/${name}`) || this.getFrame('eyes/eye_open');
  }

  public getExpressionFrame(emotion: AvatarEmotion): HTMLCanvasElement | null {
    const key = EMOTION_TO_ATLAS_FRAME[emotion] || 'expressions/neutral';
    return this.getFrame(key) || this.getFrame('expressions/neutral') || this.getBasePortrait();
  }

  public getSpeakingFrame(index: number): HTMLCanvasElement | null {
    const safeIdx = Math.max(1, Math.min(8, index));
    const pad = safeIdx.toString().padStart(3, '0');
    return this.getFrame(`speaking/speak_${pad}`) || this.getBasePortrait();
  }

  public getTransitionFrame(name: string): HTMLCanvasElement | null {
    return this.getFrame(`transitions/${name}`);
  }

  public getOverlay(name: string): HTMLCanvasElement | null {
    return this.getFrame(`overlays/${name}`);
  }

  // --- IndexedDB Persistence Helpers ---

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB not supported'));
          return;
        }
        const req = indexedDB.open(INDEXED_DB_NAME, 1);
        req.onupgradeneeded = () => {
          try {
            const db = req.result;
            if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
              db.createObjectStore(INDEXED_DB_STORE);
            }
          } catch (e) {
            reject(e);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB open error'));
      } catch (err) {
        reject(err);
      }
    });
  }

  private async saveToIndexedDB(blob: Blob): Promise<void> {
    try {
      const db = await this.openDatabase();
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
      tx.objectStore(INDEXED_DB_STORE).put(blob, ATLAS_KEY);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore caching errors
    }
  }

  private async readFromIndexedDB(): Promise<Blob | null> {
    try {
      const db = await this.openDatabase();
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
      const req = tx.objectStore(INDEXED_DB_STORE).get(ATLAS_KEY);
      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (/^https?:\/\//i.test(url)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
      img.src = url;
    });
  }

  private loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode image from blob'));
      };
      img.src = url;
    });
  }
}

export const atlasFrameManager = AtlasFrameManager.getInstance();
