export default defineEventHandler(() => {
  return { id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }
})
