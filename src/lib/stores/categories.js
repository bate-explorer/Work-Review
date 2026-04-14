import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { locale, translateCategoryLabel, translateSemanticCategoryLabel } from '$lib/i18n/index.js';

function createCategoryStore() {
  const { subscribe, set, update } = writable([]);

  async function refresh() {
    try {
      const categories = await invoke('get_categories');
      set(categories);
    } catch (e) {
      console.error('获取分类列表失败:', e);
    }
  }

  function getCategoryMeta(key) {
    let result = { color: 'gray', icon: '📁', name: key, isCustom: false };
    let cats = [];
    const unsub = subscribe(v => { cats = v; });
    unsub();

    const found = cats.find(c => c.key === key);
    if (found) {
      if (found.is_custom) {
        result = {
          color: found.color,
          icon: found.icon,
          name: found.name,
          isCustom: true,
        };
      } else {
        result = {
          color: found.color,
          icon: found.icon,
          name: translateCategoryLabel(found.key),
          isCustom: false,
        };
      }
    } else {
      result.name = translateCategoryLabel(key);
    }
    return result;
  }

  function getAllCategories() {
    let cats = [];
    const unsub = subscribe(v => { cats = v; });
    unsub();
    return cats;
  }

  return { subscribe, set, update, refresh, getCategoryMeta, getAllCategories };
}

export const categoryStore = createCategoryStore();

function createSemanticCategoryStore() {
  const { subscribe, set } = writable([]);

  async function refresh() {
    try {
      const categories = await invoke('get_semantic_categories');
      set(categories);
    } catch (e) {
      console.error('获取语义分类列表失败:', e);
    }
  }

  function getSemanticCategoryDisplayName(key) {
    let cats = [];
    const unsub = subscribe(v => { cats = v; });
    unsub();

    const found = cats.find(c => c.key === key);
    if (found) {
      if (found.is_custom) {
        return found.name;
      }
      return translateSemanticCategoryLabel(found.key);
    }
    // fallback: 可能是内置分类但还没加载
    return translateSemanticCategoryLabel(key) || key;
  }

  function getAllSemanticCategories() {
    let cats = [];
    const unsub = subscribe(v => { cats = v; });
    unsub();
    return cats;
  }

  function isCustomSemanticCategory(key) {
    let cats = [];
    const unsub = subscribe(v => { cats = v; });
    unsub();
    return cats.some(c => c.key === key && c.is_custom);
  }

  return { subscribe, set, refresh, getSemanticCategoryDisplayName, getAllSemanticCategories, isCustomSemanticCategory };
}

export const semanticCategoryStore = createSemanticCategoryStore();

export function hexToRGBA(hex, alpha) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
