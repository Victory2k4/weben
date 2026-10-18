import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../api/client'
import AdminLayout from '../../components/AdminLayout'

// ─── Role Badge ────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-amber-500/15 text-amber-400 border-amber-500/25 shadow-amber-500/10',
    user: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25 shadow-indigo-500/10',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border shadow-sm ${styles[role] || styles.user}`}>
      {role === 'admin' && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1l2.928 6.856L20 8.92l-5.072 4.572L16.18 20 10 16.428 3.82 20l1.252-6.508L0 8.92l7.072-1.064L10 1z" clipRule="evenodd" />
        </svg>
      )}
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  )
}

// ─── User Detail Modal ────────────────────────
function UserDetailModal({ userId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    api.get(`/admin/users/${userId}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Không thể tải chi tiết user'))
      .finally(() => setLoading(false))
  }, [userId])

  if (!userId) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-indigo-500/25">
                    {data.user.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{data.user.full_name}</h3>
                    <p className="text-sm text-white/40 truncate">{data.user.email}</p>
                    <div className="mt-1.5">
                      <RoleBadge role={data.user.role} />
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="p-6 grid grid-cols-2 gap-3">
                <StatCard label="Streak" value={`${data.user.streak || 0} ngày`} icon="🔥" color="from-orange-500/20 to-red-500/20" />
                <StatCard label="Tham gia" value={new Date(data.user.created_at).toLocaleDateString('vi-VN')} icon="📅" color="from-blue-500/20 to-cyan-500/20" />
                <StatCard label="Decks" value={data.decks?.length || 0} icon="📚" color="from-indigo-500/20 to-purple-500/20" />
                <StatCard
                  label="Tổng cards"
                  value={data.decks?.reduce((sum, d) => sum + (d.card_count || 0), 0) || 0}
                  icon="🃏"
                  color="from-emerald-500/20 to-teal-500/20"
                />
              </div>

              {/* Study stats */}
              <div className="px-6 pb-4">
                <h4 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Học tập</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <p className="text-xs text-white/40">Phiên học</p>
                    <p className="text-lg font-bold text-white mt-0.5">{data.studyStats?.total_sessions || 0}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <p className="text-xs text-white/40">Đã thành thạo</p>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">{data.studyStats?.total_cards_mastered || 0}</p>
                  </div>
                </div>
              </div>

              {/* Quiz stats */}
              <div className="px-6 pb-4">
                <h4 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Quiz</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <p className="text-xs text-white/40">Bài quiz</p>
                    <p className="text-lg font-bold text-white mt-0.5">{data.quizStats?.total_quizzes || 0}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <p className="text-xs text-white/40">Đúng</p>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">{data.quizStats?.total_correct || 0}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <p className="text-xs text-white/40">Tỷ lệ</p>
                    <p className="text-lg font-bold text-indigo-400 mt-0.5">
                      {data.quizStats?.total_questions
                        ? Math.round((data.quizStats.total_correct / data.quizStats.total_questions) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Decks list */}
              {data.decks?.length > 0 && (
                <div className="px-6 pb-6">
                  <h4 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Decks ({data.decks.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.decks.map(deck => (
                      <div key={deck.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: deck.color || '#6366f1' }} />
                        <span className="text-sm text-white/80 truncate flex-1">{deck.title}</span>
                        <span className="text-xs text-white/30 shrink-0">{deck.card_count} cards</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-white/40">Không tìm thấy dữ liệu</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-3 border border-white/[0.05]`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-xs text-white/40">{label}</p>
          <p className="text-sm font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Edit User Modal ──────────────────────────
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'user',
    password: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      await api.put(`/admin/users/${user.id}`, payload)
      toast.success('Đã cập nhật thành công!')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Chỉnh sửa tài khoản</h3>
            <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Họ tên</label>
              <input
                className="input-field"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Mật khẩu mới <span className="text-white/30">(để trống nếu không đổi)</span></label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="p-6 pt-0 flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary px-4 py-2">Hủy</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2">
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Confirm Delete Modal ─────────────────────
function ConfirmDeleteModal({ user, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/admin/users/${user.id}`)
      toast.success(`Đã xóa tài khoản ${user.full_name}`)
      onConfirm()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi xóa tài khoản')
    } finally {
      setDeleting(false)
    }
  }

  if (!user) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Xóa tài khoản?</h3>
            <p className="text-sm text-white/50 mb-1">
              Bạn có chắc muốn xóa tài khoản:
            </p>
            <p className="text-sm font-semibold text-white mb-1">{user.full_name}</p>
            <p className="text-xs text-white/30 mb-4">{user.email}</p>
            <p className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
              ⚠️ Hành động này không thể hoàn tác. Tất cả decks, cards và dữ liệu học tập sẽ bị xóa vĩnh viễn.
            </p>
          </div>
          <div className="p-6 pt-0 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Hủy</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────
export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)

  // Modals
  const [detailUserId, setDetailUserId] = useState(null)
  const [editUser, setEditUser] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: 10, search, role: roleFilter, sortBy, sortOrder }
      })
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      toast.error('Không thể tải danh sách users')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, sortBy, sortOrder])

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300) // debounce search
    return () => clearTimeout(timer)
  }, [fetchUsers])

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortOrder('desc')
    }
  }

  const handleRoleChange = async (user, newRole) => {
    try {
      await api.put(`/admin/users/${user.id}/role`, { role: newRole })
      toast.success(`Đã đổi role ${user.full_name} → ${newRole}`)
      fetchUsers(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi đổi role')
    }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-white/10 ml-1">↕</span>
    return <span className="text-indigo-400 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý tài khoản</h1>
          <p className="text-sm text-white/40 mt-1">
            Tổng cộng {pagination.total} tài khoản
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo email hoặc tên..."
            className="input-field pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Role filter */}
        <select
          className="input-field w-full sm:w-40"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">Tất cả roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="card-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
                <th
                  className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors hidden md:table-cell"
                  onClick={() => handleSort('email')}
                >
                  Email <SortIcon col="email" />
                </th>
                <th
                  className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  Role <SortIcon col="role" />
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider hidden lg:table-cell">
                  Decks / Cards
                </th>
                <th
                  className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors hidden sm:table-cell"
                  onClick={() => handleSort('streak')}
                >
                  Streak <SortIcon col="streak" />
                </th>
                <th
                  className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors hidden lg:table-cell"
                  onClick={() => handleSort('created_at')}
                >
                  Ngày tạo <SortIcon col="created_at" />
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider text-right">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="px-4 py-4" colSpan={7}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-white/5 rounded animate-pulse w-32" />
                          <div className="h-2 bg-white/5 rounded animate-pulse w-48" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/30">
                    <svg className="w-12 h-12 mx-auto mb-3 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    Không tìm thấy tài khoản nào
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* User avatar + name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-500/20 shrink-0">
                          {u.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate max-w-[160px]">{u.full_name}</p>
                          <p className="text-xs text-white/30 truncate max-w-[160px] md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-white/60 truncate block max-w-[200px]">{u.email}</span>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value)}
                        className="bg-transparent text-xs border-0 p-0 focus:ring-0 cursor-pointer appearance-none"
                        style={{ color: 'transparent', width: 0, height: 0, position: 'absolute' }}
                      />
                      <RoleBadge role={u.role} />
                    </td>

                    {/* Decks / Cards */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-white/50">
                        <span className="text-white/70 font-medium">{u.deck_count}</span>
                        <span className="text-white/20 mx-1">/</span>
                        <span className="text-white/70 font-medium">{u.card_count}</span>
                      </span>
                    </td>

                    {/* Streak */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-white/60">
                        {u.streak || 0} <span className="text-xs">🔥</span>
                      </span>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-white/40">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* View detail */}
                        <button
                          onClick={() => setDetailUserId(u.id)}
                          className="p-2 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                          title="Xem chi tiết"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => setEditUser(u)}
                          className="p-2 rounded-lg text-white/25 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <p className="text-xs text-white/30">
              Hiển thị {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchUsers(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      pageNum === pagination.page
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {detailUserId && (
        <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => fetchUsers(pagination.page)}
        />
      )}
      {deleteUser && (
        <ConfirmDeleteModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={() => fetchUsers(pagination.page)}
        />
      )}
    </AdminLayout>
  )
}
