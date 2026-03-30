import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('日报页头部应使用独立布局以适配英文长标题与日期信息', async () => {
  const [reportSource, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reportSource, /class="report-hero"/);
  assert.match(reportSource, /class="report-hero-main"/);
  assert.match(reportSource, /class="report-hero-meta"/);
  assert.match(reportSource, /class="report-hero-actions"/);
  assert.doesNotMatch(reportSource, /<div class="page-header">/);

  assert.match(appCssSource, /\.report-hero\b/);
  assert.match(appCssSource, /\.report-hero-main\b/);
  assert.match(appCssSource, /\.report-hero-meta\b/);
  assert.match(appCssSource, /\.report-hero-actions\b/);
});
