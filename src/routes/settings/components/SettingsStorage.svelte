<script>
  import { createEventDispatcher } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { ask, open as openDialog } from '@tauri-apps/plugin-dialog';
  import { cache } from '../../../lib/stores/cache.js';
  import { showToast } from '$lib/stores/toast.js';
  
  export let config;
  export let storageStats = null;
  export let dataDir = '';
  export let defaultDataDir = '';
  
  const dispatch = createEventDispatcher();
  let isClearing = false;
  let isMigrating = false;

  function clearCache() {
    cache.clear();
    showToast('缓存已清理');
    dispatch('clearCache');
  }

  async function clearOldData() {
    const confirmed = await ask('确认删除今天之前的所有活动记录和截图？此操作不可恢复！', {
      title: '确认清理历史数据',
      kind: 'warning',
    });

    if (!confirmed) {
      return;
    }
    
    isClearing = true;
    try {
      const result = await invoke('clear_old_activities');
      showToast(result?.message || '清理完成');
      cache.clear();
      dispatch('clearCache');
    } catch (e) {
      showToast('清理失败: ' + e, 'error');
    } finally {
      isClearing = false;
    }
  }

  async function migrateToDataDir(targetDir) {
    const nextDir = targetDir?.trim();
    if (!nextDir) {
      return;
    }

    if (nextDir === dataDir) {
      showToast('已是当前数据目录');
      return;
    }

    const confirmed = await ask(
      `将把当前数据迁移到新目录：\n${nextDir}\n\n若目标目录已有 Work Review 历史数据，会被当前数据覆盖。此过程可能持续几秒，是否继续？`,
      {
        title: '确认迁移数据目录',
        kind: 'warning',
      },
    );

    if (!confirmed) {
      return;
    }

    isMigrating = true;
    try {
      const result = await invoke('change_data_dir', { targetDir: nextDir });
      showToast(result?.message || '数据目录已更新', 'success');
      dispatch('dataDirChanged', result);
    } catch (e) {
      showToast('迁移失败: ' + e, 'error');
    } finally {
      isMigrating = false;
    }
  }

  async function pickDataDir() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      defaultPath: dataDir || defaultDataDir || undefined,
    });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    await migrateToDataDir(selected);
  }

  async function restoreDefaultDataDir() {
    await migrateToDataDir(defaultDataDir);
  }

  async function openCurrentDataDir() {
    try {
      await invoke('open_data_dir');
    } catch (e) {
      showToast('打开目录失败: ' + e, 'error');
    }
  }

  function handleChange() {
    dispatch('change', config);
  }

  // 计算存储使用百分比
  $: usagePercent = storageStats 
    ? Math.min(Math.round((storageStats.total_size_mb / storageStats.storage_limit_mb) * 100), 100) 
    : 0;

  // 使用量颜色
  $: usageColor = usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500';
  $: usingDefaultDataDir = dataDir && defaultDataDir && dataDir === defaultDataDir;
</script>

<!-- 记录设置 -->
<div class="settings-card mb-5">
  <h3 class="settings-card-title">记录设置</h3>
  <p class="settings-card-desc">控制活动记录的频率和保留策略</p>
  
  <div class="settings-section">
    <!-- 轮询间隔 -->
    <div class="settings-block">
      <div class="flex items-center justify-between">
        <label for="screenshot-interval" class="settings-text">活动轮询间隔</label>
        <span class="settings-value">{config.screenshot_interval}秒</span>
      </div>
      <input
        id="screenshot-interval"
        type="range"
        bind:value={config.screenshot_interval}
        on:change={handleChange}
        min="10"
        max="120"
        step="5"
        class="range-input"
      />
      <div class="flex justify-between text-xs settings-subtle">
        <span>10秒（更精确）</span>
        <span>120秒（更省电）</span>
      </div>
      <p class="settings-note">每隔此时长检测一次当前活动窗口并执行 OCR</p>
    </div>

    <!-- 数据保留 -->
    <div class="settings-block">
      <div class="flex items-center justify-between">
        <label for="retention-days" class="settings-text">数据保留天数</label>
        <span class="settings-value">{config.storage.screenshot_retention_days}天</span>
      </div>
      <input
        id="retention-days"
        type="range"
        bind:value={config.storage.screenshot_retention_days}
        on:change={() => {
          config.storage.metadata_retention_days = config.storage.screenshot_retention_days;
          handleChange();
        }}
        min="1"
        max="90"
        step="1"
        class="range-input"
      />
      <div class="flex justify-between text-xs settings-subtle">
        <span>1天</span>
        <span>90天</span>
      </div>
      <p class="settings-note">超过此天数的活动记录和截图将被自动清理</p>
    </div>
  </div>
