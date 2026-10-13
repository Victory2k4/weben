import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useStore from './store/useStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DeckDetail from './pages/DeckDetail'
import Study from './pages/Study'
import Quiz from './pages/Quiz'
import AIChatMascot from './components/AIChatMascot'

function PrivateRoute({ children }) {
  const token = useStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token, fetchMe } = useStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e1e2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/deck/:id" element={<PrivateRoute><DeckDetail /></PrivateRoute>} />
        <Route path="/study/:id" element={<PrivateRoute><Study /></PrivateRoute>} />
        <Route path="/quiz/:id" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIChatMascot />
    </>
  )
}
