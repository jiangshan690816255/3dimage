const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
});

const BUCKET = process.env.COS_BUCKET || '';
const REGION = process.env.COS_REGION || '';

function uploadToCOS(fileBuffer, key, contentType) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET, Region: REGION, Key: key,
      Body: fileBuffer, ContentType: contentType || undefined,
    }, (err, data) => {
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

module.exports = { BUCKET, REGION, uploadToCOS, getFileFromCOS };
