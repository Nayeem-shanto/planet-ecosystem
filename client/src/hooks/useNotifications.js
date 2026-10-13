import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useNotifications() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api('/notifications'),
    refetchInterval: 60_000, // check for new notifications every minute
  })
  const markRead = useMutation({
    mutationFn: (id) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  return { ...query, markRead, markAll }
}
