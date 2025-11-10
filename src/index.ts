const API_URL = "https://free.xwteam.cn/api/gold/trade";

type RuleType = "price_above" | "price_below" | "pct_increase" | "pct_decrease";

interface PriceItem {
  Symbol: string;
  Name: string;
  BP: number;
  SP: number;
  High: number;
  Low: number;
  Sort: number;
}

interface ApiResponse {
  code: number;
  msg: string;
  data: {
    UpTime: string;
    OpenMark: number;
    LF?: PriceItem[];
    SH?: PriceItem[];
    GJ?: PriceItem[];
  };
}

interface Env {
  DB: D1Database;
}

interface RuleRow {
  id: string;
  name: string;
  symbol: string;
  rule_type: RuleType;
  threshold: number;
  window_minutes: number | null;
  webhook_url: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface PriceRow {
  id: number;
  category: string;
  symbol: string;
  name: string;
  bid_price: number | null;
  ask_price: number | null;
  high: number | null;
  low: number | null;
  payload: string | null;
  recorded_at: string;
}

const htmlTemplate = /* html */ `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>黄金监控面板</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft Yahei", sans-serif;
        background: #f7fafc;
        color: #1a202c;
      }
      header {
        background: linear-gradient(135deg, #1d4ed8, #9333ea);
        color: #fff;
        padding: 24px;
        text-align: center;
      }
      header h1 {
        margin: 0;
        font-size: 26px;
      }
      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 16px 48px;
        display: grid;
        gap: 24px;
      }
      section {
        background: #fff;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      }
      h2 {
        margin: 0 0 16px;
        font-size: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      th {
        font-weight: 600;
        background: #f8fafc;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: #1d4ed8;
        background: rgba(37, 99, 235, 0.12);
      }
      .filters {
        margin-top: 18px;
        display: grid;
        gap: 16px;
        align-items: flex-end;
      }
      .filter-row {
        display: grid;
        gap: 14px;
      }
      @media (min-width: 640px) {
        .filter-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      .pill-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pill-button {
        border: none;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.16);
        color: #334155;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .pill-button.active {
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        color: #fff;
      }
      .filter-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .ghost-button {
        background: transparent;
        color: #2563eb;
        border: 1px solid rgba(37, 99, 235, 0.35);
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: none;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .ghost-button:hover {
        background: rgba(37, 99, 235, 0.1);
        transform: none;
        box-shadow: none;
      }
      .chart-container {
        position: relative;
        min-height: 320px;
      }
      .form-grid {
        display: grid;
        gap: 16px;
      }
      .form-row {
        display: grid;
        gap: 12px;
      }
      @media (min-width: 640px) {
        .form-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
      }
      input,
      select,
      textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #cbd5f5;
        border-radius: 10px;
        font-size: 14px;
        transition: border 0.2s ease, box-shadow 0.2s ease;
      }
      input:focus,
      select:focus,
      textarea:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
      }
      button {
        appearance: none;
        border: none;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        color: #fff;
        font-weight: 600;
        border-radius: 12px;
        padding: 12px 18px;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
      }
      .rules-table td:last-child {
        text-align: right;
      }
      .pill {
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .pill.green {
        background: rgba(16, 185, 129, 0.14);
        color: #047857;
      }
      .pill.red {
        background: rgba(239, 68, 68, 0.14);
        color: #b91c1c;
      }
      .muted {
        color: #64748b;
        font-size: 13px;
      }
      .actions button {
        background: transparent;
        color: #2563eb;
        padding: 6px 10px;
        font-size: 13px;
        box-shadow: none;
      }
      .actions button:hover {
        background: rgba(37, 99, 235, 0.12);
        border-radius: 8px;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 6px;
      }
      .status-dot.active {
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      }
      .status-dot.inactive {
        background: #cbd5f5;
      }
      .rules-empty {
        text-align: center;
        padding: 24px 0;
        color: #94a3b8;
        font-size: 14px;
      }
      .toast {
        position: fixed;
        bottom: 32px;
        right: 32px;
        background: #111827;
        color: #fff;
        padding: 14px 18px;
        border-radius: 12px;
        font-size: 14px;
        min-width: 220px;
        box-shadow: 0 18px 28px rgba(15, 23, 42, 0.35);
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .toast.show {
        opacity: 1;
        transform: translateY(0);
      }
    </style>
  </head>
  <body>
    <header>
      <h1>黄金监控面板</h1>
      <p style="margin-top: 8px; opacity: 0.92">自动抓取实时金价、管理预警规则并触发 Webhook</p>
    </header>
    <main>
      <section>
        <h2>最新报价</h2>
        <div class="muted" id="last-updated">加载中...</div>
        <div class="filters">
          <div class="filter-row">
            <div>
              <label>分类筛选</label>
              <div class="pill-group" id="category-pills">
                <button type="button" data-category="LF" class="pill-button active">零售价</button>
                <button type="button" data-category="SH" class="pill-button active">上金所</button>
                <button type="button" data-category="GJ" class="pill-button active">国际盘</button>
              </div>
            </div>
            <div>
              <label for="symbol-search">品种搜索</label>
              <input id="symbol-search" type="search" placeholder="输入代码或名称关键词" />
            </div>
          </div>
          <div class="filter-actions">
            <div class="muted">默认仅展示常用品种</div>
            <button type="button" id="toggle-uncommon" class="ghost-button">显示全部品种</button>
          </div>
        </div>
        <div style="overflow-x: auto; margin-top: 18px;">
          <table id="latest-table">
            <thead>
              <tr>
                <th>品种</th>
                <th>买入</th>
                <th>卖出</th>
                <th>最高</th>
                <th>最低</th>
                <th>分类</th>
                <th>记录时间</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>走势图</h2>
        <div class="form-row" style="margin-bottom: 16px;">
          <div>
            <label for="symbol-select">选择品种</label>
            <select id="symbol-select"></select>
          </div>
          <div>
            <label for="limit-select">历史点数</label>
            <select id="limit-select">
              <option value="60">最新 60</option>
              <option value="120">最新 120</option>
              <option value="240">最新 240</option>
              <option value="480">最新 480</option>
            </select>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="price-chart"></canvas>
        </div>
      </section>

      <section>
        <h2>预警规则</h2>
        <form id="rule-form" class="form-grid">
          <div class="form-row">
            <div>
              <label for="rule-name">规则名称</label>
              <input id="rule-name" name="name" placeholder="例如：黄金涨破930" required />
            </div>
            <div>
              <label for="rule-symbol">品种代码</label>
              <input id="rule-symbol" name="symbol" placeholder="例如：Au" required />
            </div>
          </div>
          <div class="form-row">
            <div>
              <label for="rule-type">规则类型</label>
              <select id="rule-type" name="rule_type">
                <option value="price_above">价格高于阈值</option>
                <option value="price_below">价格低于阈值</option>
                <option value="pct_increase">涨幅超过百分比</option>
                <option value="pct_decrease">跌幅超过百分比</option>
              </select>
            </div>
            <div>
              <label for="rule-threshold">阈值</label>
              <input id="rule-threshold" name="threshold" type="number" step="0.01" required />
            </div>
          </div>
          <div class="form-row">
            <div>
              <label for="rule-window">时间窗口（分钟, 百分比规则必填）</label>
              <input id="rule-window" name="window_minutes" type="number" min="1" />
            </div>
            <div>
              <label for="rule-webhook">Webhook URL</label>
              <input id="rule-webhook" name="webhook_url" type="url" placeholder="https://example.com/hook" required />
            </div>
          </div>
          <div>
            <button type="submit">新增规则</button>
          </div>
        </form>
        <div style="overflow-x: auto; margin-top: 24px;">
          <table class="rules-table" id="rules-table">
            <thead>
              <tr>
                <th>状态</th>
                <th>规则</th>
                <th>品种</th>
                <th>类型</th>
                <th>阈值</th>
                <th>时间窗口</th>
                <th>Webhook</th>
                <th></th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
          <div id="rules-empty" class="rules-empty" style="display: none;">暂时没有配置任何预警规则</div>
        </div>
      </section>
    </main>
    <div class="toast" id="toast"></div>
    <script>
      const toastEl = document.getElementById("toast");
      function showToast(message, isError = false) {
        toastEl.textContent = message;
        toastEl.style.background = isError ? "#b91c1c" : "#111827";
        toastEl.classList.add("show");
        setTimeout(() => toastEl.classList.remove("show"), 3200);
      }

      const COMMON_SYMBOLS = new Set(["Au", "Pt", "Pd", "Ag", "SH_AuTD", "SH_Au9999", "GJ_HKAu", "GJ_Au", "GJ_USD"]);
      let latestData = [];
      let showUncommon = false;
      const activeCategories = new Set(["LF", "SH", "GJ"]);

      async function loadLatest() {
        const res = await fetch("/api/prices/latest");
        if (!res.ok) throw new Error("无法加载最新价格");
        const data = await res.json();
        latestData = data.results ?? [];
        renderLatest();
        document.getElementById("last-updated").textContent = data.results.length
          ? \`最后更新：\${new Date(data.results[0].recorded_at).toLocaleString()}\`
          : "尚无数据";
        const symbolSelect = document.getElementById("symbol-select");
        if (!symbolSelect.dataset.initialized) {
          const existed = new Set();
          latestData.forEach((item) => {
            if (existed.has(item.symbol)) return;
            existed.add(item.symbol);
            const option = document.createElement("option");
            option.value = item.symbol;
            option.textContent = \`\${item.symbol} - \${item.name}\`;
            symbolSelect.appendChild(option);
          });
          symbolSelect.dataset.initialized = "1";
          if (data.results[0]) {
            symbolSelect.value = data.results[0].symbol;
            loadSeries();
          }
        }
      }

      function renderLatest() {
        const tbody = document.querySelector("#latest-table tbody");
        tbody.innerHTML = "";
        const keyword = document.getElementById("symbol-search").value.trim().toLowerCase();
        let filtered = latestData.filter((item) => activeCategories.has(item.category));
        if (keyword) {
          filtered = filtered.filter(
            (item) => item.symbol.toLowerCase().includes(keyword) || item.name.toLowerCase().includes(keyword)
          );
        }
        if (!showUncommon) {
          filtered = filtered.filter((item) => COMMON_SYMBOLS.has(item.symbol));
        }
        filtered.forEach((item) => {
          const tr = document.createElement("tr");
          const priceBadge = item.category === "LF" ? "零售价" : item.category === "SH" ? "上金所" : "国际盘";
          tr.innerHTML = \`
            <td>
              <div style="font-weight: 600;">\${item.name}</div>
              <div class="muted">\${item.symbol}</div>
            </td>
            <td>\${item.bid_price?.toFixed(2) ?? "-"}</td>
            <td>\${item.ask_price?.toFixed(2) ?? "-"}</td>
            <td>\${item.high?.toFixed(2) ?? "-"}</td>
            <td>\${item.low?.toFixed(2) ?? "-"}</td>
            <td><span class="badge">\${priceBadge}</span></td>
            <td>\${new Date(item.recorded_at).toLocaleString()}</td>
          \`;
          tbody.appendChild(tr);
        });
        if (!filtered.length) {
          const tr = document.createElement("tr");
          tr.innerHTML = '<td colspan="7" class="muted" style="text-align:center;padding:20px;">当前筛选条件下没有数据</td>';
          tbody.appendChild(tr);
        }
      }

      let chart;
      async function loadSeries() {
        const symbol = document.getElementById("symbol-select").value;
        const limit = document.getElementById("limit-select").value;
        if (!symbol) return;
        const res = await fetch(\`/api/prices?symbol=\${encodeURIComponent(symbol)}&limit=\${limit}\`);
        if (!res.ok) {
          showToast("加载历史数据失败", true);
          return;
        }
        const data = await res.json();
        const labels = data.results.map((item) => new Date(item.recorded_at).toLocaleTimeString());
        const prices = data.results.map((item) => item.ask_price ?? item.bid_price ?? null);
        const ctx = document.getElementById("price-chart");
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: symbol + " 报价",
                data: prices,
                fill: false,
                borderColor: "#2563EB",
                tension: 0.32,
                pointRadius: 0
              }
            ]
          },
          options: {
            interaction: { intersect: false, mode: "index" },
            plugins: {
              legend: { display: true },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const v = ctx.parsed.y;
                    return Number.isFinite(v) ? \`价格：\${v.toFixed(2)}\` : "无数据";
                  }
                }
              }
            },
            scales: {
              x: { display: true, title: { display: true, text: "时间" } },
              y: { display: true, beginAtZero: false }
            }
          }
        });
      }

      async function loadRules() {
        const res = await fetch("/api/rules");
        if (!res.ok) throw new Error("加载规则失败");
        const data = await res.json();
        const tbody = document.querySelector("#rules-table tbody");
        const empty = document.getElementById("rules-empty");
        tbody.innerHTML = "";
        if (!data.results.length) {
          empty.style.display = "block";
          return;
        }
        empty.style.display = "none";
        data.results.forEach((rule) => {
          const tr = document.createElement("tr");
          const typeMap = {
            price_above: "价格 ≥ 阈值",
            price_below: "价格 ≤ 阈值",
            pct_increase: "涨幅 ≥ %",
            pct_decrease: "跌幅 ≥ %"
          };
          const active = rule.is_active === 1;
          tr.innerHTML = \`
            <td><span class="status-dot \${active ? "active" : "inactive"}"></span>\${active ? "启用" : "停用"}</td>
            <td>
              <div style="font-weight: 600;">\${rule.name}</div>
              <div class="muted">\${new Date(rule.updated_at).toLocaleString()}</div>
            </td>
            <td>\${rule.symbol}</td>
            <td>\${typeMap[rule.rule_type] ?? rule.rule_type}</td>
            <td>\${rule.threshold}</td>
            <td>\${rule.window_minutes ?? "-"} 分钟</td>
            <td style="max-width: 180px; word-break: break-all;">\${rule.webhook_url}</td>
            <td class="actions">
              <button data-action="toggle" data-id="\${rule.id}">\${active ? "停用" : "启用"}</button>
              <button data-action="delete" data-id="\${rule.id}">删除</button>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      }

      document.getElementById("symbol-select").addEventListener("change", loadSeries);
      document.getElementById("limit-select").addEventListener("change", loadSeries);
      document.getElementById("symbol-search").addEventListener("input", () => {
        renderLatest();
      });
      document.getElementById("toggle-uncommon").addEventListener("click", (event) => {
        event.preventDefault();
        showUncommon = !showUncommon;
        event.currentTarget.textContent = showUncommon ? "隐藏不常用品种" : "显示全部品种";
        renderLatest();
      });
      document.querySelectorAll("#category-pills .pill-button").forEach((button) => {
        button.addEventListener("click", () => {
          const category = button.dataset.category;
          if (!category) return;
          if (button.classList.contains("active")) {
            if (activeCategories.size === 1) return;
            button.classList.remove("active");
            activeCategories.delete(category);
          } else {
            button.classList.add("active");
            activeCategories.add(category);
          }
          renderLatest();
        });
      });

      document.getElementById("rule-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        if ((payload.rule_type === "pct_increase" || payload.rule_type === "pct_decrease") && !payload.window_minutes) {
          showToast("百分比规则需要设置时间窗口", true);
          return;
        }
        if (payload.window_minutes === "") {
          payload.window_minutes = null;
        } else {
          payload.window_minutes = Number(payload.window_minutes);
        }
        payload.threshold = Number(payload.threshold);
        const res = await fetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.message ?? "新增规则失败", true);
          return;
        }
        form.reset();
        showToast("规则已新增");
        loadRules();
      });

      document.querySelector("#rules-table tbody").addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const action = button.dataset.action;
        if (action === "delete") {
          if (!confirm("确认删除该规则？")) return;
          const res = await fetch(\`/api/rules/\${id}\`, { method: "DELETE" });
          if (!res.ok) {
            showToast("删除失败", true);
            return;
          }
          showToast("规则已删除");
          loadRules();
        } else if (action === "toggle") {
          const res = await fetch(\`/api/rules/\${id}\`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toggle: true })
          });
          if (!res.ok) {
            showToast("更新失败", true);
            return;
          }
          showToast("规则状态已更新");
          loadRules();
        }
      });

      async function bootstrap() {
        try {
          await loadLatest();
          await loadRules();
        } catch (error) {
          console.error(error);
          showToast("初始化失败，请稍后刷新重试", true);
        }
      }

      bootstrap();
      setInterval(loadLatest, 60_000);
    </script>
  </body>
</html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(htmlTemplate, {
        headers: {
          "content-type": "text/html; charset=UTF-8"
        }
      });
    }

    if (url.pathname === "/api/prices/latest" && request.method === "GET") {
      const latestResult = await env.DB.prepare(
        `SELECT p.*
         FROM prices p
         JOIN (
           SELECT symbol, MAX(recorded_at) AS recorded_at
           FROM prices
           GROUP BY symbol
         ) latest ON p.symbol = latest.symbol AND p.recorded_at = latest.recorded_at
         ORDER BY p.recorded_at DESC`
      ).all();
      const latestRows = (latestResult.results ?? []) as unknown as PriceRow[];
      return jsonResponse({ results: latestRows });
    }

    if (url.pathname === "/api/prices" && request.method === "GET") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) {
        return jsonResponse({ message: "缺少 symbol 参数" }, 400);
      }
      const limit = clampLimit(Number(url.searchParams.get("limit") ?? "120"), 10, 1000);
      const priceResult = await env.DB.prepare(
        `SELECT *
         FROM prices
         WHERE symbol = ?
         ORDER BY recorded_at DESC
         LIMIT ?`
      )
        .bind(symbol, limit)
        .all();
      const priceRows = (priceResult.results ?? []) as unknown as PriceRow[];
      return jsonResponse({ results: priceRows });
    }

    if (url.pathname === "/api/rules" && request.method === "GET") {
      const ruleResult = await env.DB.prepare(
        `SELECT *
         FROM alert_rules
         ORDER BY created_at DESC`
      ).all();
      const ruleRows = (ruleResult.results ?? []) as unknown as RuleRow[];
      return jsonResponse({ results: ruleRows });
    }

    if (url.pathname === "/api/rules" && request.method === "POST") {
      const body = await readJson(request);
      if (!body) {
        return jsonResponse({ message: "请求体必须是JSON" }, 400);
      }
      const { name, symbol, rule_type, threshold, window_minutes, webhook_url } = body as Record<string, unknown>;
      const validationError = validateRulePayload({
        name,
        symbol,
        rule_type,
        threshold,
        window_minutes,
        webhook_url
      });
      if (validationError) {
        return jsonResponse({ message: validationError }, 400);
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO alert_rules (id, name, symbol, rule_type, threshold, window_minutes, webhook_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          String(name),
          String(symbol),
          rule_type as string,
          Number(threshold),
          window_minutes == null ? null : Number(window_minutes),
          String(webhook_url),
          1,
          now,
          now
        )
        .run();
      const createdResult = await env.DB.prepare(
        `SELECT *
         FROM alert_rules
         WHERE id = ?`
      )
        .bind(id)
        .first();
      const createdRule = createdResult as RuleRow | null;
      return jsonResponse({ result: createdRule }, 201);
    }

    const ruleMatch = url.pathname.match(/^\/api\/rules\/([^/]+)$/);
    if (ruleMatch) {
      const ruleId = ruleMatch[1];
      if (request.method === "DELETE") {
        await env.DB.prepare(
          `DELETE FROM alert_rules
           WHERE id = ?`
        )
          .bind(ruleId)
          .run();
        return jsonResponse({ success: true });
      }
      if (request.method === "PATCH" || request.method === "PUT") {
        const body = await readJson(request);
        if (!body) {
          return jsonResponse({ message: "请求体必须是JSON" }, 400);
        }
        if ((body as Record<string, unknown>).toggle === true) {
          const currentResult = await env.DB.prepare(
            `SELECT is_active
             FROM alert_rules
             WHERE id = ?`
          )
            .bind(ruleId)
            .first();
          const rule = currentResult as { is_active: number } | null;
          if (!rule) {
            return jsonResponse({ message: "未找到规则" }, 404);
          }
          const updatedAt = new Date().toISOString();
          await env.DB.prepare(
            `UPDATE alert_rules
             SET is_active = ?, updated_at = ?
             WHERE id = ?`
          )
            .bind(rule.is_active === 1 ? 0 : 1, updatedAt, ruleId)
            .run();
          const latest = await env.DB.prepare(
            `SELECT *
             FROM alert_rules
             WHERE id = ?`
          )
            .bind(ruleId)
            .first();
          const latestRule = latest as RuleRow | null;
          return jsonResponse({ result: latestRule });
        }
        const { name, symbol, rule_type, threshold, window_minutes, webhook_url, is_active } = body as Record<
          string,
          unknown
        >;
        const validationError = validateRulePayload({
          name,
          symbol,
          rule_type,
          threshold,
          window_minutes,
          webhook_url,
          is_active: is_active ?? undefined,
          allowPartial: true
        });
        if (validationError) {
          return jsonResponse({ message: validationError }, 400);
        }
        const fields: string[] = [];
        const values: unknown[] = [];
        if (name != null) {
          fields.push("name = ?");
          values.push(String(name));
        }
        if (symbol != null) {
          fields.push("symbol = ?");
          values.push(String(symbol));
        }
        if (rule_type != null) {
          fields.push("rule_type = ?");
          values.push(String(rule_type));
        }
        if (threshold != null) {
          fields.push("threshold = ?");
          values.push(Number(threshold));
        }
        if (window_minutes !== undefined) {
          fields.push("window_minutes = ?");
          values.push(window_minutes == null ? null : Number(window_minutes));
        }
        if (webhook_url != null) {
          fields.push("webhook_url = ?");
          values.push(String(webhook_url));
        }
        if (is_active != null) {
          fields.push("is_active = ?");
          values.push(Number(is_active) ? 1 : 0);
        }
        if (!fields.length) {
          return jsonResponse({ message: "没有可更新的字段" }, 400);
        }
        fields.push("updated_at = ?");
        values.push(new Date().toISOString());
        values.push(ruleId);
        await env.DB.prepare(`UPDATE alert_rules SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
        const latestResult = await env.DB.prepare(
          `SELECT *
           FROM alert_rules
           WHERE id = ?`
        )
          .bind(ruleId)
          .first();
        const latestRule = latestResult as RuleRow | null;
        return jsonResponse({ result: latestRule });
      }
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env));
  }
};

