-- 务必在 Cloudflare D1 控制台或使用 wrangler d1 execute 命令运行此 SQL
-- 用于创建实时监控表

CREATE TABLE IF NOT EXISTS monitor (
    session_id TEXT PRIMARY KEY,
    student_name TEXT,
    student_id TEXT,
    exam_version TEXT,
    start_time INTEGER,      -- 考试开始时间戳
    last_heartbeat INTEGER,  -- 最后一次心跳时间戳
    progress TEXT            -- 进度简报 (e.g. "15/100")
);

-- 建议添加索引以加速查询（可选）
CREATE INDEX IF NOT EXISTS idx_monitor_search ON monitor(student_id);
