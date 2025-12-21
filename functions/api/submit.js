export async function onRequestPost(context) {
    try {
      const { request, env } = context;
      const data = await request.json();
  
      // 插入数据到 D1 数据库
      const info = await env.DB.prepare(
        `INSERT INTO results (student_name, student_id, score, duration, correct_count, submit_time) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(data.studentName, data.studentId, data.score, data.duration, data.correctCount, data.submitTime)
      .run();
  
      return new Response(JSON.stringify({ success: true, info }), {
        headers: { "Content-Type": "application/json" },
      });
  
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }