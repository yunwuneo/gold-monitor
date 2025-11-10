CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  bid_price REAL,
  ask_price REAL,
  high REAL,
  low REAL,
  payload JSON,
  recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prices_symbol_time ON prices (symbol, recorded_at DESC);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  threshold REAL NOT NULL,
  window_minutes INTEGER,
  webhook_url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_symbol ON alert_rules (symbol);

CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  latest_price REAL NOT NULL,
  change_percent REAL,
  triggered_at TEXT NOT NULL,
  payload JSON,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_alert_events_rule_time ON alert_events (rule_id, triggered_at DESC);



