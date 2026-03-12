// src/app/api/kyc/signed-url/route.ts
import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return unauthorized()
    if (!requireAdmin(auth)) return forbidden()

    const { url } = await req.json()
    if (!url || typeof url !== 'string') return error('Missing url')

    // Extract public_id and resource_type from the Cloudinary URL
    // e.g. https://res.cloudinary.com/CLOUD/raw/upload/s--SIG--/v123/club10-kyc/ID/proofOfAddress.pdf
    //   or https://res.cloudinary.com/CLOUD/image/upload/s--SIG--/v123/club10-kyc/ID/idFront.jpg
    const rawMatch = url.match(/\/raw\/upload\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/)
    const imageMatch = url.match(/\/image\/upload\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/)

    let publicId: string
    let resourceType: 'raw' | 'image'

    if (rawMatch) {
      publicId = rawMatch[1]
      resourceType = 'raw'
    } else if (imageMatch) {
      // Strip file extension for image public_id
      publicId = imageMatch[1].replace(/\.[^.]+$/, '')
      resourceType = 'image'
    } else {
      return error('Could not parse Cloudinary URL')
    }

    // Generate a signed URL valid for 60 minutes
    const signedUrl = cloudinary.utils.private_download_url(publicId, '', {
      resource_type: resourceType,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      attachment: false, // inline view, not download
    })

    return ok({ signedUrl })
  } catch (err: any) {
    console.error('Signed URL error:', err)
    return error(err.message || 'Failed to generate signed URL')
  }
}