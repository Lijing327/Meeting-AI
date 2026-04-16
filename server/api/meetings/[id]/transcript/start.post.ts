import { runTranscriptJob } from '../../../../utils/meeting-server-store'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }
  return runTranscriptJob(id)
})
