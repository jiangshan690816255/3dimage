const express = require('express');
const multer = require('multer');
const COS = require('cos-nodejs-sdk-v5');

// 腾讯云 COS 配置（环境变量在EdgeOne项目设置里配置）
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
});

const BUCKET = process.env.COS_BUCKET || '';
const REGION = process.env.COS_REGION || '';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

/**
 * 上传文件到腾讯云 COS
 * @param {Buffer} fileBuffer - 文件内容 Buffer
 * @param {string} key - COS 对象键（路径）
 * @param {string} [contentType] - 文件 MIME 类型
 * @returns {Promise<{url: string, data: object}>}
 */
function uploadToCOS(fileBuffer, key, contentType) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: fileBuffer,
    };
    if (contentType) {
      params.ContentType = contentType;
    }
    cos.putObject(params, (err, data) => {
      if (err) return reject(err);
      const url = `https://${BUCKET}.cos.${REGION}.myqcloud.com/${key}`;
      resolve({ url, data });
    });
  });
}

// 启动时检查 COS 配置
if (!BUCKET || !REGION || !process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
  console.warn('⚠️  COS 配置不完整，请检查环境变量');
}

// POST /upload - 上传文件
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未收到文件' });
    }
    if (!BUCKET || !REGION || !process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'COS 配置不完整' });
    }
    const ext = req.file.originalname.split('.').pop();
    const key = req.body.key || `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const result = await uploadToCOS(req.file.buffer, key, req.file.mimetype);
    res.json({ success: true, url: result.url });
  } catch (err) {
    console.error('COS 上传失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 从 COS 获取文件（预览）
 */
function getFileFromCOS(key) {
  return new Promise((resolve, reject) => {
    cos.getObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
    }, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

// GET /preview?key=xxx - 文件预览
router.get('/preview', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ success: false, message: '缺少 key 参数' });
    }
    const data = await getFileFromCOS(key);
    const contentType = data.headers && data.headers['content-type'];
    if (contentType) res.set('Content-Type', contentType);
    res.send(data.Body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

// POST /save-menu - 保存 menu.json
router.post('/save-menu', async (req, res) => {
  try {
    const jsonStr = JSON.stringify(req.body, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    const result = await uploadToCOS(buffer, 'menu.json', 'application/json');
    res.json({ success: true, url: result.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

// GET /get-menu - 读取菜单并补全链接
router.get('/get-menu', async (req, res) => {
  try {
    const data = await getFileFromCOS('menu.json');
    const menu = JSON.parse(data.Body.toString('utf-8'));
    const cosBase = `https://${BUCKET}.cos.${REGION}.myqcloud.com/`;

    function convertPath(val) {
      if (!val) return val;
      if (val.startsWith('http://') || val.startsWith('https://')) return val;
      return cosBase + val;
    }

    menu.firstMenu.forEach(unit => {
      unit.secondMenu.forEach(item => {
        item.image = convertPath(item.image);
        item.model = convertPath(item.model);
        item.video = convertPath(item.video);
        item.answer = convertPath(item.answer);
      });
    });
    res.json(menu);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

// ====================== 导出供 server.js 和 EdgeOne Pages 使用 ======================

// 本地开发使用：server.js 通过 require 获取 router
exports.router = router;

// EdgeOne Pages 入口：express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);

/**
 * Node Functions 主入口
 * EdgeOne Pages 调用方式可能是：
 *   1. exports.main(req, res) — 标准 Node.js HTTP Request/Response
 *   2. exports.main(event, context) — 类 AWS Lambda 格式
 * 此处兼容多种签名
 */
async function handleRequest(req, res) {
  // 规范化 URL：如果 EdgeOne 没剥离 /api 前缀，手动剥离
  // 最终让 Express router 能匹配 /get-menu、/upload 等路由
  if (req.url && req.url.startsWith('/api')) {
    req.url = req.url.slice(4) || '/';
  }
  await app(req, res);
}

// 主导出（EdgeOne Pages Node Functions 识别 exports.main）
exports.main = async function (arg1, arg2) {
  let req, res;

  if (arg2 && typeof arg2.setHeader === 'function') {
    // 直接 (req, res) 签名
    req = arg1;
    res = arg2;
  } else if (arg1 && arg1.req && arg1.res) {
    // 包装在 { req, res } 对象中
    req = arg1.req;
    res = arg1.res;
  } else if (arg1 && arg1.request) {
    // EdgeOne / Cloudflare Workers 格式
    // 不适用，返回错误
    console.error('EdgeOne Workers 格式不支持，请使用 Node Functions');
    if (arg2) {
      arg2.statusCode = 500;
      arg2.end('Internal Error: Workers format not supported');
    }
    return;
  } else {
    console.error('未知的 handler 调用格式', typeof arg1, typeof arg2);
    return;
  }

  await handleRequest(req, res);
};

// 兼容旧出口名
exports.handler = exports.main;
