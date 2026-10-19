import fs from 'fs'

// AWS SDK v3 — only imported/used when credentials actually exist, so this
// file works fine even before `npm install @aws-sdk/client-s3`.
let S3Client, PutObjectCommand

const isS3Configured = () =>
    Boolean(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_REGION &&
        process.env.AWS_S3_BUCKET
    )

let s3Client = null
const getClient = async () => {
    if (s3Client) return s3Client
    const mod = await import('@aws-sdk/client-s3')
    S3Client = mod.S3Client
    PutObjectCommand = mod.PutObjectCommand
    s3Client = new S3Client({ region: process.env.AWS_REGION })
    return s3Client
}

/**
 * Uploads a locally-saved file (from multer diskStorage) to S3 if configured.
 * Returns null if AWS isn't set up yet — caller should keep the local copy
 * as the fallback in that case. Never throws for "not configured"; only
 * throws on a genuine upload failure once AWS IS configured.
 *
 * @param {Express.Multer.File} file
 * @returns {Promise<{ s3Key: string, s3Url: string } | null>}
 */
export const uploadFileToS3 = async (file) => {
    if (!isS3Configured()) {
        // AWS not set up yet — caller keeps using the local disk copy.
        return null
    }

    const client = await getClient()
    const bucket = process.env.AWS_S3_BUCKET
    const key = `verification-docs/${Date.now()}-${file.filename}`

    const fileBuffer = fs.readFileSync(file.path)

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: file.mimetype,
        })
    )

    // Delete the local temp copy now that it's safely in S3
    fs.unlink(file.path, () => {})

    const region = process.env.AWS_REGION
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

    return { s3Key: key, s3Url }
}

export { isS3Configured }