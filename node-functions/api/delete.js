// node-functions/api/delete.js
import COS from "cos-nodejs-sdk-v5";

export async function onRequest(context) {
  const { env, request } = context;

  // 仅允许GET/POST方式传key删除
  const method = request.method;
  let targetKey = "";

  // 1. 解析请求里的文件key参数
  if (method === "GET") {
    const urlObj = new URL(request.url);
    targetKey = urlObj.searchParams.get("key");
  } else if (method === "POST") {
    const body = await request.json();
    targetKey = body.key;
  } else {
    return Response.json(
      { success: false, message: "仅支持GET/POST请求" },
      { status: 405 }
    );
  }

  // 校验key必填
  if (!targetKey) {
    return Response.json(
      { success: false, message: "缺少参数key（待删除文件路径）" },
      { status: 400 }
    );
  }

  // 2. 读取COS环境变量
  const SecretId = env.COS_SECRET_ID;
  const SecretKey = env.COS_SECRET_KEY;
  const BUCKET = env.COS_BUCKET;
  const REGION = env.COS_REGION;

  if (!SecretId || !SecretKey || !BUCKET || !REGION) {
    return Response.json(
      { success: false, message: "COS环境变量配置不完整" },
      { status: 500 }
    );
  }

  try {
    // 3. 初始化COS实例，封装删除Promise
    const cos = new COS({ SecretId, SecretKey });
    const deleteFile = () => {
      return new Promise((resolve, reject) => {
        cos.deleteObject(
          {
            Bucket: BUCKET,
            Region: REGION,
            Key: targetKey
          },
          (err, data) => {
            if (err) return reject(err);
            resolve(data);
          }
        );
      });
    };

    // 执行删除
    await deleteFile();

    return Response.json({
      success: true,
      msg: `文件 ${targetKey} 删除成功`
    });

  } catch (err) {
    console.error("删除文件失败：", err);
    return Response.json(
      {
        success: false,
        message: err.message || "删除失败",
        code: err.code
      },
      { status: 500 }
    );
  }
}