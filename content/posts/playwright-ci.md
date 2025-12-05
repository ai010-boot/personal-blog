---
title: "在 CI 跑 Playwright：缓存、分片与失败留痕"
date: 2025-01-18
tags: ["自动化", "CI", "Playwright"]
categories: ["自动化测试"]
summary: "讲清楚在 CI 集成 Playwright 时的缓存、并发分片、截图录像归档与调试技巧，减少 flaky 与排查成本。"
readTime: 6
wordcount: 2100
description: "Playwright 在 CI 的最佳实践：缓存依赖、分片、失败截图录像、工件归档、重试与调试。"
---

## 目标
- 把 UI 自动化集成到 CI，尽量减少执行时间与排查成本。
- 当用例失败，留足截图/录像/trace，方便复现。

## 流程设计
1) **依赖缓存**：Node 版本 pin 住，缓存 `~/.cache/ms-playwright` 和 `node_modules`。  
2) **并发分片**：用 `--shard=1/3` 这类参数切片；或用 `npx playwright test --grep "@smoke"` 跑烟雾集。  
3) **工件归档**：开启 `trace: "on-first-retry"`，并上传 `playwright-report`、`test-results` 目录。  
4) **失败重试**：`retries: 1`；仅在 CI 打开。  
5) **基线集**：主分支跑全量；PR 只跑冒烟 + 关键路径。

## Playwright 配置示例
```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

## GitHub Actions 最小工作流
```yaml
name: ui-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: 安装依赖
        run: npm ci
      - name: 安装浏览器缓存
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-pw-${{ hashFiles('package-lock.json') }}
      - name: 运行测试
        run: npx playwright test --shard=${{ matrix.shard }}
    strategy:
      fail-fast: false
      matrix:
        shard: ["1/2", "2/2"]
```

## 调试技巧
- 在失败 job 中下载 trace/html 报告，本地 `npx playwright show-trace trace.zip` 复盘。  
- 若存在 flaky，用 `test.describe.configure({ mode: 'serial' })` 封装依赖顺序的用例，减少互相污染。  
- 为等待策略加自定义 matcher，例如等待接口返回 200 再操作页面。  

## 总结
- 缓存 + 分片 = 时间可控；trace + screenshot + video = 可复现。  
- PR 跑冒烟，全量留在主分支；失败留痕 + 重试，优先解决 flaky 根因。  
