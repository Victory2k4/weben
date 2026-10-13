import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import useStore from '../store/useStore'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { register } = useStore()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Mật khẩu ít nhất 6 ký tự')
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name)
      toast.success('Tạo tài khoản thành công! 🎉')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-3 animate-float">
            <img
              src="/panda.png"
              alt="Panda Mascot"
              className="w-24 h-24 rounded-full object-cover shadow-2xl shadow-indigo-500/30 border-2 border-indigo-400/40 p-0.5 bg-indigo-950/50"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            FlashCard
          </h1>
          <p className="text-white/50 mt-1">Tạo tài khoản miễn phí</p>
        </div>

        <div className="card-glass p-8">
          <h2 className="text-xl font-semibold mb-6">Đăng ký</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Họ tên</label>
              <input type="text" required className="input-field" placeholder="Nguyễn Văn A"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input type="email" required className="input-field" placeholder="your@email.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Mật khẩu</label>
              <input type="password" required className="input-field" placeholder="Ít nhất 6 ký tự"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>
          <p className="text-center text-white/40 mt-6 text-sm">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Đăng nhập</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
