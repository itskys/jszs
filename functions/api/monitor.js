export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // GET: 获取在线列表 (Admin)
    if (request.method === "GET") {
        const secret = request.headers.get("X-Admin-Key");
        if (secret !== "800526") return new Response("Unauthorized", { status: 401 });

        // 1. 清理超时用户 (超过 2 分钟无心跳视为离线)
        const now = Date.now();
        const timeout = now - 2 * 60 * 1000;

        try {
            await env.DB.prepare("DELETE FROM monitor WHERE last_heartbeat < ?").bind(timeout).run();

            // 2. 获取剩余在线用户
            const { results } = await env.DB.prepare("SELECT * FROM monitor ORDER BY last_heartbeat DESC").all();

            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    // POST: 心跳上报 (Student)
    if (request.method === "POST") {
        try {
            const data = await request.json();
            const { sessionId, name, id, version, progress } = data;
            const now = Date.now();

            // Insert or Update (Upsert logic)
            // D1 SQLite upsert syntax:
            const stmt = env.DB.prepare(`
                INSERT INTO monitor (session_id, student_name, student_id, exam_version, start_time, last_heartbeat, progress)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                last_heartbeat = excluded.last_heartbeat,
                progress = excluded.progress
            `);

            await stmt.bind(sessionId, name, id, version, data.startTime || now, now, progress).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    return new Response("Method not allowed", { status: 405 });
}
