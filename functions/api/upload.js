const { uploadToCOS } = require('../_shared');

exports.main = async (event) => {
  try {
    // 解析 JSON body（支持 base64 编码的文件数据）
    let bodyStr = event.body || '{}';
    if (event.isBase64Encoded) {
      bodyStr = Buffer.from(bodyStr, 'base64').toString('utf-8');
    }
    const { file, fileName, contentType, key } = JSON.parse(bodyStr);

    if (!file) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: '未收到文件' }),
      };
    }

    const ext = (fileName || 'file.bin').split('.').pop();
    const cosKey = key || `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(file, 'base64');
    const url = await uploadToCOS(buffer, cosKey, contentType || 'application/octet-stream');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
