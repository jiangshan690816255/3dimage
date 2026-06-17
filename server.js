require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1024;

// 解析 JSON body
app.use(express.json());

// 托管静态文件
app.use(express.static(__dirname));

// 上传文件路由
app.use(require('./upload'));

// 所有路由回退到 index.html（SPA 支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
});
