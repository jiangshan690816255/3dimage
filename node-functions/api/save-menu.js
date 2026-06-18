import COS from "cos-nodejs-sdk-v5";

export async function onRequest(context) {
  const { env, request } = context;
  if (request.method !== "POST") {
    return Response.json({ success: false, message: "仅支持POST请求" }, { status: 405 });
  }

  const SecretId = env.COS_SECRET_ID;
  const SecretKey = env.COS_SECRET_KEY;
  const BUCKET = env.COS_BUCKET;
  const REGION = env.COS_REGION;

  if (!SecretId || !SecretKey || !BUCKET || !REGION) {
    return Response.json({ success: false, message: "COS配置缺失" }, { status: 500 });
  }

  try {
    // 读取前端POST提交的菜单JSON
    const body = await request.json();
    const jsonStr = JSON.stringify(body, null, 2);
    const buffer = Buffer.from(jsonStr, "utf-8");

    const cos = new COS({ SecretId, SecretKey });
    await new Promise((res, rej) => {
      cos.putObject(
        { Bucket: BUCKET, Region: REGION, Key: "menu.json", Body: buffer, ContentType: "application/json" },
        (e, d) => e ? rej(e) : res(d)
      );
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}