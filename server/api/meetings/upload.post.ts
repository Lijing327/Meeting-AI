import { createUploadRecord } from '../../utils/meeting-server-store'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart form-data' })
  }

  let fileName = 'recording.webm'
  let title = ''

  for (const part of form) {
    if (part.name === 'file' && part.filename) {
      fileName = part.filename
    }
    if (part.name === 'name' && part.data) {
      title = part.data.toString('utf-8')
    }
  }

  if (!title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing name' })
  }

  return createUploadRecord(title, fileName)
})
