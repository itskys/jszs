export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // 构造插入语句，包含新增的 exam_version, switch_count, stats_json
    const stmt = env.DB.prepare(
      `INSERT INTO results (
         student_name, student_id, score, duration, correct_count, submit_time, 
         exam_version, switch_count, stats_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const info = await stmt.bind(
        data.studentName, 
        data.studentId, 
        data.score, 
        data.duration, 
        data.correctCount, 
        data.submitTime,
        data.examVersion || "完整版",  // 新增：版本
        data.switchCount || 0,        // 新增：切屏次数
        JSON.stringify(data.stats)    // 新增：详细战报(转为字符串存储)
    ).run();

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