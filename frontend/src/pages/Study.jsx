import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api/client'
import useStore from '../store/useStore'
import Flashcard3D from '../components/Flashcard3D'
import StudySummary from '../components/StudySummary'
import { getCachedAudio, setCachedAudio } from '../utils/audioCache'

const RATING_LABELS = ['again', 'hard', 'easy']

// Palette of rich dark gradient backgrounds
const BG_PALETTE = [
  { from: '#0f0c29', via: '#302b63', to: '#24243e' },
  { from: '#0d1b2a', via: '#1b4332', to: '#081c15' },
  { from: '#1a0533', via: '#3d0066', to: '#0d0221' },
  { from: '#03071e', via: '#370617', to: '#6a040f' },
  { from: '#0a1628', via: '#0e3460', to: '#1565c0' },
  { from: '#0d2137', via: '#004d40', to: '#00251a' },
  { from: '#1c0a2e', via: '#6a1b9a', to: '#2e0052' },
  { from: '#1a1a2e', via: '#16213e', to: '#0f3460' },
]

function getBgStyle(palette) {
  return {
    background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 50%, ${palette.to} 100%)`,
  }
}

export default function Study() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { submitReview, saveSession } = useStore()

  const [cards, setCards] = useState([])
  const [deck, setDeck] = useState(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState({ again: 0, hard: 0, easy: 0 })
  const [loading, setLoading] = useState(true)
  const startTime = useRef(Date.now())
  // Pronunciation state
  const audioCache = useRef({})       // { word: { uk: url, us: url } }
  const currentAudio = useRef(null)
  const lastClickTime = useRef({ uk: 0, us: 0 }) // để detect double-click

  // Ripple background state
  const [bgIndex, setBgIndex] = useState(0)
  const [ripples, setRipples] = useState([])   // [{ id, x, y, nextBg }]
  const rippleIdRef = useRef(0)
  const containerRef = useRef(null)

  const handleBgClick = useCallback((e) => {
    // Only block clicks directly on buttons, links, or the flashcard card
    if (e.target.closest('button, a, [role="button"], [data-no-ripple]')) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const nextBgIndex = (bgIndex + 1) % BG_PALETTE.length
    const id = ++rippleIdRef.current

    setRipples(prev => [...prev, { id, x, y, nextBgIndex }])

    // After animation ends, commit the new background and remove ripple
    setTimeout(() => {
      setBgIndex(nextBgIndex)
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 900)
  }, [bgIndex])

  useEffect(() => {
    const load = async () => {
      try {
        const [deckRes, cardsRes] = await Promise.all([
          api.get(`/decks/${id}`),
          api.get(`/decks/${id}/study`)
        ])
        setDeck(deckRes.data)
        setCards(cardsRes.data)
        if (cardsRes.data.length === 0) {
          toast.success('Không có từ nào cần ôn tập hôm nay! 🎉')
          navigate(`/deck/${id}`)
        }
      } catch {
        navigate('/')
      }
      setLoading(false)
    }
    load()
  }, [id])

  // ── Preload audio ngầm khi chuyển sang thẻ mới ───────────────────
  // Tải sẵn URL audio từ Dictionary API vào cache để khi user bấm loa → phát ngay
  useEffect(() => {
    const card = cards[index]
    if (card?.term) {
      fetchAudioUrls(card.term).catch(() => {})
    }
  }, [index, cards])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped(f => !f)
      }
      if (flipped) {
        if (e.code === 'Digit1') rate(0)
        if (e.code === 'Digit2') rate(1)
        if (e.code === 'Digit3') rate(2)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, index, cards])

  // ── Helpers: dừng mọi audio đang phát ──────────────────────────────
  const stopAll = () => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current.currentTime = 0
    }
    window.speechSynthesis.cancel()
  }

  // ── Phát bằng Web Speech API (dùng cho câu dài & fallback) ────────
  const speakWithSynthesis = (text, accent = 'us', slow = false) => {
    if (!('speechSynthesis' in window)) return
    stopAll()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = accent === 'uk' ? 'en-GB' : 'en-US'
    u.rate = slow ? 0.35 : 0.85
    window.speechSynthesis.speak(u)
  }

  // ── Fetch & cache UK/US audio URLs từ Free Dictionary API ─────────
  // Ưu tiên: memory cache → IndexedDB (vĩnh viễn) → fetch API
  const fetchAudioUrls = async (word) => {
    // 1. Memory cache (phiên hiện tại)
    if (audioCache.current[word]) return audioCache.current[word]

    // 2. IndexedDB cache (tồn tại vĩnh viễn qua các phiên)
    const cached = await getCachedAudio(word)
    if (cached && (cached.uk || cached.us)) {
      const result = { uk: cached.uk, us: cached.us }
      audioCache.current[word] = result
      return result
    }

    // 3. Fetch từ Free Dictionary API
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`
      )
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      const phonetics = data[0]?.phonetics || []

      let uk = phonetics.find(p => p.audio && p.audio.includes('-uk'))?.audio || ''
      let us = phonetics.find(p => p.audio && p.audio.includes('-us'))?.audio || ''
      const any = phonetics.find(p => p.audio)?.audio || ''
      if (!uk) uk = any
      if (!us) us = any

      const result = { uk, us }
      audioCache.current[word] = result

      // Lưu vào IndexedDB để lần sau không cần fetch lại
      if (uk || us) setCachedAudio(word, result)

      return result
    } catch {
      audioCache.current[word] = { uk: '', us: '' }
      return { uk: '', us: '' }
    }
  }

  // ── Phát âm từ đơn: phát tức thì bằng SpeechSynthesis, đồng thời
  //    tải audio Dictionary API ngầm. Lần sau có cache → dùng audio file.
  const playAudio = async (word, accent) => {
    const now = Date.now()
    const DOUBLE_CLICK_MS = 350
    const isDoubleClick = (now - lastClickTime.current[accent]) < DOUBLE_CLICK_MS
    lastClickTime.current[accent] = now
    const slow = isDoubleClick

    stopAll()

    // 1. Kiểm tra cache trước (memory → IndexedDB) — nếu có thì phát ngay, không delay
    const memoryCached = audioCache.current[word]
    if (memoryCached) {
      const url = accent === 'uk' ? memoryCached.uk : memoryCached.us
      if (url) {
        const audio = new Audio(url)
        audio.playbackRate = slow ? 0.65 : 1.0
        currentAudio.current = audio
        audio.play().catch(() => speakWithSynthesis(word, accent, slow))
        return
      }
    }

    // 2. Không có trong memory cache → phát tức thì bằng SpeechSynthesis (0ms delay)
    speakWithSynthesis(word, accent, slow)

    // 3. Đồng thời tải audio từ Dictionary API ngầm để cache cho lần sau
    fetchAudioUrls(word).catch(() => {})
  }

  // ── Phát âm câu ví dụ: luôn dùng SpeechSynthesis (tức thì, miễn phí)
  const speakSentence = (sentence, accent = 'us') => {
    if (!sentence) return
    speakWithSynthesis(sentence, accent, false)
  }

  const rate = async (rating) => {
    if (!cards[index]) return
    const card = cards[index]
    const label = RATING_LABELS[rating]

    await submitReview(card.id, rating)

    setResults(prev => {
      const updated = { ...prev }
      updated[label] = (updated[label] || 0) + 1
      return updated
    })

    if (index + 1 >= cards.length) {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      setResults(prev => {
        const finalResults = { ...prev }
        finalResults[label] = (finalResults[label] || 0) + 1
        saveSession({
          deck_id: Number(id),
          cards_studied: cards.length,
          cards_mastered: finalResults.easy || 0,
          duration_seconds: duration
        })
        return finalResults
      })
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setFlipped(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40" style={getBgStyle(BG_PALETTE[0])}>
        Đang tải...
      </div>
    )
  }

  if (done) {
    return <StudySummary results={results} total={cards.length} deckId={id} deck={deck} />
  }

  const card = cards[index]
  if (!card) return null

  const currentBg = BG_PALETTE[bgIndex]

  return (
    <div
      ref={containerRef}
      onClick={handleBgClick}
      className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{ ...getBgStyle(currentBg), cursor: 'crosshair', transition: 'background 0.6s ease' }}
    >
      {/* Ripple overlays */}
      {ripples.map(({ id, x, y, nextBgIndex }) => {
        const nb = BG_PALETTE[nextBgIndex]
        // Calculate radius needed to cover the entire viewport from click point
        const maxR = Math.hypot(
          Math.max(x, (containerRef.current?.offsetWidth || 1200) - x),
          Math.max(y, (containerRef.current?.offsetHeight || 900) - y)
        ) * 1.1
        return (
          <span
            key={id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: maxR * 2,
              height: maxR * 2,
              transform: 'translate(-50%, -50%) scale(0)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${nb.via} 0%, ${nb.from} 60%, ${nb.to} 100%)`,
              animation: 'bgRipple 0.85s cubic-bezier(0.22,1,0.36,1) forwards',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )
      })}

      {/* Subtle hint text */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none"
        style={{ zIndex: 1 }}
      >
        Nhấn nền để đổi màu ✨
      </div>
      {/* Top bar */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-6" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(`/deck/${id}`)}
            className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Quay lại
          </button>
          <span className="text-white/40 text-sm">{deck?.title}</span>
          <span className="text-white/60 text-sm font-medium">{index + 1} / {cards.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / cards.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Flashcard area */}
      {/* (zIndex ensures content is above ripple overlays) */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6" style={{ position: 'relative', zIndex: 10 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-2xl"
            data-no-ripple="true"
          >
            <Flashcard3D
              card={card}
              flipped={flipped}
              onFlip={() => setFlipped(f => !f)}
              onSpeakUK={() => playAudio(card.term, 'uk')}
              onSpeakUS={() => playAudio(card.term, 'us')}
              onSpeakSentence={(accent) => speakSentence(card.example_sentence, accent)}
            />
          </motion.div>
        </AnimatePresence>

        {!flipped && (
          <p className="text-white/30 text-sm mt-4 animate-pulse">
            Nhấn thẻ hoặc <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Space</kbd> để xem nghĩa
          </p>
        )}

        {/* Rating buttons */}
        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-3 mt-6 w-full max-w-lg"
            >
              <button
                onClick={() => rate(0)}
                className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 active:scale-95 transition-all"
              >
                <div className="text-xl mb-1">🔴</div>
                <div className="text-red-300 font-semibold text-sm">Quên rồi</div>
                <div className="text-red-400/60 text-xs mt-0.5">
                  Học lại <kbd className="bg-white/10 px-1 rounded">1</kbd>
                </div>
              </button>
              <button
                onClick={() => rate(1)}
                className="flex-1 py-4 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 active:scale-95 transition-all"
              >
                <div className="text-xl mb-1">🟡</div>
                <div className="text-yellow-300 font-semibold text-sm">Mơ hồ</div>
                <div className="text-yellow-400/60 text-xs mt-0.5">
                  1 ngày <kbd className="bg-white/10 px-1 rounded">2</kbd>
                </div>
              </button>
              <button
                onClick={() => rate(2)}
                className="flex-1 py-4 rounded-2xl bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 active:scale-95 transition-all"
              >
                <div className="text-xl mb-1">🟢</div>
                <div className="text-green-300 font-semibold text-sm">Đã nhớ</div>
                <div className="text-green-400/60 text-xs mt-0.5">
                  3+ ngày <kbd className="bg-white/10 px-1 rounded">3</kbd>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
