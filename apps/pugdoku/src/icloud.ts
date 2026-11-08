/** JS side of the native ICloudStore plugin (ios/App/App/ICloudStorePlugin.swift). On the web / in tests it simply reports "not available". */
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

type ICloudStorePlugin = {
  available(): Promise<{ signedIn: boolean }>;
  get(o: { key: string }): Promise<{ value?: string }>;
  set(o: { key: string; value: string }): Promise<void>;
  remove(o: { key: string }): Promise<void>;
  sync(): Promise<void>;
  addListener(ev: 'change', fn: (e: { keys: string[] }) => void): Promise<PluginListenerHandle>;
};

const plugin = Capacitor.isNativePlatform() ? registerPlugin<ICloudStorePlugin>('ICloudStore') : null;

export const iCloud = {
  supported: !!plugin,
  async signedIn(): Promise<boolean> { try { return plugin ? (await plugin.available()).signedIn : false; } catch { return false; } },
  async get(key: string): Promise<string | null> { try { return plugin ? (await plugin.get({ key })).value ?? null : null; } catch { return null; } },
  async set(key: string, value: string): Promise<boolean> { try { if (!plugin) return false; await plugin.set({ key, value }); return true; } catch { return false; } },
  onChange(fn: () => void): () => void {
    if (!plugin) return () => {};
    let h: PluginListenerHandle | null = null, dead = false;
    plugin.addListener('change', () => fn()).then((x) => { if (dead) x.remove(); else h = x; }).catch(() => {});
    return () => { dead = true; h?.remove(); };
  },
};
