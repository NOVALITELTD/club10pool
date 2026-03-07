import { NextRequest } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { verifyToken } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function getOrCreateSubfolder(drive: any, investorId: string): Promise<string> {
  // Check if subfolder already exists
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name='${investorId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  })

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id
  }

  // Create subfolder
  const folder = await drive.files.create({
    requestBody: {
      name: investorId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    },
    fields: 'id',
  })

  return folder.data.id
}

async function uploadFileToDrive(
  drive: any,
  folderId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const stream = Readable.from(buffer)

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  // Make file publicly viewable (anyone with link)
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  // Return direct view link
  return `https://drive.google.com/file/d/${file.data.id}/view`
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!auth) return unauthorized()
    const payload = verifyToken(auth)
    if (!payload) return unauthorized()

    const formData = await req.formData()
    const investorId = payload.id

    const drive = getDriveClient()

    // Get or create investor subfolder
    const subFolderId = await getOrCreateSubfolder(drive, investorId)

    const results: Record<string, string> = {}

    const fileFields = ['idFront', 'idBack', 'passportPhoto', 'proofOfAddress']

    for (const field of fileFields) {
      const file = formData.get(field) as File | null
      if (!file) continue

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${field}.${ext}`

      const url = await uploadFileToDrive(drive, subFolderId, fileName, buffer, file.type)
      results[field] = url
    }

    return ok({ urls: results })
  } catch (err: any) {
    console.error('Drive upload error:', err)
    return error(err.message || 'Upload failed')
  }
}