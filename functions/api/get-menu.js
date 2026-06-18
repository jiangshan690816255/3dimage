const { BUCKET, REGION, getFileFromCOS } = require('../_shared');

exports.main = async (event) => {
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(menu),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode === 404 ? 404 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
