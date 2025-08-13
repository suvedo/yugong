CREATE TABLE agents (
  agent_id     TEXT    PRIMARY KEY,
  agent_meta_data_vec  VECTOR(2048),
  agent_meta_data      TEXT
);

CREATE TABLE agent_retrieve_click_log (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  request_id TEXT,
  retrieve_result TEXT,
  retrieve_time   TEXT,
  click_log       TEXT
);

CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE a2a_server (
  user_id     TEXT    NOT NULL,
  a2a_server_url TEXT    NOT NULL,
  version      TEXT  NOT NULL,
  name  TEXT NOT NULL,
  agent_server_url TEXT NOT NULL,
  provider_org    TEXT,
  provider_url    TEXT,
  name_provider_org     TEXT  UNIQUE NOT NULL,
  agent_card_json_str   TEXT  NOT NULL,
  semantic_json_embedding VECTOR(2048) NOT NULL,
  semantic_json_str TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ,
  PRIMARY KEY (a2a_server_url)
);
-- 创建前缀索引
CREATE INDEX name_provider_org_idx ON a2a_server (name_provider_org varchar_pattern_ops); 
-- 检查索引是否生效
EXPLAIN ANALYZE SELECT * FROM a2a_server  WHERE name_provider_org LIKE 'your_prefix%';

-- 启用pg_trgm扩展
CREATE EXTENSION pg_trgm;
-- 创建 GIN 全文索引
CREATE INDEX idx_name_trgm ON a2a_server USING GIN (name_provider_org gin_trgm_ops);
-- 查询语句（相似度查询）
SELECT name_provider_org, similarity(name_provider_org, '图成') AS score
FROM a2a_server 
ORDER BY score DESC
LIMIT 2;
-- 查询时间并转换成北京时间的语句
SELECT created_at AT TIME ZONE 'Asia/Shanghai' AS created_at_bj FROM a2a_server

CREATE TABLE files (
  id     TEXT    PRIMARY KEY,
  filename TEXT, 
  mime_type TEXT, 
  size      INTEGER NOT NULL,
  content BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  user_id     TEXT,
  thread_id   TEXT, 
  message_id  TEXT, 
  user_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, message_id)
);

CREATE TABLE chat_list (
  thread_id   TEXT, 
  user_id     TEXT,
  title       TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id)
);

-- 缓存表
CREATE UNLOGGED TABLE cache (
    key TEXT PRIMARY KEY,
    value JSONB,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour' -- 默认1小时过期
);

CREATE TABLE user_info (
  user_id     TEXT,
  to_mail    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);