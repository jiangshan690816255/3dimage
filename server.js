require('dotenv').config();

const express = require('express');
const path = require('path');
const apiRouter = require('./api-routes');

const app = express();
const PORT = process.env.PORT || 1024;

// 解析 JSON body（限制增大以支持 base64 文件传输）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 托管静态文件
app.use(express.static(__dirname));

// API 路由
app.use('/api', apiRouter);

// SPA 回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
});