</div>

<!-- 数据目录 -->
<div class="settings-card mb-5">
  <h3 class="settings-card-title">数据目录</h3>
  <p class="settings-card-desc">支持切换本地数据存储位置，并迁移当前已有数据</p>

  <div class="settings-block">
    <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl space-y-3">
      <div>
        <p class="settings-text">当前目录</p>
        <p class="settings-muted mt-1 break-all">{dataDir || '读取中...'}</p>
      </div>

      <div>
        <p class="settings-text">默认目录</p>
        <p class="settings-muted mt-1 break-all">{defaultDataDir || '读取中...'}</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          on:click={pickDataDir}
          disabled={isMigrating}
          class="settings-action-secondary"
        >
          {#if isMigrating}
            迁移中...
          {:else}
            更改位置
          {/if}
        </button>

        <button
          on:click={openCurrentDataDir}
          disabled={isMigrating}
          class="settings-action-secondary"
        >
          打开当前目录
        </button>

        {#if !usingDefaultDataDir && defaultDataDir}
          <button
            on:click={restoreDefaultDataDir}
            disabled={isMigrating}
            class="settings-action-secondary"
          >
            恢复默认位置
          </button>
        {/if}
      </div>

      <p class="settings-note">
        建议选择专用空目录。迁移时会复制当前配置、数据库、截图、OCR 日志与背景图。
      </p>
    </div>
  </div>
</div>

<!-- 存储统计 -->
{#if storageStats}
<div class="settings-card mb-5">
  <h3 class="settings-card-title !mb-4">存储使用</h3>
  
  <!-- 存储进度条 -->
  <div class="mb-5">
    <div class="flex items-end justify-between mb-2">
      <div>
        <span class="text-2xl font-bold text-slate-800 dark:text-white">{storageStats.total_size_mb}</span>
        <span class="settings-muted"> / {storageStats.storage_limit_mb} MB</span>
      </div>
      <span class="text-sm font-medium {usagePercent > 80 ? 'settings-text-danger' : 'settings-muted'}">{usagePercent}%</span>
    </div>
    <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div 
        class="h-full rounded-full transition-all duration-500 {usageColor}"
        style="width: {usagePercent}%"
      ></div>
    </div>
  </div>

  <!-- 统计卡片 -->
  <div class="grid grid-cols-3 gap-3">
    <div class="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
      <p class="text-xl font-bold text-slate-800 dark:text-white">{storageStats.total_files}</p>
      <p class="settings-muted mt-0.5">截图数</p>
    </div>
    <div class="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
      <p class="text-xl font-bold text-slate-800 dark:text-white">{storageStats.total_size_mb} MB</p>
      <p class="settings-muted mt-0.5">已用空间</p>
    </div>
    <div class="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
      <p class="text-xl font-bold text-slate-800 dark:text-white">{storageStats.retention_days} 天</p>
      <p class="settings-muted mt-0.5">保留期限</p>
    </div>
  </div>
</div>

<!-- 数据管理 -->
<div class="settings-card">
  <h3 class="settings-card-title !mb-4">数据管理</h3>
  <div class="settings-block">
    <!-- 清理缓存 -->
    <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
      <div>
        <p class="settings-text">清理页面缓存</p>
        <p class="settings-muted mt-0.5">解决数据显示异常问题，不影响已保存的数据</p>
      </div>
      <button
        on:click={clearCache}
        class="settings-action-secondary"
      >
        清理缓存
      </button>
    </div>
    
    <!-- 清理历史 -->
    <div class="settings-panel-danger flex items-center justify-between">
      <div>
        <p class="settings-text-danger text-sm font-medium">清理历史数据</p>
        <p class="settings-muted mt-0.5">删除今天之前的所有活动记录和截图，不可恢复</p>
      </div>
      <button
        on:click={clearOldData}
        disabled={isClearing}
        class="settings-action-danger"
      >
        {#if isClearing}
          清理中...
        {:else}
          清理历史
        {/if}
      </button>
    </div>
  </div>
</div>
{/if}
