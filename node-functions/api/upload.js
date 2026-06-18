// node-functions/api/upload.js
import COS from "cos-nodejs-sdk-v5";

export async function onRequest(context) {
  const { env, request } = context;
  // 仅允许POST上传
  if (request.method !== "POST") {
    return Response.json({ success: false, message: "仅支持POST请求" }, { status: 405 });
  }

  // 读取COS环境变量
  const SecretId = env.COS_SECRET_ID;
  const SecretKey = env.COS_SECRET_KEY;
  const BUCKET = env.COS_BUCKET;
  const REGION = env.COS_REGION;
  if (!SecretId || !SecretKey || !BUCKET || !REGION) {
    return Response.json({ success: false, message: "COS环境变量配置缺失" }, { status: 500 });
  }

  try {
    // 解析前端FormData
    const formData = await request.formData();
    const file = formData.get("file");
    const customKey = formData.get("key") || "";

    if (!file) {
      return Response.json({ success: false, message: "未上传文件" }, { status: 400 });
    }

    // 拆分文件名后缀
    const fileName = file.name;
    const ext = fileName.split(".").pop();
    // 生成COS存储路径key
    let key;
    if (customKey) {
      key = customKey;
    } else {
      key = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    }

    // 文件二进制Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "application/octet-stream";

    // 初始化COS实例
    const cos = new COS({ SecretId, SecretKey });
    // 封装上传Promise
    const uploadToCOS = () => {
      return new Promise((resolve, reject) => {
        cos.putObject({
          Bucket: BUCKET,
          Region: REGION,
          Key: key,
          Body: buffer,
          ContentType: contentType
        }, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
    };

    await uploadToCOS();
    const fileUrl = `https://${BUCKET}.cos.${REGION}.myqcloud.com/${key}`;
    return Response.json({ success: true, url: fileUrl });

  } catch (err) {
    console.error("文件上传失败：", err);
    return Response.json({
      success: false,
      message: err.message || "上传异常",
      code: err.code
    }, { status: 500 });
  }
}