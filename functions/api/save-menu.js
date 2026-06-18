const { uploadToCOS } = require('../_shared');

exports.main = async (event) => {
  try {
    let bodyStr = event.body || '{}';
    if (event.isBase64Encoded) {
      bodyStr = Buffer.from(bodyStr, 'base64').toString('utf-8');
    }
    const menuData = JSON.parse(bodyStr);

    const jsonStr = JSON.stringify(menuData, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    const url = await uploadToCOS(buffer, 'menu.json', 'application/json');

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
