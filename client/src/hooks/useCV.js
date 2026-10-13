import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export const useCV = () => useQuery({ queryKey: ['cv'], queryFn: async () => (await api('/cv')).cv })
