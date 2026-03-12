// src/app/api/kyc/upload/route.ts
import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { verifyToken } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_PROOF_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  investorId: string,
  isPdf: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    // For PDFs: append .pdf to public_id so Cloudinary stores/serves it with extension
    const publicId = isPdf ? `${fileName}.pdf` : fileName

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `club10-kyc/${investorId}`,
        public_id: publicId,
        resource_type: isPdf ? 'raw' : 'image',
        overwrite: true,
        ...(isPdf ? {} : { format: 'jpg', quality: 'auto' }),
      },
      (err, result) => {
        if (err) return reject(err)
        resolve(result!.secure_url)
      }
    )
    uploadStream.end(buffer)
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!auth) return unauthorized()
    const payload = verifyToken(auth) as any
    if (!payload) return unauthorized()

    const formData = await req.formData()
    const investorId = payload.memberId

    const IMAGE_ONLY_FIELDS = ['idFront', 'idBack', 'passportPhoto']
    const PROOF_FIELD = 'proofOfAddress'
    const allFields = [...IMAGE_ONLY_FIELDS, PROOF_FIELD]

    const results: Record<string, string> = {}

    for (const field of allFields) {
      const file = formData.get(field) as File | null
      if (!file) continue

      if (file.size > MAX_FILE_SIZE) {
        return error(`${field} exceeds 5MB limit`)
      }

      const mimeType = file.type

      if (field === PROOF_FIELD) {
        if (!ALLOWED_PROOF_TYPES.includes(mimeType)) {
          return error('Proof of address must be an image (JPG, PNG, WEBP) or PDF')
        }
      } else {
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
          return error(`${field} must be an image (JPG, PNG, WEBP) — PDFs not accepted here`)
        }
      }

      const isPdf = mimeType === 'application/pdf'
      const buffer = Buffer.from(await file.arrayBuffer())
      const url = await uploadToCloudinary(buffer, field, investorId, isPdf)
      results[field] = url
    }

    return ok({ urls: results })
  } catch (err: any) {
    console.error('Cloudinary upload error:', err)
    return error(err.message || 'Upload failed')
  }
}

