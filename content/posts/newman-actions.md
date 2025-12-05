---
title: "Newman + GitHub Actions：接口自动化最小可行方案"
date: 2024-12-10
tags: ["接口测试", "CI", "Newman"]
categories: ["接口测试"]
summary: "用 Postman 集合 + Newman 在 CI 跑接口自动化：环境管理、数据驱动、报告与工件归档，一条流水线搞定。"
readTime: 4
wordcount: 1500
description: "Postman/Newman 集成 GitHub Actions 的最小配置，支持环境变量、数据文件与报告上传。"
---

## 准备
- 在 Postman 定义集合，参数化 Base URL、Token。  
- 导出 `collection.json` 和 `env.json`，放入仓库的 `tests/postman/`。  

## Newman 命令
```bash
newman run tests/postman/collection.json \
  -e tests/postman/env.json \
  -d tests/postman/data.csv \
  --reporters cli,html \
  --reporter-html-export newman-report.html
```

## GitHub Actions 工作流
```yaml
name: api-tests
on: [push, pull_request]
jobs:
  newman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install newman
        run: npm install -g newman
      - name: Run api tests
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TOKEN: ${{ secrets.TOKEN }}
        run: |
          newman run tests/postman/collection.json \
            -e tests/postman/env.json \
            --env-var baseUrl=$BASE_URL \
            --env-var token=$TOKEN \
            --reporters cli,html \
            --reporter-html-export newman-report.html
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: newman-report
          path: newman-report.html
```

## 最佳实践
- **环境与密钥**：通过 Actions Secrets 注入；本地用 `.env`。  
- **数据驱动**：用 CSV/JSON 做多场景，避开代码分支爆炸。  
- **报告与溯源**：上传 HTML 报告；失败时保留请求响应日志。  
- **分层用例**：烟雾集（核心接口）每个 PR 跑；全量每天或主干跑。  

## 总结
- Postman 编辑 + Newman 执行是最轻量的接口自动化方案。  
- 把环境、数据、报告都流水线化，可以稳定复用、快速定位问题。  
