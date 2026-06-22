// node-functions/api/verify-admin.js
export async function onRequest(context) {
  const { env, request } = context;

  if (request.method !== "POST") {
    return Response.json({ success: false, message: "仅支持POST请求" }, { status: 405 });
  }

  const adminId = env.ADMIN_APP_ID;
  if (!adminId) {
    return Response.json({ success: false, message: "服务端未配置 ADMIN_APP_ID 环境变量" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { password } = body;
    if (password === adminId) {
      return Response.json({ success: true });
    }
    return Response.json({ success: false, message: "密码错误，非法操作" }, { status: 403 });
  } catch (err) {
    return Response.json({ success: false, message: "请求格式错误" }, { status: 400 });
  }
}
