/**
 * Storage Layer
 * - prefs:    sync localStorage for tiny boot-critical values (theme, fontSize, etc.)
 * - notes:    IndexedDB store for note objects (potentially many, can grow large)
 * - playlists: IndexedDB store for playlist objects
 * - bigCache: IndexedDB store for heavy serialized blobs (quran index, schedule xlsx cache)
 *
 * One-time migration: legacy localStorage keys are moved to IndexedDB on first run.
 */
import localforage from 'localforage';

// ---------- Sync (localStorage) — for boot-critical small values ----------
export const prefs = {
    get(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : v;
        } catch (e) {
            return fallback;
        }
    },
    getJSON(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn('[prefs] set failed', key, e);
            return false;
        }
    },
    setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('[prefs] setJSON failed', key, e);
            return false;
        }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }
};

// ---------- Async (IndexedDB via localforage) ----------
const dbName = 'quran_app';

export const notesStore = localforage.createInstance({
    name: dbName,
    storeName: 'notes',
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE]
});

export const playlistsStore = localforage.createInstance({
    name: dbName,
    storeName: 'playlists',
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE]
});

export const bigCacheStore = localforage.createInstance({
    name: dbName,
    storeName: 'bigCache',
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE]
});

// ---------- Notes API ----------
// Note keys are 'quran_note_{surah}_{ayah}' for legacy compatibility
export const notes = {
    async get(key) {
        return await notesStore.getItem(key);
    },
    async set(key, value) {
        return await notesStore.setItem(key, value);
    },
    async remove(key) {
        return await notesStore.removeItem(key);
    },
    async getAll() {
        const result = [];
        await notesStore.iterate((value, key) => {
            result.push({ key, value });
        });
        return result;
    },
    async clear() {
        return await notesStore.clear();
    }
};

// ---------- Playlists API ----------
const PLAYLISTS_KEY = 'all';
export const playlists = {
    async getAll() {
        const v = await playlistsStore.getItem(PLAYLISTS_KEY);
        return Array.isArray(v) ? v : [];
    },
    async setAll(list) {
        return await playlistsStore.setItem(PLAYLISTS_KEY, list);
    }
};

// ---------- Big cache (Quran index, schedule cache) ----------
export const bigCache = {
    async get(key) {
        return await bigCacheStore.getItem(key);
    },
    async set(key, value) {
        return await bigCacheStore.setItem(key, value);
    },
    async remove(key) {
        return await bigCacheStore.removeItem(key);
    }
};

// ---------- One-time migration from localStorage ----------
const MIGRATION_FLAG = 'storage_migrated_v1';

export async function migrateFromLocalStorage() {
    if (prefs.get(MIGRATION_FLAG) === 'done') return;

    try {
        // 1. Migrate notes (quran_note_*)
        const noteKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('quran_note_')) noteKeys.push(key);
        }
        for (const key of noteKeys) {
            const raw = localStorage.getItem(key);
            if (raw) {
                let value;
                try { value = JSON.parse(raw); } catch { value = raw; }
                await notesStore.setItem(key, value);
                localStorage.removeItem(key);
            }
        }
        if (noteKeys.length) console.log(`[storage] migrated ${noteKeys.length} notes`);

        // 2. Migrate playlists
        const plRaw = localStorage.getItem('quran_playlists');
        if (plRaw) {
            try {
                const arr = JSON.parse(plRaw);
                if (Array.isArray(arr)) await playlistsStore.setItem(PLAYLISTS_KEY, arr);
            } catch {}
            localStorage.removeItem('quran_playlists');
        }

        // 3. Migrate Quran index cache
        const idxRaw = localStorage.getItem('quran_index_v2');
        const idxTs = localStorage.getItem('quran_index_v2_ts');
        if (idxRaw) {
            try {
                await bigCacheStore.setItem('quran_index_v2', JSON.parse(idxRaw));
                if (idxTs) await bigCacheStore.setItem('quran_index_v2_ts', parseInt(idxTs) || 0);
            } catch {}
            localStorage.removeItem('quran_index_v2');
            localStorage.removeItem('quran_index_v2_ts');
        }

        // 4. Migrate schedule cache (kept in localStorage too — small, sync use)
        // ders_programi_v9_xlsx stays in localStorage; vanilla schedule app reads it sync.

        prefs.set(MIGRATION_FLAG, 'done');
        console.log('[storage] migration complete');
    } catch (e) {
        console.warn('[storage] migration error', e);
    }
}
