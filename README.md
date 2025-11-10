# Gold Monitor

一个基于 Cloudflare Workers 的黄金行情监控与预警平台。应用按分钟抓取公开金价数据，落库到 D1 数据库，并提供 Web 仪表盘、REST API 以及可配置的阈值/涨跌幅 webhook 预警。

## 功能概览

- 实时抓取零售价、上金所、国际盘等多个渠道的黄金报价
- 保存历史数据，可视化近期价格曲线
- 提供多条件筛选、搜索与常用品种快捷过滤
- 自定义预警规则（价格上下界、涨跌幅），触发时推送 Webhook
- 记录预警触发历史，便于复盘
- 每分钟自动运行的定时任务，无需额外调度器

## 技术栈

- Cloudflare Workers & D1（SQLite）
- TypeScript
- Chart.js（前端图表）
- Wrangler CLI 用于本地开发与部署

## 环境准备

- Node.js ≥ 18
- npm ≥ 9
- Cloudflare 账号与已安装的 Wrangler CLI (`npm install -g wrangler` 或项目内安装)

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```
2. 初始化 D1 数据库（首次执行）：
   ```bash
   wrangler d1 create gold-monitor-db
   ```
   将命令返回的 `database_id` 与 `database_name` 写入 `wrangler.toml` 中的 `[[d1_databases]]` 段落（仓库示例已填入占位值）。
3. 应用数据库迁移：
   ```bash
   npm run d1:migrate
   ```
4. 启动本地开发环境：
   ```bash
   npm run dev
   ```
   Wrangler 会启动一个本地 Worker，默认地址为 `http://127.0.0.1:8787`。
5. 部署到 Cloudflare：
   ```bash
   npm run deploy
   ```

## 数据库结构

迁移文件位于 `schema/0001_init.sql`，包含三张核心表：

- `prices`：存储每次抓取的报价明细，并为 `symbol + recorded_at` 建索引。
- `alert_rules`：保存预警规则，含阈值、类型、Webhook 地址及启用状态。
- `alert_events`：记录已触发的预警事件及相关负载。

## 定时抓取与数据落库

- `wrangler.toml` 中配置了 `*/1 * * * *` 的 cron 表达式，Worker 会每分钟执行一次 `scheduled` 事件。
- `src/index.ts` 中的 `handleScheduled` 函数将调用 `https://free.xwteam.cn/api/gold/trade`，解析返回数据，写入 D1。
- 插入完成后会调用 `evaluateAlertRules` 遍历启用的规则，必要时发送 Webhook 并记录触发事件。

## API 一览

| 方法 | 路径 | 描述 |
| --- | --- | --- |
| GET | `/` | 返回内置的单页仪表盘 UI |
| GET | `/api/prices/latest` | 查询每个品种最近一次的报价 |
| GET | `/api/prices?symbol=Au&limit=120` | 查询指定品种的历史报价，`limit` 默认 120，范围 10~1000 |
| GET | `/api/rules` | 列出所有预警规则 |
| POST | `/api/rules` | 创建预警规则（请求体为 JSON，见下文） |
| PATCH/PUT | `/api/rules/:id` | 更新或切换规则状态 |
| DELETE | `/api/rules/:id` | 删除规则 |

### 预警规则字段

```json
{
  "name": "黄金涨破930",
  "symbol": "Au",
  "rule_type": "price_above", // price_above | price_below | pct_increase | pct_decrease
  "threshold": 930,
  "window_minutes": 60,       // 仅涨跌幅规则必填
  "webhook_url": "https://example.com/hook"
}
```

Webhook 将收到如下 JSON 负载：

```json
{
  "ruleId": "uuid",
  "ruleName": "黄金涨破930",
  "symbol": "Au",
  "ruleType": "price_above",
  "threshold": 930,
  "latestPrice": 931.2,
  "changePercent": null,
  "triggeredAt": "2025-11-10T06:12:00.000Z"
}
```

## 本地开发注意事项

- 本地运行时需确保 D1 数据库已创建并绑定（`wrangler.toml` 内 `binding = "DB"`）。
- 若要模拟定时任务，可使用：
  ```bash
  wrangler dev --test-scheduled
  ```
  或直接调用 `handleScheduled` 相关逻辑（Wrangler 3.79 支持 `wrangler dev --cron`）。
- 若需自定义数据源或规则逻辑，可修改 `API_URL` 与 `evaluateAlertRules` 相关实现。

## 部署与生产建议

- Cloudflare Workers 免费版默认提供 1 分钟粒度的 Cron Triggers，请确认额度足够。
- 生产环境建议开启 `observability.logs`（配置已启用），便于排查 webhook 或抓取异常。
- Webhook 目标应具备幂等处理逻辑，避免重复通知带来副作用。
- 考虑在 D1 中对 `alert_events` 做定期归档或清理，以控制存储量。

## 许可证

未显式声明许可证，请在提交生产应用前根据需求选择或补充 License。


