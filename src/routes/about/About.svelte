<script>
  import { onDestroy, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-shell';
  import { getVersion } from '@tauri-apps/api/app';
  import { runUpdateFlow } from '$lib/utils/updater.js';

  let appVersion = '';
  let dataDir = '';
  
  let isCheckingUpdate = false;
  let updateStatus = '';
  let updateStatusTimer = null;

  onMount(async () => {
    try {
      appVersion = await getVersion();
      dataDir = await invoke('get_data_dir');
    } catch (e) {
      console.error('初始化失败:', e);
      appVersion = '1.0.0';
    }
  });

  async function openGitHub() {
    // 使用正确的仓库名（大小写一致）
    await open('https://github.com/wm94i/Work_Review');
  }
  // 通过后端命令直接调用系统文件管理器打开数据目录
  // 绕过 plugin-shell 对本地路径的兼容性问题
  async function openDataDir() {
    try {
      await invoke('open_data_dir');
    } catch (e) {
      console.error('打开目录失败:', e);
    }
  }

  // 检查更新
  async function checkForUpdates() {
    if (isCheckingUpdate) return;
    
    isCheckingUpdate = true;
    updateStatus = '正在检查更新...';

    await runUpdateFlow({
      onStatusChange: (status) => {
        updateStatus = status;
      },
    });

    isCheckingUpdate = false;
    if (updateStatus) {
      clearTimeout(updateStatusTimer);
      updateStatusTimer = setTimeout(() => {
        updateStatus = '';
        updateStatusTimer = null;
      }, 3000);
    }
  }

  onDestroy(() => {
    clearTimeout(updateStatusTimer);
  });
</script>

<div class="page-shell">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
    <div class="page-card px-6 py-7 text-center sm:px-8">
      <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[linear-gradient(180deg,#eef2ff,#ffffff)] shadow-[0_14px_30px_rgba(99,102,241,0.12)] ring-1 ring-slate-200/80 dark:bg-[linear-gradient(180deg,rgba(49,46,129,0.5),rgba(15,23,42,0.96))] dark:ring-slate-700/70">
        <img src="/icons/256x256.png" alt="Work Review" class="h-16 w-16 rounded-[18px] object-cover" />
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <h1 class="text-[2rem] font-semibold tracking-tight text-slate-900 dark:text-white">Work Review</h1>
        <span class="page-inline-chip-brand">v{appVersion}</span>
      </div>

      <p class="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
        记录工作过程、生成时间线和日报，所有核心数据默认仅保存在本机。
      </p>

      <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <button on:click={openGitHub} class="page-action-secondary min-h-10 px-4 py-2">
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          <span class="leading-none">GitHub</span>
        </button>
        <button on:click={openDataDir} class="page-action-secondary min-h-10 px-4 py-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <span class="leading-none">打开数据目录</span>
        </button>
        <button
          on:click={checkForUpdates}
          disabled={isCheckingUpdate}
          class="page-action-brand min-h-10 px-4 py-2 disabled:cursor-wait"
        >
          {#if isCheckingUpdate}
            <svg class="animate-spin h-4 w-4 shrink-0 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="leading-none">检查中...</span>
          {:else}
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span class="leading-none">检查更新</span>
          {/if}
        </button>
      </div>

      <div class="mx-auto mt-6 w-full max-w-2xl rounded-2xl border border-slate-200/75 bg-slate-50/72 px-5 py-4 text-center dark:border-slate-700/75 dark:bg-slate-800/34">
        <div class="flex flex-col items-center gap-1">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">本地数据目录</h3>
          <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Local Storage</span>
        </div>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          本地数据默认保存在这里，可在设置页“存储”中修改位置。
        </p>
        <p class="mx-auto mt-3 max-w-xl break-all rounded-xl border border-slate-200/80 bg-white/86 px-4 py-3 font-mono text-[13px] leading-6 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/52 dark:text-slate-300">
          {dataDir || '读取中...'}
        </p>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span class="page-inline-chip-brand">Tauri 2</span>
        <span class="page-inline-chip-muted">Svelte</span>
        <span class="page-inline-chip-muted">Rust</span>
        <span class="page-inline-chip-muted">SQLite</span>
      </div>
    </div>

    {#if updateStatus}
      <div class="page-banner-warning justify-center text-center">
        <div>
          <p class="font-semibold">更新状态</p>
          <p class="text-sm mt-1">{updateStatus}</p>
        </div>
      </div>
    {/if}
  </div>
</div>
