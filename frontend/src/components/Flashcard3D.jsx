import React from 'react'

// ── SVG loa ──────────────────────────────────────────────────────────
function SpeakerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

// ── Component chính ───────────────────────────────────────────────────
export default function Flashcard3D({ card, flipped, onFlip, onSpeakUK, onSpeakUS, onSpeakSentence }) {
  return (
    <div className="card-scene w-full" style={{ height: '360px' }}>
      <div className={`card-inner w-full h-full ${flipped ? 'flipped' : ''}`} onClick={onFlip}>

        {/* FRONT */}
        <div className="card-face card-glass w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 cursor-pointer select-none rounded-3xl hover:bg-white/8 transition-colors">
          <div className="text-center w-full">
            {card.part_of_speech && (
              <span className="inline-block text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full mb-3">
                {card.part_of_speech}
              </span>
            )}
            <h2 className="text-4xl sm:text-5xl font-bold text-center leading-tight">{card.term}</h2>

            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); onSpeakUK() }}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 rounded-full transition-all active:scale-90"
                title="Phát âm Anh-Anh (nhấn đúp để đọc chậm)"
              >
                <span className="text-white/60 group-hover:text-indigo-300 transition-colors"><SpeakerIcon /></span>
                <span className="text-xs text-white/50 group-hover:text-indigo-300 font-semibold transition-colors">UK</span>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onSpeakUS() }}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 rounded-full transition-all active:scale-90"
                title="Phát âm Anh-Mỹ (nhấn đúp để đọc chậm)"
              >
                <span className="text-white/60 group-hover:text-violet-300 transition-colors"><SpeakerIcon /></span>
                <span className="text-xs text-white/50 group-hover:text-violet-300 font-semibold transition-colors">US</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-white/10 my-4" />

          {/* Phiên âm IPA chuẩn */}
          {card.phonetic && (
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Phiên âm IPA</p>
              <p className="text-white/50 text-lg tracking-widest font-light">{card.phonetic}</p>
            </div>
          )}

          <p className="text-white/20 text-xs mt-4 animate-pulse">Nhấn để xem nghĩa</p>
        </div>

        {/* BACK – Definition */}
        <div className="card-face card-back card-glass w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer select-none rounded-3xl hover:bg-white/8 transition-colors">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Nghĩa</p>
            <p className="text-3xl font-bold text-indigo-300 leading-snug">{card.definition}</p>
            {card.example_sentence && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Ví dụ</p>
                  {onSpeakSentence && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); onSpeakSentence('uk') }}
                        className="group flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 rounded-full transition-all active:scale-90"
                        title="Nghe câu ví dụ - giọng Anh"
                      >
                        <span className="text-white/50 group-hover:text-indigo-300 transition-colors"><SpeakerIcon /></span>
                        <span className="text-[10px] text-white/40 group-hover:text-indigo-300 font-semibold transition-colors">UK</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onSpeakSentence('us') }}
                        className="group flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 rounded-full transition-all active:scale-90"
                        title="Nghe câu ví dụ - giọng Mỹ"
                      >
                        <span className="text-white/50 group-hover:text-violet-300 transition-colors"><SpeakerIcon /></span>
                        <span className="text-[10px] text-white/40 group-hover:text-violet-300 font-semibold transition-colors">US</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-white/70 italic">"{card.example_sentence}"</p>
              </div>
            )}
            <p className="text-white/20 text-sm mt-6 animate-pulse">Nhấn để quay lại</p>
          </div>
        </div>
      </div>
    </div>
  )
}
