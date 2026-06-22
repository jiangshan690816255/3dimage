// ====================== 本地 Express 路由（供 server.js 使用）======================
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const COS = require('cos-nodejs-sdk-v5');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// COS 配置
const cosConfig = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
};
const BUCKET = process.env.COS_BUCKET;
const REGION = process.env.COS_REGION;
const cos = new COS(cosConfig);
const cosBase = `https://${BUCKET}.cos.${REGION}.myqcloud.com/`;

// 转换相对路径为 COS 完整 URL
function convertPath(val) {
  if (!val) return val;
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  return cosBase + val;
}

// ==================== GET /get-menu ====================
router.get('/get-menu', async (req, res) => {
  try {
    const data = await new Promise((resolve, reject) => {
      cos.getObject({ Bucket: BUCKET, Region: REGION, Key: 'menu.json' }, (err, d) => {
        if (err) return reject(err);
        resolve(d);
      });
    });
    const menuRaw = JSON.parse(data.Body.toString('utf-8'));
    menuRaw.firstMenu.forEach(unit => {
      unit.secondMenu.forEach(item => {
        item.image = convertPath(item.image);
        item.model = convertPath(item.model);
        item.video = convertPath(item.video);
        item.answer = convertPath(item.answer);
      });
    });
    res.json(menuRaw);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== GET /preview ====================
router.get('/preview', async (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ success: false, message: '缺少key参数' });
  try {
    const data = await new Promise((resolve, reject) => {
      cos.getObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, d) => {
        if (err) return reject(err);
        resolve(d);
      });
    });
    const ct = data.headers?.['content-type'] || 'application/octet-stream';
    res.set('Content-Type', ct);
    res.send(data.Body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== POST /upload ====================
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '未上传文件' });
    const customKey = req.body.key;
    const ext = file.originalname.split('.').pop();
    const key = customKey || `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION, Key: key,
        Body: file.buffer, ContentType: file.mimetype,
      }, (err, d) => err ? reject(err) : resolve(d));
    });

    res.json({ success: true, url: `${cosBase}${key}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== POST /save-menu ====================
router.post('/save-menu', async (req, res) => {
  try {
    const jsonStr = JSON.stringify(req.body, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION, Key: 'menu.json',
        Body: buffer, ContentType: 'application/json',
      }, (err, d) => err ? reject(err) : resolve(d));
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== POST /verify-admin ====================
router.post('/verify-admin', (req, res) => {
  const { password } = req.body;
  const adminId = process.env.ADMIN_APP_ID;
  if (!adminId) {
    return res.status(500).json({ success: false, message: '服务端未配置 ADMIN_APP_ID' });
  }
  if (password === adminId) {
    return res.json({ success: true });
  }
  return res.status(403).json({ success: false, message: '密码错误，非法操作' });
});

// ==================== POST /delete ====================
router.post('/delete', async (req, res) => {
  const key = req.body.key;
  if (!key) return res.status(400).json({ success: false, message: '缺少参数key' });
  try {
    await new Promise((resolve, reject) => {
      cos.deleteObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, d) => {
        if (err) return reject(err);
        resolve(d);
      });
    });
    res.json({ success: true, msg: `文件 ${key} 删除成功` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

module.exports = { router };
