// 应用图标全局缓存（模块级单例，跨页面导航不丢失）
// 图标通过 Tauri 后端获取并转为 base64，此缓存避免重复 invoke 调用
import { writable } from 'svelte/store';

// 模块级缓存对象，不随组件销毁而丢失
const _iconCache = {};
const _pendingRequests = {};
const _cacheKeys = [];
const MAX_ICON_CACHE = 120;
const FAILED_ICON_RETRY_MS = 30 * 1000;
const _failedAt = {};

function normalizeIconRequest(entry) {
    if (!entry) return { appName: '', executablePath: '' };
    if (typeof entry === 'string') {
        return { appName: entry, executablePath: '' };
    }
    return {
        appName: entry.appName || entry.app_name || entry.browserName || entry.browser_name || '',
        executablePath: entry.executablePath || entry.executable_path || '',
    };
}

export function getIconCacheKey(entry) {
    const { appName, executablePath } = normalizeIconRequest(entry);
    return executablePath ? `${appName}::${executablePath}` : appName;
}

function touchCacheKey(cacheKey) {
    const index = _cacheKeys.indexOf(cacheKey);
    if (index >= 0) {
        _cacheKeys.splice(index, 1);
    }
    _cacheKeys.push(cacheKey);
}

function pruneCache() {
    while (_cacheKeys.length > MAX_ICON_CACHE) {
        const oldest = _cacheKeys.shift();
        delete _iconCache[oldest];
        delete _pendingRequests[oldest];
        delete _failedAt[oldest];
    }
}

// 响应式 store，通知 Svelte 更新 UI
export const appIconStore = writable({});

// 加载指定应用的图标
export async function loadAppIcon(entry, invoke) {
    const { appName, executablePath } = normalizeIconRequest(entry);
    if (!appName) return;
    const cacheKey = getIconCacheKey({ appName, executablePath });

    // 成功缓存直接复用；失败缓存仅在冷却期内跳过重试
    if (_iconCache[cacheKey] !== undefined) {
        if (_iconCache[cacheKey] !== null) {
            touchCacheKey(cacheKey);
            return;
        }

        const lastFailedAt = _failedAt[cacheKey] || 0;
        if (Date.now() - lastFailedAt < FAILED_ICON_RETRY_MS) {
            return;
        }
    }

    // 避免同一应用并发请求
    if (_pendingRequests[cacheKey]) return;
    _pendingRequests[cacheKey] = true;

    try {
        const base64 = await invoke('get_app_icon', { appName, executablePath: executablePath || null });
        if (base64 && base64.length > 100) {
            _iconCache[cacheKey] = base64;
            delete _failedAt[cacheKey];
        } else {
            _iconCache[cacheKey] = null;
            _failedAt[cacheKey] = Date.now();
        }
        touchCacheKey(cacheKey);
        pruneCache();
    } catch {
        _iconCache[cacheKey] = null;
        _failedAt[cacheKey] = Date.now();
        touchCacheKey(cacheKey);
        pruneCache();
    } finally {
        delete _pendingRequests[cacheKey];
        // 更新 store 触发 UI 重新渲染
        appIconStore.set({ ..._iconCache });
    }
}

// 批量预加载
export function preloadAppIcons(entries, invoke) {
    entries.forEach(entry => loadAppIcon(entry, invoke));
}

// 获取已缓存的图标（同步）
export function getIcon(entry) {
    return _iconCache[getIconCacheKey(entry)] || null;
}
