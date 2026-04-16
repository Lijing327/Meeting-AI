import { listMeetings } from '../../utils/meeting-server-store'

export default defineEventHandler(() => {
  return listMeetings()
})
