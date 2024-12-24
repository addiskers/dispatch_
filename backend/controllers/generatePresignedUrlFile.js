// controllers/generatePresignedUrlFile.js
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");

async function generatePresignedUrl(fileKey) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
  });
  // 1 hour = 3600 seconds
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

module.exports = { generatePresignedUrl };
