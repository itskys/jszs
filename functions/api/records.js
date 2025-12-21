export async function onRequestGet(context) {
    const { env } = context;
  
    // 查询所有记录，按时间倒序排列
    const { results } = await env.DB.prepare(
      "SELECT * FROM results ORDER BY id DESC"
    ).all();
  
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  }