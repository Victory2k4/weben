import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api/client'
import { getCachedAudio, setCachedAudio } from '../utils/audioCache'
import QuizQuestion from '../components/QuizQuestion'
import QuizSummary from '../components/QuizSummary'

// ── Shuffle helper ────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Sinh câu hỏi ─────────────────────────────────────────────────────
function generateMCQ(allCards, card, direction) {
  const prompt = direction === 'term_to_def' ? card.term : card.definition
  const correctAnswer = direction === 'term_to_def' ? card.definition : card.term

  const distractors = shuffle(allCards.filter(c => c.id !== card.id))
    .slice(0, 3)
    .map(c => direction === 'term_to_def' ? c.definition : c.term)

  const options = shuffle([correctAnswer, ...distractors])

  return {
    type: 'mcq',
    prompt,
    options,
    correctIndex: options.indexOf(correctAnswer),
    correctAnswer,
    card,
    direction,
  }
}

function generateFillBlank(card) {
  const term = card.term.trim()
  return {
    type: 'fill',
    prompt: card.definition,
    hint: term[0] + '_'.repeat(Math.max(1, term.length - 1)),
    correctAnswer: term.toLowerCase(),
    card,
  }
}

function generateQuiz(allCards, config) {
  const { count = 10, mode = 'mixed', direction = 'term_to_def' } = config
  const selected = shuffle(allCards).slice(0, Math.min(count, allCards.length))
  const canMCQ = allCards.length >= 4

  return selected.map((card, i) => {
    if (mode === 'mcq' && canMCQ) return generateMCQ(allCards, card, direction)
    if (mode === 'fill') return generateFillBlank(card)
    // mixed
    if (!canMCQ) return generateFillBlank(card)
    return i % 2 === 0
      ? generateMCQ(allCards, card, direction)
      : generateFillBlank(card)
  })
}

// ── Background palette (same as Study) ───────────────────────────────
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

function getBgStyle(p) {
  return { background: `linear-gradient(135deg, ${p.from} 0%, ${p.via} 50%, ${p.to} 100%)` }
}

// ── Audio helpers ─────────────────────────────────────────────────────
function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

