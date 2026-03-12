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

    // Supabase URLs — return as-is, already public
    if (url.includes('supabase.co/storage')) {
      return ok({ signedUrl: url })
    }

    // Raw/PDF Cloudinary URLs — return as-is (public bucket)
    if (url.includes('/raw/upload/')) {
      return ok({ signedUrl: url })
    }

    // Image URLs — generate signed URL
    const imageMatch = url.match(/\/image\/upload\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/)
    if (!imageMatch) {
      return error('Could not parse Cloudinary URL')
    }

    const publicId = imageMatch[1]

    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'image',
      type: 'upload',
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    })

    return ok({ signedUrl })
  } catch (err: any) {
    console.error('Signed URL error:', err)
    return error(err.message || 'Failed to generate signed URL')
  }
}
