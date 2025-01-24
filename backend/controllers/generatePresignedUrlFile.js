// controllers/generatePresignedUrlFile.js
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");

async function generatePresignedUrl(fileKey) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
  });
  return getSignedUrl(s3, command, { expiresIn: 518400 });
}

module.exports = { generatePresignedUrl };
