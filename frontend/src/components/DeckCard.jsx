import React from 'react'
import { motion } from 'framer-motion'

export default function DeckCard({ deck, index, onClick, onDelete, onStudy, onQuiz }) {
  const mastered = deck.mastered_count || 0
  const total = deck.card_count || 0
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="card-glass p-5 cursor-pointer group hover:bg-white/8 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
    >
      {/* Color accent */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: deck.color }} />

      <div className="flex items-start justify-between mb-3 mt-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: deck.color + '22', border: `1px solid ${deck.color}44` }}>
          📚
        </div>
        <button onClick={onDelete}
          className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
          🗑️
        </button>
      </div>

      <h3 className="font-semibold text-white leading-snug">{deck.title}</h3>
      {deck.description && <p className="text-white/40 text-sm mt-1 line-clamp-1">{deck.description}</p>}

      <div className="flex items-center gap-3 mt-3 text-sm text-white/40">
        <span>{total} từ</span>
        <span>•</span>
        <span className="text-green-400">{mastered} đã thuộc</span>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-3">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: deck.color }} />
          </div>
          <p className="text-white/30 text-xs mt-1">{pct}% hoàn thành</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onStudy}
          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: deck.color + '22', color: deck.color, border: `1px solid ${deck.color}44` }}
          onMouseOver={e => e.currentTarget.style.background = deck.color + '44'}
          onMouseOut={e => e.currentTarget.style.background = deck.color + '22'}>
          ▶ Học ngay
        </button>
        <button onClick={onQuiz}
          disabled={total < 2}
          title={total < 2 ? 'Cần ít nhất 2 từ để kiểm tra' : 'Kiểm tra trắc nghiệm & điền từ'}
          className="px-3.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed">
          📝
        </button>
      </div>
    </motion.div>
  )
}
