import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export const useCompanies = (options = {}) => useQuery({ queryKey: ['companies'], queryFn: async () => (await api('/companies')).companies, ...options })
