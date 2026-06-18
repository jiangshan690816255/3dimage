// node-functions/api/get-menu.js
import COS from "cos-nodejs-sdk-v5";

export async function onRequest(context) {
  const { env, request } = context;

  // 1. 从EdgeOne环境变量读取COS配置（后台Pages配置好4个变量）
  const SecretId = env.COS_SECRET_ID;
  const SecretKey = env.COS_SECRET_KEY;
  const BUCKET = env.COS_BUCKET;
  const REGION = env.COS_REGION;

  // 校验COS配置完整性
  if (!SecretId || !SecretKey || !BUCKET || !REGION) {
    return Response.json(
      { success: false, message: "COS环境变量配置不全" },
      { status: 500 }
    );
  }

  // 初始化COS实例
  const cos = new COS({ SecretId, SecretKey });
  const cosBase = `https://${BUCKET}.cos.${REGION}.myqcloud.com/`;

  try {
    // 2. 封装原 getFileFromCOS 逻辑，拉取根目录 menu.json
    const getFileFromCOS = (key) => {
      return new Promise((resolve, reject) => {
        cos.getObject(
          { Bucket: BUCKET, Region: REGION, Key: key },
          (err, data) => {
            if (err) return reject(err);
            resolve(data);
          }
        );
      });
    };

    // 读取COS里的menu.json
    const fileData = await getFileFromCOS("menu.json");
    const menuRaw = JSON.parse(fileData.Body.toString("utf-8"));

    // 3. 复用你原来的路径转换函数，补全COS地址
    const convertPath = (val) => {
      if (!val) return val;
      if (val.startsWith("http://") || val.startsWith("https://")) return val;
      return cosBase + val;
    };

    // 循环替换图片/模型/视频/答案路径
    menuRaw.firstMenu.forEach((unit) => {
      unit.secondMenu.forEach((item) => {
        item.image = convertPath(item.image);
        item.model = convertPath(item.model);
        item.video = convertPath(item.video);
        item.answer = convertPath(item.answer);
      });
    });

    // 4. 返回处理完成的菜单JSON（和本地Express接口返回结构完全一致）
    return Response.json(menuRaw);

  } catch (err) {
    // COS读取失败统一捕获报错
    return Response.json(
      {
        success: false,
        message: err.message || "读取菜单失败",
        code: err.code || "UNKNOWN"
      },
      { status: 500 }
    );
  }
}