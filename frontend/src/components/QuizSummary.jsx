import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// ═════════════════════════════════════════════════════════════════════
//  QuizSummary – Results screen after quiz completion
// ═════════════════════════════════════════════════════════════════════

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`
}

function getGrade(pct) {
  if (pct >= 90) return { emoji: '🏆', label: 'Xuất sắc!', cls: 'from-yellow-400 to-amber-500' }
  if (pct >= 70) return { emoji: '🎉', label: 'Giỏi lắm!', cls: 'from-green-400 to-emerald-500' }
  if (pct >= 50) return { emoji: '💪', label: 'Khá tốt!', cls: 'from-blue-400 to-indigo-500' }
  return { emoji: '📚', label: 'Cần ôn thêm!', cls: 'from-orange-400 to-red-500' }
}

export default function QuizSummary({ answers, total, deckId, deck, duration, onRetryAll, onRetryWrong }) {
  const navigate = useNavigate()
  const correct = answers.filter(a => a.correct).length
  const wrong = answers.filter(a => !a.correct)
  const pct = Math.round((correct / total) * 100)
  const grade = getGrade(pct)

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-lg card-glass rounded-3xl p-8"
      >
        {/* Score circle */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{grade.emoji}</div>
          <h2 className="text-2xl font-bold mb-1">{grade.label}</h2>
          <p className="text-white/40 text-sm">{deck?.title}</p>
        </div>

        {/* Big score */}
        <div className="flex justify-center mb-6">
          <div className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${grade.cls} p-1`}>
            <div className="w-full h-full rounded-full bg-gray-900 flex flex-col items-center justify-center">
              <span className="text-4xl font-black">{correct}/{total}</span>
              <span className="text-white/50 text-sm">{pct}% đúng</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-xl font-bold text-green-300">{correct}</div>
            <div className="text-xs text-green-400/60">✅ Đúng</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="text-xl font-bold text-red-300">{wrong.length}</div>
            <div className="text-xs text-red-400/60">❌ Sai</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="text-xl font-bold text-indigo-300">⏱</div>
            <div className="text-xs text-indigo-400/60">{formatDuration(duration)}</div>
          </div>
        </div>

        {/* Wrong answers detail */}
        {wrong.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Chi tiết câu sai</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {wrong.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <span className="text-red-400/60 text-sm">✗</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-white text-sm">{a.question.card.term}</span>
                    {a.question.card.phonetic && (
                      <span className="text-white/30 text-xs ml-2">{a.question.card.phonetic}</span>
                    )}
                    <p className="text-indigo-300/70 text-xs mt-0.5 truncate">{a.question.card.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={onRetryAll}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl font-semibold hover:from-indigo-400 hover:to-violet-400 active:scale-[0.98] transition-all"
          >
            🔄 Làm lại
          </button>

          {wrong.length >= 2 && (
            <button
              onClick={onRetryWrong}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl font-medium text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all"
            >
              🔁 Chỉ ôn {wrong.length} từ sai
            </button>
          )}

          <button
            onClick={() => navigate(`/deck/${deckId}`)}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl font-medium text-white/50 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all"
          >
            📚 Về bộ thẻ
          </button>
        </div>
      </motion.div>
    </div>
  )
}
