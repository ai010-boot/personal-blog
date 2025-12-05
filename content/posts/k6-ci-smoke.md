---
title: "k6 压测烟雾在 CI：避免性能回归的小闭环"
date: 2024-12-28
tags: ["性能", "CI", "k6"]
categories: ["性能测试"]
summary: "用 k6 做轻量基准/烟雾压测：编写 SLA 断言、GitHub Actions 集成、指标上报与阈值，让性能问题早点暴露。"
readTime: 5
wordcount: 1800
description: "在 CI 跑 k6 压测烟雾，设定阈值、上报指标，并与前端/后端变更联动，防止性能劣化。"
---

## 为什么要烟雾压测
- 性能劣化常来自小改动；在 CI 跑 1-3 分钟的基准可以提前报警。  
- 关注接口 P95、失败率、超时率即可，不需要长时间打满。  

## k6 脚本示例
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<800'], // SLA
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/health`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

## GitHub Actions 集成
```yaml
name: k6-smoke
on: [push, pull_request]
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        uses: grafana/setup-k6-action@v1
      - name: Run k6 smoke
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
        run: k6 run tests/smoke.js
```

## 指标与可观测性
- 在 CI 阶段可以把 `--out json=report.json` 上传为工件；若有 Prometheus/Grafana，可用 `--out influxdb=http://...` 上报。  
- 若使用前后端分环境，配置 `BASE_URL` 指向预发，避免污染正式数据。  

## 阈值策略
- 阈值写在脚本里可读性高；也可以按环境切换，例如在 PR 环境放宽。  
- 对核心接口设置单独阈值，避免被整体平均值掩盖。  

## 总结
- k6 烟雾能在几分钟内发现明显劣化；阈值即质量门禁。  
- 指标上报 + 可视化，能长期观察趋势；与变更关联，方便定位责任代码。  
