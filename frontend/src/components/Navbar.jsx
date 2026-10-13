import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

export default function Navbar() {
  const { user, logout } = useStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav className="border-b border-white/5 sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-white group">
          <img
            src="/panda.png"
            alt="Panda"
            className="w-8 h-8 rounded-full object-cover border border-indigo-400/30 group-hover:scale-110 transition-transform shadow-md shadow-indigo-500/20"
          />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-lg font-bold">
            FlashCard
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">{user.full_name}</p>
              <p className="text-xs text-white/40 mt-0.5">{user.streak || 0} ngày 🔥</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
              {user.full_name?.[0]?.toUpperCase()}
            </div>
            <button onClick={handleLogout}
              className="text-white/30 hover:text-white/70 transition-colors p-1.5 hover:bg-white/5 rounded-lg text-sm">
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
