import { createContext, useContext, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

/**
 * Who is signed in. The truth lives on the server (the httpOnly cookie);
 * this context just asks the server "who am I?" and shares the answer.
 */
const AuthContext = createContext(null)

async function fetchMe() {
  try {
    return (await api('/auth/me')).user
  } catch (err) {
    if (err.status === 401) return null // not signed in is a normal state, not an error
    throw err
  }
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: 5 * 60_000 })

  const login = useMutation({
    mutationFn: (credentials) => api('/auth/login', { method: 'POST', body: credentials }),
    onSuccess: ({ user }) => {
      queryClient.clear() // never show the previous user's cached data
      queryClient.setQueryData(['me'], user)
    },
  })

  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(['me'], null)
    },
  })

  const value = useMemo(() => ({
    user: me.data ?? null,
    loading: me.isPending,
    login,
    logout,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  }), [me.data, me.isPending, login, logout, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
