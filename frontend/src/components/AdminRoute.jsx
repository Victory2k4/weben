import React from 'react'
import { Navigate } from 'react-router-dom'
import useStore from '../store/useStore'

/**
 * Route guard cho admin pages.
 * - Nếu chưa đăng nhập → redirect /login
 * - Nếu không phải admin → redirect /
 */
export default function AdminRoute({ children }) {
  const { token, user } = useStore()

  if (!token) return <Navigate to="/login" replace />
  if (user && user.role !== 'admin') return <Navigate to="/" replace />

  // Nếu user chưa load xong (đang fetchMe), hiển thị loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    )
  }

  return children
}
