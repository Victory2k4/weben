import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// ═════════════════════════════════════════════════════════════════════
//  QuizQuestion – Renders MCQ or Fill-in-the-Blank question
// ═════════════════════════════════════════════════════════════════════

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function QuizQuestion({ question, onAnswer, onNext, onSpeakUK, onSpeakUS, SpeakerIcon }) {
  const [selected, setSelected] = useState(null)     // MCQ: index clicked
  const [answered, setAnswered] = useState(false)
  const [fillInput, setFillInput] = useState('')      // Fill mode input
  const [hintLevel, setHintLevel] = useState(0)       // Number of letters revealed
  const [fillResult, setFillResult] = useState(null)  // 'correct' | 'wrong' | null
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  // Focus input on fill questions
  useEffect(() => {
    if (question.type === 'fill' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [question])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Keyboard shortcuts for MCQ: 1-4
  useEffect(() => {
    if (question.type !== 'mcq' || answered) return
    const handler = (e) => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= 4 && num <= question.options.length) {
        handleMCQSelect(num - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [question, answered])

  // ── MCQ Answer ──────────────────────────────────────────────────────
  const handleMCQSelect = (idx) => {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    const isCorrect = idx === question.correctIndex
    onAnswer(isCorrect)

    // Auto-advance after delay
    timerRef.current = setTimeout(() => {
      onNext()
    }, isCorrect ? 1200 : 2500)
  }

  // ── Fill Answer ─────────────────────────────────────────────────────
  const handleFillSubmit = (e) => {
    e?.preventDefault()
    if (answered || !fillInput.trim()) return
    setAnswered(true)

    const clean = str => str.toLowerCase().trim().replace(/[^a-z\s-]/g, '')
    const isCorrect = clean(fillInput) === clean(question.correctAnswer)
    setFillResult(isCorrect ? 'correct' : 'wrong')
    onAnswer(isCorrect)

    timerRef.current = setTimeout(() => {
      onNext()
    }, isCorrect ? 1200 : 2800)
  }

  // ── Hint system ─────────────────────────────────────────────────────
  const getHint = () => {
    const term = question.card.term
    const level = Math.min(hintLevel, term.length - 1)
    if (level === 0) return term[0] + '_'.repeat(term.length - 1)
    return term.slice(0, level + 1) + '_'.repeat(Math.max(0, term.length - level - 1))
  }

  const revealMoreHint = () => {
    if (hintLevel < question.card.term.length - 2) {
      setHintLevel(h => h + 1)
    }
  }

  // ── Skip ────────────────────────────────────────────────────────────
  const handleSkip = () => {
    if (answered) return
    setAnswered(true)
    if (question.type === 'mcq') {
      setSelected(-1)
    } else {
      setFillResult('wrong')
    }
    onAnswer(false)
    timerRef.current = setTimeout(() => onNext(), 2000)
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="card-glass rounded-3xl p-6 sm:p-8">
      {/* ── Question header ──────────────────────────────────────────── */}
      <div className="text-center mb-6">
        {question.card.part_of_speech && (
          <span className="inline-block text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full mb-3">
            {question.card.part_of_speech}
          </span>
        )}

        {question.type === 'mcq' ? (
          <>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">
              {question.direction === 'term_to_def' ? (
                <>{question.prompt}</>
              ) : (
                <span className="text-indigo-300">{question.prompt}</span>
              )}
            </h2>
            {question.direction === 'term_to_def' && question.card.phonetic && (
              <p className="text-white/40 text-sm mb-2">{question.card.phonetic}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Nghĩa tiếng Việt</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-300 mb-3">{question.prompt}</h2>
            <p className="text-white/30 text-sm font-mono tracking-widest">{getHint()}</p>
          </>
        )}

        {/* Speaker buttons */}
        {question.direction === 'term_to_def' && question.type === 'mcq' && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSpeakUK() }}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 rounded-full transition-all active:scale-90"
              title="Phát âm Anh-Anh"
            >
              <span className="text-white/60 group-hover:text-indigo-300 transition-colors"><SpeakerIcon /></span>
              <span className="text-xs text-white/50 group-hover:text-indigo-300 font-semibold transition-colors">UK</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSpeakUS() }}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 rounded-full transition-all active:scale-90"
              title="Phát âm Anh-Mỹ"
            >
              <span className="text-white/60 group-hover:text-violet-300 transition-colors"><SpeakerIcon /></span>
              <span className="text-xs text-white/50 group-hover:text-violet-300 font-semibold transition-colors">US</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="w-16 h-px bg-white/10 mx-auto mb-6" />

      {/* ── MCQ Options ──────────────────────────────────────────────── */}
      {question.type === 'mcq' && (
        <div className="space-y-3 max-w-lg mx-auto">
          {question.options.map((option, idx) => {
            let cls = 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            if (answered) {
              if (idx === question.correctIndex) {
                cls = 'bg-green-500/20 border-green-400/50 text-green-200'
              } else if (idx === selected && idx !== question.correctIndex) {
                cls = 'bg-red-500/20 border-red-400/50 text-red-200'
              } else {
                cls = 'bg-white/3 border-white/5 text-white/30'
              }
            }
            return (
              <motion.button
                key={idx}
                onClick={() => handleMCQSelect(idx)}
                disabled={answered}
                whileHover={!answered ? { scale: 1.01 } : {}}
                whileTap={!answered ? { scale: 0.98 } : {}}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${cls}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  answered && idx === question.correctIndex
                    ? 'bg-green-500/30 text-green-300'
                    : answered && idx === selected && idx !== question.correctIndex
                    ? 'bg-red-500/30 text-red-300'
                    : 'bg-white/10 text-white/50'
                }`}>
                  {answered && idx === question.correctIndex ? '✓' :
                   answered && idx === selected && idx !== question.correctIndex ? '✗' :
                   OPTION_LETTERS[idx]}
                </span>
                <span className="flex-1 text-sm sm:text-base">{option}</span>
                {!answered && (
                  <kbd className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{idx + 1}</kbd>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* ── Fill Input ───────────────────────────────────────────────── */}
      {question.type === 'fill' && (
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleFillSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={fillInput}
              onChange={e => setFillInput(e.target.value)}
              disabled={answered}
              placeholder="Nhập từ tiếng Anh..."
              autoComplete="off"
              spellCheck="false"
              className={`w-full px-5 py-4 rounded-2xl text-lg font-medium bg-white/5 border transition-all outline-none ${
                fillResult === 'correct'
                  ? 'border-green-400/50 bg-green-500/10 text-green-200'
                  : fillResult === 'wrong'
                  ? 'border-red-400/50 bg-red-500/10 text-red-200'
                  : 'border-white/10 focus:border-indigo-400/50 text-white'
              }`}
            />
            {!answered && (
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-sm font-medium transition-colors"
              >
                Kiểm tra
              </button>
            )}
          </form>

          {/* Feedback after answer */}
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border ${
                fillResult === 'correct'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {fillResult === 'correct' ? (
                <div className="flex items-center gap-2 text-green-300">
                  <span className="text-xl">✅</span>
                  <span className="font-semibold">Chính xác!</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-red-300 mb-2">
                    <span className="text-xl">❌</span>
                    <span className="font-semibold">Sai rồi!</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white/40">Đáp án đúng: </span>
                    <span className="text-green-300 font-bold text-base">{question.card.term}</span>
                    {question.card.phonetic && (
                      <span className="text-white/30 ml-2">{question.card.phonetic}</span>
                    )}
                  </div>
                  {/* Audio buttons for correct answer */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={onSpeakUK}
                      className="group flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 rounded-full transition-all active:scale-90"
                    >
                      <span className="text-white/50 group-hover:text-indigo-300 transition-colors"><SpeakerIcon /></span>
                      <span className="text-[10px] text-white/40 group-hover:text-indigo-300 font-semibold">UK</span>
                    </button>
                    <button
                      onClick={onSpeakUS}
                      className="group flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 rounded-full transition-all active:scale-90"
                    >
                      <span className="text-white/50 group-hover:text-violet-300 transition-colors"><SpeakerIcon /></span>
                      <span className="text-[10px] text-white/40 group-hover:text-violet-300 font-semibold">US</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Hint & Skip buttons */}
          {!answered && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={revealMoreHint}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-yellow-500/20 border border-white/10 hover:border-yellow-400/40 rounded-xl text-sm text-white/50 hover:text-yellow-300 transition-all"
              >
                💡 Gợi ý thêm
              </button>
              <button
                onClick={handleSkip}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/40 hover:text-white transition-all"
              >
                Bỏ qua →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MCQ feedback + Skip ──────────────────────────────────────── */}
      {question.type === 'mcq' && !answered && (
        <div className="flex justify-end mt-4 max-w-lg mx-auto">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/40 hover:text-white transition-all"
          >
            Bỏ qua →
          </button>
        </div>
      )}

      {/* ── MCQ: show correct answer info when wrong ──────────────────── */}
      {question.type === 'mcq' && answered && selected !== question.correctIndex && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 max-w-lg mx-auto p-4 rounded-xl bg-white/5 border border-white/10"
        >
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Đáp án đúng</p>
          <p className="text-green-300 font-semibold">
            {question.direction === 'term_to_def' ? question.correctAnswer : question.card.term}
          </p>
          {question.card.example_sentence && (
            <p className="text-white/30 text-sm mt-1 italic">"{question.card.example_sentence}"</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onSpeakUK}
              className="group flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 rounded-full transition-all active:scale-90"
            >
              <span className="text-white/50 group-hover:text-indigo-300 transition-colors"><SpeakerIcon /></span>
              <span className="text-[10px] text-white/40 group-hover:text-indigo-300 font-semibold">UK</span>
            </button>
            <button
              onClick={onSpeakUS}
              className="group flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 rounded-full transition-all active:scale-90"
            >
              <span className="text-white/50 group-hover:text-violet-300 transition-colors"><SpeakerIcon /></span>
              <span className="text-[10px] text-white/40 group-hover:text-violet-300 font-semibold">US</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