// ═════════════════════════════════════════════════════════════════════
//  QUIZ PAGE
// ═════════════════════════════════════════════════════════════════════
export default function Quiz() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Deck & cards
  const [deck, setDeck] = useState(null)
  const [allCards, setAllCards] = useState([])
  const [loading, setLoading] = useState(true)

  // Config modal
  const [showConfig, setShowConfig] = useState(true)
  const [config, setConfig] = useState({
    count: 10,
    mode: 'mixed',     // 'mcq' | 'fill' | 'mixed'
    direction: 'term_to_def',  // 'term_to_def' | 'def_to_term'
  })

  // Quiz state
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])       // { correct: bool, question }[]
  const [done, setDone] = useState(false)
  const startTime = useRef(null)

  // Audio
  const audioCache = useRef({})
  const currentAudio = useRef(null)
  const lastClickTime = useRef({ uk: 0, us: 0 })

  // Background ripple
  const [bgIndex, setBgIndex] = useState(0)
  const [ripples, setRipples] = useState([])
  const rippleIdRef = useRef(0)
  const containerRef = useRef(null)

  const handleBgClick = useCallback((e) => {
    if (e.target.closest('button, a, input, [role="button"], [data-no-ripple]')) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const nextBgIndex = (bgIndex + 1) % BG_PALETTE.length
    const rid = ++rippleIdRef.current
    setRipples(prev => [...prev, { id: rid, x, y, nextBgIndex }])
    setTimeout(() => {
      setBgIndex(nextBgIndex)
      setRipples(prev => prev.filter(r => r.id !== rid))
    }, 900)
  }, [bgIndex])

  // ── Load deck ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/decks/${id}`)
        setDeck(data)
        setAllCards(data.cards || [])
        if ((data.cards || []).length < 2) {
          toast.error('Cần ít nhất 2 từ để kiểm tra!')
          navigate(`/deck/${id}`)
        }
      } catch {
        navigate('/')
      }
      setLoading(false)
    }
    load()
  }, [id])

  // ── Audio ───────────────────────────────────────────────────────────
  const stopAll = () => {
    if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current.currentTime = 0 }
    window.speechSynthesis.cancel()
  }

  const speakWithSynthesis = (text, accent = 'us', slow = false) => {
    if (!('speechSynthesis' in window)) return
    stopAll()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = accent === 'uk' ? 'en-GB' : 'en-US'
    u.rate = slow ? 0.35 : 0.85
    window.speechSynthesis.speak(u)
  }

  const fetchAudioUrls = async (word) => {
    if (audioCache.current[word]) return audioCache.current[word]
    const cached = await getCachedAudio(word)
    if (cached && (cached.uk || cached.us)) {
      const result = { uk: cached.uk, us: cached.us }
      audioCache.current[word] = result
      return result
    }
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`)
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
      if (uk || us) setCachedAudio(word, result)
      return result
    } catch {
      audioCache.current[word] = { uk: '', us: '' }
      return { uk: '', us: '' }
    }
  }

  const playAudio = async (word, accent) => {
    const now = Date.now()
    const isDoubleClick = (now - lastClickTime.current[accent]) < 350
    lastClickTime.current[accent] = now
    const slow = isDoubleClick
    stopAll()
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
    speakWithSynthesis(word, accent, slow)
    fetchAudioUrls(word).catch(() => {})
  }

  // Preload audio for current question
  useEffect(() => {
    if (questions[currentIndex]?.card?.term) {
      fetchAudioUrls(questions[currentIndex].card.term).catch(() => {})
    }
  }, [currentIndex, questions])

  // ── Start Quiz ──────────────────────────────────────────────────────
  const startQuiz = () => {
    const qs = generateQuiz(allCards, config)
    setQuestions(qs)
    setCurrentIndex(0)
    setAnswers([])
    setDone(false)
    setShowConfig(false)
    startTime.current = Date.now()
  }

  // ── Answer handler ──────────────────────────────────────────────────
  const handleAnswer = (isCorrect) => {
    setAnswers(prev => [...prev, { correct: isCorrect, question: questions[currentIndex] }])
  }

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      finishQuiz()
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  const finishQuiz = async () => {
    setDone(true)
    const duration = Math.round((Date.now() - startTime.current) / 1000)
    const finalAnswers = [...answers]
    // The last answer was already pushed in handleAnswer
    const correct = finalAnswers.filter(a => a.correct).length
    const wrongIds = finalAnswers.filter(a => !a.correct).map(a => a.question.card.id)

    try {
      await api.post('/progress/quiz', {
        deck_id: Number(id),
        total_questions: questions.length,
        correct_answers: correct,
        wrong_card_ids: wrongIds,
        quiz_mode: config.mode,
        duration_seconds: duration,
      })
    } catch {
      // Silently fail – quiz result is still shown locally
    }
  }

  // ── Retry with wrong cards only ─────────────────────────────────────
  const retryWrong = () => {
    const wrongCards = answers.filter(a => !a.correct).map(a => a.question.card)
    if (wrongCards.length < 2) {
      toast.error('Cần ít nhất 2 từ để kiểm tra lại!')
      return
    }
    const qs = generateQuiz(wrongCards, { ...config, count: wrongCards.length })
    setQuestions(qs)
    setCurrentIndex(0)
    setAnswers([])
    setDone(false)
    startTime.current = Date.now()
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40" style={getBgStyle(BG_PALETTE[0])}>
        Đang tải...
      </div>
    )
  }

  // ── Done → Summary ──────────────────────────────────────────────────
  if (done) {
    const duration = Math.round((Date.now() - startTime.current) / 1000)
    return (
      <QuizSummary
        answers={answers}
        total={questions.length}
        deckId={id}
        deck={deck}
        duration={duration}
        onRetryAll={() => { setShowConfig(true); setDone(false) }}
        onRetryWrong={retryWrong}
      />
    )
  }

  const currentBg = BG_PALETTE[bgIndex]
  const question = questions[currentIndex]
  const elapsed = startTime.current ? Math.round((Date.now() - startTime.current) / 1000) : 0

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
        const maxR = Math.hypot(
          Math.max(x, (containerRef.current?.offsetWidth || 1200) - x),
          Math.max(y, (containerRef.current?.offsetHeight || 900) - y)
        ) * 1.1
        return (
          <span key={id} style={{
            position: 'absolute', left: x, top: y, width: maxR * 2, height: maxR * 2,
            transform: 'translate(-50%, -50%) scale(0)', borderRadius: '50%',
            background: `radial-gradient(circle, ${nb.via} 0%, ${nb.from} 60%, ${nb.to} 100%)`,
            animation: 'bgRipple 0.85s cubic-bezier(0.22,1,0.36,1) forwards',
            pointerEvents: 'none', zIndex: 0,
          }} />
        )
      })}

      {/* Subtle hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none select-none" style={{ zIndex: 1 }}>
        Nhấn nền để đổi màu ✨
      </div>

      {/* ── Config Modal ────────────────────────────────────────────── */}
      {showConfig && (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md card-glass rounded-3xl p-8"
            data-no-ripple="true"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">📝 Cài Đặt Kiểm Tra</h2>
              <button onClick={() => navigate(`/deck/${id}`)} className="text-white/40 hover:text-white transition-colors text-sm">
                ← Quay lại
              </button>
            </div>

            {deck && <p className="text-white/40 text-sm mb-6">{deck.title} • {allCards.length} từ</p>}

            {/* Số câu */}
            <div className="mb-5">
              <label className="block text-sm text-white/60 mb-2">Số câu hỏi</label>
              <div className="flex gap-2">
                {[5, 10, 20, allCards.length].map((n, i) => (
                  <button
                    key={n}
                    onClick={() => setConfig(c => ({ ...c, count: n }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      config.count === n
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {n === allCards.length ? 'Tất cả' : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Dạng câu hỏi */}
            <div className="mb-5">
              <label className="block text-sm text-white/60 mb-2">Dạng câu hỏi</label>
              <div className="flex gap-2">
                {[
                  { key: 'mixed', label: '🔀 Trộn', desc: 'Trắc nghiệm + Điền từ' },
                  { key: 'mcq', label: '🔘 Trắc nghiệm', desc: 'Chọn đáp án đúng' },
                  { key: 'fill', label: '✏️ Điền từ', desc: 'Gõ từ đúng' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setConfig(c => ({ ...c, mode: m.key }))}
                    className={`flex-1 py-3 rounded-xl text-center transition-all ${
                      config.mode === m.key
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="text-sm font-medium">{m.label}</div>
                  </button>
                ))}
              </div>
              {allCards.length < 4 && config.mode !== 'fill' && (
                <p className="text-yellow-400/80 text-xs mt-2">⚠️ Cần ≥ 4 từ cho trắc nghiệm. Sẽ chỉ dùng dạng điền từ.</p>
              )}
            </div>

            {/* Hướng */}
            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2">Hướng câu hỏi</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfig(c => ({ ...c, direction: 'term_to_def' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    config.direction === 'term_to_def'
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  🇬🇧 EN → VI
                </button>
                <button
                  onClick={() => setConfig(c => ({ ...c, direction: 'def_to_term' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    config.direction === 'def_to_term'
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  🇻🇳 VI → EN
                </button>
              </div>
            </div>

            <button
              onClick={startQuiz}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl font-semibold text-lg hover:from-indigo-400 hover:to-violet-400 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/30"
            >
              Bắt Đầu Kiểm Tra ▶
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Quiz in-progress ─────────────────────────────────────────── */}
      {!showConfig && question && (
        <>
          {/* Top bar */}
          <div className="max-w-2xl mx-auto w-full px-4 pt-6" style={{ position: 'relative', zIndex: 10 }}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => {
                if (confirm('Bạn có chắc muốn thoát? Kết quả sẽ không được lưu.')) navigate(`/deck/${id}`)
              }} className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1">
                ← Thoát
              </button>
              <span className="text-white/40 text-sm">{deck?.title}</span>
              <span className="text-white/60 text-sm font-medium">Câu {currentIndex + 1} / {questions.length}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6" style={{ position: 'relative', zIndex: 10 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-2xl"
                data-no-ripple="true"
              >
                <QuizQuestion
                  question={question}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  onSpeakUK={() => playAudio(question.card.term, 'uk')}
                  onSpeakUS={() => playAudio(question.card.term, 'us')}
                  SpeakerIcon={SpeakerIcon}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