async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    console.error("获取金价失败", response.status, await response.text());
    return;
  }
  const data = (await response.json()) as ApiResponse;
  if (data.code !== 200 || !data.data) {
    console.error("接口返回异常", data);
    return;
  }
  const recordedAt = new Date(event.scheduledTime ?? Date.now()).toISOString();
  const records = extractRecords(data).map((item) => ({
    ...item,
    recorded_at: recordedAt,
    payload: JSON.stringify(item.payload)
  }));

  if (!records.length) {
    console.warn("本次抓取未获得任何数据");
    return;
  }

  const insert = env.DB.prepare(
    `INSERT INTO prices (category, symbol, name, bid_price, ask_price, high, low, payload, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const statements = records.map((record) =>
    insert.bind(
      record.category,
      record.symbol,
      record.name,
      record.bid_price,
      record.ask_price,
      record.high,
      record.low,
      record.payload,
      record.recorded_at
    )
  );
  await env.DB.batch(statements);

  await evaluateAlertRules(env, recordedAt);
}

function extractRecords(api: ApiResponse) {
  const result: Array<{
    category: string;
    symbol: string;
    name: string;
    bid_price: number | null;
    ask_price: number | null;
    high: number | null;
    low: number | null;
    payload: unknown;
  }> = [];
  const groups: Record<string, PriceItem[] | undefined> = {
    LF: api.data.LF,
    SH: api.data.SH,
    GJ: api.data.GJ
  };
  for (const [category, items] of Object.entries(groups)) {
    if (!items?.length) continue;
    for (const item of items) {
      result.push({
        category,
        symbol: item.Symbol,
        name: item.Name,
        bid_price: toNullableNumber(item.BP),
        ask_price: toNullableNumber(item.SP),
        high: toNullableNumber(item.High),
        low: toNullableNumber(item.Low),
        payload: item
      });
    }
  }
  return result;
}

function toNullableNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  if (value === 0) {
    return 0;
  }
  return value;
}

async function evaluateAlertRules(env: Env, timestampIso: string): Promise<void> {
  const ruleResult = await env.DB.prepare(`SELECT * FROM alert_rules WHERE is_active = 1`).all();
  const rules = (ruleResult.results ?? []) as unknown as RuleRow[];
  if (!rules.length) return;
  for (const rule of rules) {
    try {
      await maybeTriggerRule(rule, env, timestampIso);
    } catch (error) {
      console.error("评估规则失败", rule.id, error);
    }
  }
}

async function maybeTriggerRule(rule: RuleRow, env: Env, timestampIso: string): Promise<void> {
  const latestResult = await env.DB.prepare(
    `SELECT *
     FROM prices
     WHERE symbol = ?
     ORDER BY recorded_at DESC
     LIMIT 1`
  )
    .bind(rule.symbol)
    .first();
  const latest = latestResult as PriceRow | null;
  if (!latest) return;

  const latestPrice = pickEffectivePrice(latest);
  if (latestPrice == null) return;

  let shouldTrigger = false;
  let changePercent: number | null = null;

  switch (rule.rule_type) {
    case "price_above":
      shouldTrigger = latestPrice >= rule.threshold;
      break;
    case "price_below":
      shouldTrigger = latestPrice <= rule.threshold;
      break;
    case "pct_increase":
    case "pct_decrease": {
      const windowMinutes = rule.window_minutes ?? 60;
      const windowStart = new Date(Date.parse(timestampIso) - windowMinutes * 60_000).toISOString();
      const pastResult = await env.DB.prepare(
        `SELECT *
         FROM prices
         WHERE symbol = ?
           AND recorded_at <= ?
         ORDER BY recorded_at DESC
         LIMIT 1`
      )
        .bind(rule.symbol, windowStart)
        .first();
      const past = pastResult as PriceRow | null;
      if (!past) return;
      const pastPrice = pickEffectivePrice(past);
      if (pastPrice == null || pastPrice === 0) return;
      changePercent = ((latestPrice - pastPrice) / pastPrice) * 100;
      if (rule.rule_type === "pct_increase") {
        shouldTrigger = changePercent >= rule.threshold;
      } else {
        shouldTrigger = Math.abs(changePercent) >= rule.threshold && changePercent <= -Math.abs(rule.threshold);
      }
      break;
    }
    default:
      console.warn("未知的规则类型", rule.rule_type);
      return;
  }

  if (!shouldTrigger) return;

  const payload = {
    ruleId: rule.id,
    ruleName: rule.name,
    symbol: rule.symbol,
    ruleType: rule.rule_type,
    threshold: rule.threshold,
    latestPrice,
    changePercent,
    triggeredAt: timestampIso
  };

  await sendWebhook(rule.webhook_url, payload);

  await env.DB.prepare(
    `INSERT INTO alert_events (rule_id, symbol, rule_type, latest_price, change_percent, triggered_at, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      rule.id,
      rule.symbol,
      rule.rule_type,
      latestPrice,
      changePercent,
      timestampIso,
      JSON.stringify(payload)
    )
    .run();
}

