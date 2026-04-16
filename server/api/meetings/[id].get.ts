import { getMeeting } from '../../utils/meeting-server-store'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }
  const hit = getMeeting(id)
  if (!hit) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  return hit
})
