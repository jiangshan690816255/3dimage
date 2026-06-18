require('dotenv').config();

const express = require('express');
const path = require('path');
const { router: apiRouter } = require('./node-functions/api/cosRouter');

const app = express();
const PORT = process.env.PORT || 1024;

// 解析 JSON body
app.use(express.json());

// 托管静态文件（html/css/js/img/models/libs 等由 EdgeOne CDN 或本地静态服务器提供）
app.use(express.static(__dirname));

// API 路由（与 EdgeOne node-functions/api/ 路径对应）
app.use('/api', apiRouter);

// 所有路由回退到 index.html（SPA 支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
});
