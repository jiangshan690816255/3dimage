import COS from "cos-nodejs-sdk-v5";

export async function onRequest(context) {
  const { env, request } = context;
  const urlObj = new URL(request.url);
  const key = urlObj.searchParams.get("key");

  const SecretId = env.COS_SECRET_ID;
  const SecretKey = env.COS_SECRET_KEY;
  const BUCKET = env.COS_BUCKET;
  const REGION = env.COS_REGION;

  if (!SecretId || !SecretKey || !BUCKET || !REGION) {
    return Response.json({ success: false, message: "COS配置缺失" }, { status: 500 });
  }
  if (!key) {
    return Response.json({ success: false, message: "缺少key参数" }, { status: 400 });
  }

  const cos = new COS({ SecretId, SecretKey });
  try {
    const fileRes = await new Promise((res, rej) => {
      cos.getObject({ Bucket: BUCKET, Region: REGION, Key: key }, (e, d) => e ? rej(e) : res(d));
    });
    const contentType = fileRes.headers?.["content-type"] || "application/octet-stream";
    // 将COS二进制Buffer转成浏览器可读Blob响应
    return new Response(fileRes.Body, {
      headers: { "Content-Type": contentType }
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}