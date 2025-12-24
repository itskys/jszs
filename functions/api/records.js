export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. 获取请求头里的密码
  const secretKey = request.headers.get("X-Admin-Key");

  // 2. 简单的密码比对 (你可以把 '123456' 改成复杂的密码)
  // 注意：真实生产环境通常把密码存在环境变量里，但这里硬编码足够用了
  const MY_SECRET = "800526";

  if (secretKey !== MY_SECRET) {
    return new Response(JSON.stringify({ error: "无权访问: 密码错误" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. 密码正确，才查数据库
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM results ORDER BY id DESC"
    ).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const secretKey = request.headers.get("X-Admin-Key");
  const MY_SECRET = "800526"; // 简单密码

  // 1. 鉴权
  if (secretKey !== MY_SECRET) {
    return new Response(JSON.stringify({ error: "无权访问" }), { status: 401 });
  }

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
  }

  // 2. 删除
  try {
    const info = await env.DB.prepare(
      "DELETE FROM results WHERE id = ?"
    ).bind(id).run();

    return new Response(JSON.stringify({ success: true, deleted: info.meta.changes }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}