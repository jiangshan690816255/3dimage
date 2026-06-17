const express = require('express');
const multer = require('multer');
const COS = require('cos-nodejs-sdk-v5');

// 腾讯云 COS 配置（建议通过环境变量设置）
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
  console.warn('⚠️  COS 配置不完整，请检查 .env 文件中的 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION');
}

// POST /upload - 上传文件
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未收到文件' });
    }
    if (!BUCKET || !REGION || !process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'COS 配置不完整，请检查 .env 文件' });
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
 * @param {string} key - COS 对象键
 * @returns {Promise<{Body: Buffer, headers: object}>}
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
    if (!BUCKET || !REGION || !process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'COS 配置不完整，请检查 .env 文件' });
    }
    console.log('🔍 预览请求 key:', key, 'Bucket:', BUCKET, 'Region:', REGION);
    const data = await getFileFromCOS(key);
    const contentType = data.headers && data.headers['content-type'];
    if (contentType) res.set('Content-Type', contentType);
    res.send(data.Body);
  } catch (err) {
    console.error('COS 预览失败:', err.code || err.message, err);
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

module.exports = router;