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
            {/* Admin panel link */}
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-amber-500/10 text-amber-400 border border-amber-500/20
                  hover:bg-amber-500/20 hover:border-amber-500/30 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Admin
              </Link>
            )}

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
