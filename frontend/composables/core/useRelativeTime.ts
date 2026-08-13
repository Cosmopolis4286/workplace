import { useDateFormat } from './useDateFormat'

export function useRelativeTime() {
  const { timeAgo } = useDateFormat()
  return { timeAgo }
}
