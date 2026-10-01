import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'

const STATUS_BADGE = {
  new:      { label: 'Mới', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  learning: { label: 'Đang học', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  mastered: { label: 'Đã thuộc', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
}

function CardRow({ card, onEdit, onDelete }) {
  const badge = STATUS_BADGE[card.status || 'new']
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="card-glass p-4 flex items-start gap-4 hover:bg-white/8 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white">{card.term}</span>
          {card.phonetic && <span className="text-white/40 text-sm">{card.phonetic}</span>}
          {card.part_of_speech && <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/50">{card.part_of_speech}</span>}
          <span className={`text-xs border px-2 py-0.5 rounded-full ml-auto ${badge.cls}`}>{badge.label}</span>
        </div>
        <p className="text-indigo-300 mt-1">{card.definition}</p>
        {card.example_sentence && <p className="text-white/40 text-sm mt-1 italic">"{card.example_sentence}"</p>}
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(card)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors">✏️</button>
        <button onClick={() => onDelete(card.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-400 transition-colors">🗑️</button>
      </div>
    </motion.div>
  )
}

const EMPTY_FORM = { term: '', phonetic: '', part_of_speech: '', definition: '', example_sentence: '' }

export default function DeckDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formMode, setFormMode] = useState('single')
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [phoneticStatus, setPhoneticStatus] = useState('idle') // idle | loading | found | notfound
  const phoneticDebounce = useRef(null)

  const load = async () => {
    const { data } = await api.get(`/decks/${id}`)
    setDeck(data)
  }
  useEffect(() => { load() }, [id])

  const openEdit = card => {
    setEditCard(card)
    setFormMode('single')
    setForm({ term: card.term, phonetic: card.phonetic, part_of_speech: card.part_of_speech, definition: card.definition, example_sentence: card.example_sentence })
    setPhoneticStatus('idle')
    setShowForm(true)
  }

  const fetchPhonetic = (word) => {
    if (phoneticDebounce.current) clearTimeout(phoneticDebounce.current)
    if (!word.trim() || word.trim().split(' ').length > 3) {
      setPhoneticStatus('idle')
      return
    }
    phoneticDebounce.current = setTimeout(async () => {
      setPhoneticStatus('loading')
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`)
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        const entry = data[0]
        const phonetics = entry?.phonetics || []

        // Ưu tiên: root phonetic → có cả text+audio → bất kỳ text nào
        const phonetic =
          entry?.phonetic ||
          phonetics.find(p => p.text && p.text.trim() && p.audio)?.text ||
          phonetics.find(p => p.text && p.text.trim())?.text ||
          ''

        if (phonetic) {
          setForm(prev => ({ ...prev, phonetic: phonetic.trim() }))
          setPhoneticStatus('found')
        } else {
          setPhoneticStatus('notfound')
        }
      } catch {
        setPhoneticStatus('notfound')
      }
    }, 600)
  }

  const closeForm = () => { setShowForm(false); setEditCard(null); setForm(EMPTY_FORM); setPhoneticStatus('idle'); setFormMode('single'); setRawText('') }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      if (formMode === 'paste') {
        if (!rawText.trim()) { setLoading(false); return toast.error('Nhập danh sách từ!') }
        const { data } = await api.post(`/decks/${id}/import`, { rawText })
        toast.success(`Đã thêm thành công ${data.count} từ! 🎉`)
      } else {
        if (!form.term || !form.definition) { setLoading(false); return toast.error('Nhập từ và nghĩa!') }
        if (editCard) {
          await api.put(`/cards/${editCard.id}`, form)
          toast.success('Cập nhật thành công!')
        } else {
          await api.post('/cards', { deck_id: Number(id), ...form })
          toast.success('Thêm từ thành công!')
        }
      }
      setLoading(false); closeForm(); load()
    } catch (err) { setLoading(false); toast.error(err.response?.data?.error || 'Có lỗi xảy ra!') }
  }

  const handleDelete = async cardId => {
    if (!confirm('Xóa từ này?')) return
    await api.delete(`/cards/${cardId}`)
    toast.success('Đã xóa'); load()
  }

  const f = s => Object.fromEntries(Object.entries(s).map(([k,v]) => [k, e => setForm(p => ({...p, [k]: e.target.value}))]))
  const fns = f(form)

  if (!deck) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white/40">Đang tải...</div></div>

  const filtered = (deck.cards || []).filter(c =>
    !search || c.term.toLowerCase().includes(search.toLowerCase()) || c.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: deck.color + '33', border: `1px solid ${deck.color}55` }}>
            📚
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{deck.title}</h1>
            {deck.description && <p className="text-white/40 mt-1">{deck.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-sm text-white/40">
              <span>{deck.cards?.length || 0} từ</span>
              <span>•</span>
              <span>{deck.cards?.filter(c => c.status === 'mastered').length || 0} đã thuộc</span>
            </div>
          </div>
          <button onClick={() => navigate(`/study/${id}`)}
            className="btn-primary flex items-center gap-2 shrink-0">
            ▶ Học ngay
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 mb-5">
          <input className="input-field flex-1" placeholder="🔍 Tìm từ..." value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={() => setShowForm(true)} className="btn-primary whitespace-nowrap">+ Thêm từ</button>
        </div>

        {/* Cards list */}
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.length === 0 && <div className="text-center py-12 text-white/30"><div className="text-4xl mb-2">📭</div><p>Chưa có từ nào. Thêm từ đầu tiên!</p></div>}
            {filtered.map(card => (
              <CardRow key={card.id} card={card} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closeForm}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold">{editCard ? 'Sửa từ' : 'Thêm từ mới'}</h3>
                <button onClick={closeForm} className="text-white/50 hover:text-white">✕</button>
              </div>

              {!editCard && (
                <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-lg">
                  <button type="button"
                    className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${formMode === 'single' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
                    onClick={() => setFormMode('single')}
                  >Một từ</button>
                  <button type="button"
                    className={`flex-1 py-1.5 text-sm rounded-md transition-colors flex items-center justify-center gap-1 ${formMode === 'paste' ? 'bg-blue-500 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
                    onClick={() => setFormMode('paste')}
                  >📋 Thêm nhiều từ</button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {formMode === 'paste' ? (
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Dán danh sách từ *</label>
                    <textarea className="input-field !h-40 resize-none text-sm" required
                      placeholder="apple - quả táo&#10;banana - quả chuối"
                      value={rawText} onChange={e => setRawText(e.target.value)} />
                    <p className="text-xs text-white/30 mt-1">Hệ thống sẽ tự nhận dạng format hoặc dùng AI để tự bóc tách.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Từ vựng *</label>
                        <input className="input-field" placeholder="implement" required value={form.term}
                          onChange={e => {
                            fns.term(e)
                            setForm(prev => { if (!prev.phonetic) fetchPhonetic(e.target.value); return prev })
                          }} />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1 flex items-center gap-1.5">Phiên âm
                          {phoneticStatus === 'loading' && <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                          {phoneticStatus === 'found' && <span className="text-green-400 text-xs">✓ tự động</span>}
                          {phoneticStatus === 'notfound' && <span className="text-white/30 text-xs">không tìm thấy</span>}
                        </label>
                        <input className="input-field" placeholder="/ˈɪmplɪment/" value={form.phonetic} onChange={e => { fns.phonetic(e); setPhoneticStatus('idle') }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-2">Loại từ</label>
                      <div className="flex flex-wrap gap-2">
                        {['verb', 'noun', 'adjective', 'adverb', 'preposition', 'conjunction', 'phrase'].map(p => {
                          const selected = form.part_of_speech === p
                          const colorMap = { verb: 'bg-blue-500/30 border-blue-400/50 text-blue-200', noun: 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200', adjective: 'bg-violet-500/30 border-violet-400/50 text-violet-200', adverb: 'bg-amber-500/30 border-amber-400/50 text-amber-200', preposition: 'bg-rose-500/30 border-rose-400/50 text-rose-200', conjunction: 'bg-cyan-500/30 border-cyan-400/50 text-cyan-200', phrase: 'bg-pink-500/30 border-pink-400/50 text-pink-200' }
                          const labelVi = { verb: 'v. Động từ', noun: 'n. Danh từ', adjective: 'adj. Tính từ', adverb: 'adv. Trạng từ', preposition: 'prep. Giới từ', conjunction: 'conj. Liên từ', phrase: 'phr. Cụm từ' }
                          return <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, part_of_speech: selected ? '' : p }))} className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${selected ? colorMap[p] : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'}`}>{labelVi[p]}</button>
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Nghĩa tiếng Việt *</label>
                      <input className="input-field" placeholder="Thực hiện, triển khai" required value={form.definition} onChange={fns.definition} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Câu ví dụ</label>
                      <input className="input-field" placeholder="We need to implement the new policy." value={form.example_sentence} onChange={fns.example_sentence} />
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={closeForm} className="btn-secondary flex-1">Hủy</button>
                  <button type="submit" disabled={loading} className={`btn-primary flex-1 ${loading ? 'opacity-70' : ''}`}>
                    {loading ? 'Đang xử lý...' : (formMode === 'paste' ? '📋 Nhập từ' : (editCard ? 'Cập nhật' : 'Thêm từ'))}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}
