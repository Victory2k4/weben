import { create } from 'zustand'
import api from '../api/client'

const useStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  decks: [],
  stats: null,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user })
    return data
  },

  register: async (email, password, full_name) => {
    const { data } = await api.post('/auth/register', { email, password, full_name })
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user })
    return data
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, decks: [] })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data })
    } catch { get().logout() }
  },

  fetchDecks: async () => {
    const { data } = await api.get('/decks')
    set({ decks: data })
    return data
  },

  createDeck: async (payload) => {
    const { data } = await api.post('/decks', payload)
    set(s => ({ decks: [data, ...s.decks] }))
    return data
  },

  deleteDeck: async (id) => {
    await api.delete(`/decks/${id}`)
    set(s => ({ decks: s.decks.filter(d => d.id !== id) }))
  },

  fetchStats: async () => {
    const { data } = await api.get('/progress/stats')
    set({ stats: data })
    return data
  },

  submitReview: async (card_id, rating) => {
    const { data } = await api.post('/progress/review', { card_id, rating })
    return data
  },

  saveSession: async (payload) => {
    const { data } = await api.post('/progress/session', payload)
    return data
  },

  // ── Admin helpers ──
  isAdmin: () => get().user?.role === 'admin',
}))

export default useStore
