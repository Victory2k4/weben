import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../api/client'
import AdminLayout from '../../components/AdminLayout'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => toast.error('Không thể tải thống kê'))
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    {
      label: 'Tổng tài khoản',
      value: stats.totalUsers,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-purple-600',
      bgGlow: 'bg-indigo-500/10',
      link: '/admin/users',
    },
    {
      label: 'Tổng Decks',
      value: stats.totalDecks,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      label: 'Tổng Cards',
      value: stats.totalCards,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-600',
      bgGlow: 'bg-amber-500/10',
    },
    {
      label: 'Phiên học tập',
      value: stats.totalSessions,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
        </svg>
      ),
      gradient: 'from-rose-500 to-pink-600',
      bgGlow: 'bg-rose-500/10',
    },
  ] : []

  // Simple bar chart for recent users
  const maxRecentCount = stats?.recentUsers?.length
    ? Math.max(...stats.recentUsers.map(r => r.count), 1)
    : 1

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Tổng quan hệ thống FlashCard</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-glass p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-white/5 rounded w-20" />
                  <div className="h-6 bg-white/5 rounded w-16" />
                </div>
              </div>
            </div>
          ))
        ) : (
          statCards.map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              {card.link ? (
                <Link to={card.link} className="block">
                  <StatCardInner card={card} />
                </Link>
              ) : (
                <StatCardInner card={card} />
              )}
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent users chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card-glass p-5"
        >
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
            Users mới (7 ngày)
          </h3>
          {loading ? (
            <div className="h-40 flex items-end gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-lg animate-pulse" style={{ height: `${Math.random() * 80 + 20}%` }} />
              ))}
            </div>
          ) : stats?.recentUsers?.length > 0 ? (
            <div className="h-40 flex items-end gap-2">
              {stats.recentUsers.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-white/40 font-medium">{r.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(r.count / maxRecentCount) * 100}%` }}
                    transition={{ delay: 0.4 + i * 0.05, type: 'spring', damping: 15 }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg min-h-[4px]"
                  />
                  <span className="text-[10px] text-white/30">
                    {new Date(r.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">
              Chưa có dữ liệu
            </div>
          )}
        </motion.div>

        {/* Role distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-glass p-5"
        >
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
            Phân bổ Role
          </h3>
          {loading ? (
            <div className="space-y-4 mt-6">
              <div className="h-4 bg-white/5 rounded animate-pulse" />
              <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
            </div>
          ) : stats?.roleDistribution?.length > 0 ? (
            <div className="space-y-4 mt-2">
              {stats.roleDistribution.map(r => {
                const pct = stats.totalUsers ? Math.round((r.count / stats.totalUsers) * 100) : 0
                const isAdmin = r.role === 'admin'
                return (
                  <div key={r.role}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${
                          isAdmin
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                            : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                        }`}>
                          {isAdmin ? '⭐ Admin' : '👤 User'}
                        </span>
                      </div>
                      <span className="text-sm text-white/50">
                        <span className="text-white font-semibold">{r.count}</span>
                        <span className="text-white/30 ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isAdmin
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">
              Chưa có dữ liệu
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 card-glass p-5"
      >
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          Truy cập nhanh
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/25 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Quản lý tài khoản</p>
              <p className="text-xs text-white/30">Xem, sửa, xóa tài khoản người dùng</p>
            </div>
            <svg className="w-4 h-4 text-white/20 ml-auto group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Trang chính</p>
              <p className="text-xs text-white/30">Quay về giao diện học tập</p>
            </div>
            <svg className="w-4 h-4 text-white/20 ml-auto group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </motion.div>
    </AdminLayout>
  )
}

function StatCardInner({ card }) {
  return (
    <div className={`card-glass p-5 hover:bg-white/[0.06] transition-all group relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 ${card.bgGlow} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg`}>
          {card.icon}
        </div>
        <div>
          <p className="text-xs text-white/40 font-medium">{card.label}</p>
          <p className="text-2xl font-bold text-white mt-0.5">{card.value?.toLocaleString?.() ?? card.value}</p>
        </div>
      </div>
    </div>
  )
}
