import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { verifyToken } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  investorId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `club10-kyc/${investorId}`,
        public_id: fileName,
        resource_type: 'auto',
        access_mode: 'authenticated',
      },
      (error, result) => {
        if (error) return reject(error)
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

    const fileFields = ['idFront', 'idBack', 'passportPhoto', 'proofOfAddress']
    const results: Record<string, string> = {}

    for (const field of fileFields) {
      const file = formData.get(field) as File | null
      if (!file) continue

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = field

      const url = await uploadToCloudinary(buffer, fileName, investorId)
      results[field] = url
    }

    return ok({ urls: results })
  } catch (err: any) {
    console.error('Cloudinary upload error:', err)
    return error(err.message || 'Upload failed')
  }
}

