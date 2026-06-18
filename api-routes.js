require('dotenv').config();

const express = require('express');
const router = express.Router();
const COS = require('cos-nodejs-sdk-v5');
const multer = require('multer');

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
});

const BUCKET = process.env.COS_BUCKET || '';
const REGION = process.env.COS_REGION || '';

// 支持 multipart 和 base64 JSON 两种上传方式
const upload = multer({ storage: multer.memoryStorage() });

function uploadToCOS(fileBuffer, key, contentType) {
  return new Promise((resolve, reject) => {
    const params = { Bucket: BUCKET, Region: REGION, Key: key, Body: fileBuffer };
    if (contentType) params.ContentType = contentType;
    cos.putObject(params, (err, data) => {
      if (err) return reject(err);
      resolve(`https://${BUCKET}.cos.${REGION}.myqcloud.com/${key}`);
    });
  });
}

function getFileFromCOS(key) {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

// POST /api/upload - 支持 multipart form 和 base64 JSON
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // 方式1：multipart form data（兼容旧版前端）
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const key = req.body.key || `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const url = await uploadToCOS(req.file.buffer, key, req.file.mimetype);
      return res.json({ success: true, url });
    }

    // 方式2：base64 JSON（与 serverless 函数统一）
    const { file, fileName, contentType, key } = req.body;
    if (file) {
      const ext = (fileName || 'file.bin').split('.').pop();
      const cosKey = key || `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(file, 'base64');
      const url = await uploadToCOS(buffer, cosKey, contentType || 'application/octet-stream');
      return res.json({ success: true, url });
    }

    res.status(400).json({ success: false, message: '未收到文件' });
  } catch (err) {
    console.error('上传失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/preview
router.get('/preview', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ success: false, message: '缺少 key 参数' });
    const data = await getFileFromCOS(key);
    const contentType = (data.headers && data.headers['content-type']);
    if (contentType) res.set('Content-Type', contentType);
    res.send(data.Body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/save-menu
router.post('/save-menu', async (req, res) => {
  try {
    const jsonStr = JSON.stringify(req.body, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    const url = await uploadToCOS(buffer, 'menu.json', 'application/json');
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/get-menu
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
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
