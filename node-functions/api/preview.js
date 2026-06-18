// 委托到 index.js 的统一 handler
const { main } = require('./index');
exports.main = main;
exports.handler = main;