function pickEffectivePrice(row: PriceRow): number | null {
  const ask = row.ask_price ?? null;
  const bid = row.bid_price ?? null;
  if (ask != null && ask > 0) return ask;
  if (bid != null && bid > 0) return bid;
  if (ask != null) return ask;
  if (bid != null) return bid;
  return null;
}

async function sendWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error("Webhook调用失败", url, res.status, await res.text());
    }
  } catch (error) {
    console.error("Webhook调用异常", url, error);
  }
}

function clampLimit(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch (_error) {
    return null;
  }
}

function validateRulePayload(input: {
  name?: unknown;
  symbol?: unknown;
  rule_type?: unknown;
  threshold?: unknown;
  window_minutes?: unknown;
  webhook_url?: unknown;
  is_active?: unknown;
  allowPartial?: boolean;
}): string | null {
  const { allowPartial = false } = input;
  const requiredFields: Array<keyof typeof input> = ["name", "symbol", "rule_type", "threshold", "webhook_url"];
  if (!allowPartial) {
    for (const field of requiredFields) {
      if (input[field] == null) {
        return `字段 ${String(field)} 不能为空`;
      }
    }
  }
  const ruleType = input.rule_type;
  if (ruleType != null && !["price_above", "price_below", "pct_increase", "pct_decrease"].includes(String(ruleType))) {
    return "rule_type 不合法";
  }
  if (input.threshold != null && !Number.isFinite(Number(input.threshold))) {
    return "threshold 必须是数字";
  }
  if (input.window_minutes !== undefined && input.window_minutes !== null) {
    const wm = Number(input.window_minutes);
    if (!Number.isFinite(wm) || wm <= 0) {
      return "window_minutes 必须是正整数";
    }
  }
  if (
    (ruleType === "pct_increase" || ruleType === "pct_decrease") &&
    (input.window_minutes == null || Number(input.window_minutes) <= 0)
  ) {
    return "百分比规则必须提供 window_minutes";
  }
  if (input.webhook_url != null) {
    try {
      new URL(String(input.webhook_url));
    } catch (_error) {
      return "webhook_url 非法";
    }
  }
  if (input.is_active != null && ![0, 1, true, false].includes(input.is_active as never)) {
    return "is_active 必须是布尔或 0/1";
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "access-control-allow-origin": "*"
    }
  });
}



