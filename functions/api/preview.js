const { getFileFromCOS } = require('../_shared');

exports.main = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const key = params.key;
    if (!key) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: '缺少 key 参数' }),
      };
    }
    const data = await getFileFromCOS(key);
    const contentType = (data.headers && data.headers['content-type']) || 'application/octet-stream';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
      body: data.Body.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
