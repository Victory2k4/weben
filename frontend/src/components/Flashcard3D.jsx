import React, { useMemo } from 'react'

// ════════════════════════════════════════════════════════════════════
//  MẸO ĐỌC THUẦN VIỆT — chuyển chữ tiếng Anh sang âm gần tiếng Việt
//  Ví dụ: industry → in đớt tri | beautiful → biu ti phồ
// ════════════════════════════════════════════════════════════════════

const RULES = [
  // ── Hậu tố phổ biến (xử lý trước) ──────────────────────────────
  [/tion$/,      'sần'],
  [/sion$/,      'dần'],
  [/ture$/,      'chờ'],
  [/ment$/,      'mần t'],
  [/ness$/,      'nịt'],
  [/ful$/,       'phồ'],
  [/less$/,      'lịt'],
  [/ous$/,       'ớt'],
  [/ical$/,      'ikồ'],
  [/ology$/,     'o lo di'],
  [/ity$/,       'iti'],
  [/ify$/,       'ai phi'],
  [/ize$|ise$/, 'aid'],
  [/ery$/,       'ơ ri'],
  [/ary$/,       'ê ri'],
  [/ory$/,       'o ri'],
  [/ally$/,      'ơ li'],
  [/ily$/,       'i li'],
  [/ling$/,      'ling'],
  [/ing$/,       'ing'],
  [/er$|or$/,    'ờ'],
  [/ar$/,        'a'],
  [/est$/,       'ít'],
  [/al$/,        'ồ'],
  [/le$/,        'ồ'],
  [/en$/,        'ần'],
  [/ed$/,        't'],
  [/ic$/,        'ik'],
  [/age$/,       'id'],
  [/ant$|ent$/, 'ần t'],
  [/ance$|ence$/, 'ần x'],
  [/ism$/,       'id m'],
  [/ist$/,       'ít'],
  [/ive$/,       'iv'],
  [/ish$/,       'ix'],

  // ── Cụm phụ âm đầu ──────────────────────────────────────────────
  [/str/,  'tr'],
  [/spr/,  'pr'],
  [/spl/,  'pl'],
  [/scr/,  'kr'],
  [/thr/,  'tr'],
  [/shr/,  'sr'],
  [/tch/,  'ch'],
  [/dge/,  'd'],

  // ── Phụ âm đặc biệt ─────────────────────────────────────────────
  [/ph/,   'ph'],
  [/ch/,   'ch'],
  [/sh/,   'x'],
  [/th/,   'đ'],   // cả voiced (the) và unvoiced (think) → đ
  [/wh/,   'u'],
  [/ck/,   'k'],
  [/gh/,   ''],    // câm: night, light
  [/kn/,   'n'],   // know, knight
  [/wr/,   'r'],   // write, wrong
  [/ng/,   'ng'],
  [/nk/,   'ngk'],
  [/mb$/,  'm'],   // lamb, bomb
  [/mn/,   'n'],

  // ── Nguyên âm + r ────────────────────────────────────────────────
  [/air/,  'ê'],
  [/ear/,  'iờ'],
  [/eer/,  'iờ'],
  [/our/,  'aoờ'],
  [/oor/,  'uờ'],
  [/ar/,   'a'],
  [/er/,   'ờ'],
  [/ir/,   'ờ'],
  [/or/,   'o'],
  [/ur/,   'ờ'],

  // ── Tổ hợp nguyên âm ─────────────────────────────────────────────
  [/ight/, 'ait'],
  [/ough/, 'ô'],
  [/augh/, 'ot'],
  [/eight/,'ây t'],
  [/ai|ay/, 'ây'],
  [/au|aw/, 'o'],
  [/ea/,   'i'],
  [/ee/,   'i'],
  [/ei|ey/, 'ây'],
  [/ie/,   'i'],
  [/oa/,   'âu'],
  [/oo/,   'u'],
  [/ou/,   'ao'],
  [/ow/,   'âu'],
  [/oy|oi/, 'oi'],
  [/ue|ui/, 'iu'],
  [/ew|eu/, 'iu'],

  // ── Nguyên âm đơn (sau khi đã xử lý combo) ──────────────────────
  // Magic e: vowel-consonant(s)-e → âm dài
  [/a([bcdfghjklmnpqrstvwxyz]+)e\b/, 'ây$1'],  // name→nâym, take→tâyk
  [/i([bcdfghjklmnpqrstvwxyz]+)e\b/, 'ai$1'],  // time→taim, like→laik
  [/o([bcdfghjklmnpqrstvwxyz]+)e\b/, 'âu$1'],  // home→hâum, note→nâut
  [/u([bcdfghjklmnpqrstvwxyz]+)e\b/, 'iu$1'],  // cute→kiut, rule→riul
  // Short vowels
  [/a/, 'ê'],    // cat→kêt, bad→bêd
  [/e/, 'e'],    // bed→bed, pet→pet
  [/i/, 'i'],    // sit→xit, bit→bit
  [/o/, 'o'],    // hot→hot, dog→dog
  [/u/, 'ă'],    // cup→kăp, fun→phăn (sẽ thành ơ bên dưới nếu là schwa)
  [/y/, 'i'],    // gym→dim, myth→mith

  // ── Phụ âm đơn ───────────────────────────────────────────────────
  [/c(?=[eiêiy])/, 'x'],  // city, cell → x
  [/c/, 'k'],
  [/g(?=[eiêiy])/, 'd'],  // gem, giant → d
  [/g/, 'g'],
  [/j/, 'd'],     // jam, jump → dêm, dămp
  [/q/, 'k'],
  [/v/, 'v'],
  [/w/, 'u'],
  [/x/, 'kx'],
  [/z/, 'd'],
  [/b/, 'b'],
  [/d/, 'đ'],    // KEY: d → đ
  [/f/, 'ph'],
  [/h/, 'h'],
  [/k/, 'k'],
  [/l/, 'l'],
  [/m/, 'm'],
  [/n/, 'n'],
  [/p/, 'p'],
  [/r/, 'r'],
  [/s/, 'x'],
  [/t/, 't'],
]

// Tách từ thành âm tiết thô theo nhóm phụ âm-nguyên âm
function splitVietSyllables(viet) {
  // Nguyên âm tiếng Việt (sau khi convert)
  const V = 'aăâeêiôoơuưyàáảãạăắặằẳẵâấậầẩẫèéẻẽẹêếệềểễìíỉĩịòóỏõọôốộồổỗơớợờởỡùúủũụưứựừửữỳýỷỹỵ'
  const vowels = new Set(V)

  const result = []
  let current = ''
  const chars = [...viet]

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (c === ' ') {
      if (current) { result.push(current); current = '' }
      continue
    }
    current += c

    // Ngắt âm tiết sau chuỗi phụ âm kết thúc trước nguyên âm tiếp theo
    const isVowel = (ch) => vowels.has(ch?.toLowerCase())
    if (
      isVowel(c) &&
      i + 1 < chars.length &&
      !isVowel(chars[i + 1]) &&
      i + 2 < chars.length &&
      isVowel(chars[i + 2]) &&
      current.length > 2
    ) {
      result.push(current)
      current = ''
    }
  }
  if (current) result.push(current)
  return result.length > 0 ? result : [viet]
}

function wordToViet(word) {
  if (!word || !/^[a-zA-Z'-]+$/.test(word)) return word

  let s = word.toLowerCase().replace(/'/g, '')

  // Áp dụng từng quy tắc theo thứ tự
  for (const [pattern, replacement] of RULES) {
    s = s.replace(
      pattern instanceof RegExp ? new RegExp(pattern.source, 'gi') : new RegExp(pattern, 'gi'),
      replacement
    )
  }

  // Loại bỏ ký tự không phải tiếng Việt còn sót
  s = s.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '')

  // Tách và hiển thị âm tiết
  const syls = splitVietSyllables(s.trim())
  return syls.join(' ')
}

export function termToViet(term) {
  if (!term || !/[a-zA-Z]/.test(term)) return ''
  // Xử lý từng từ trong cụm (nếu có)
  const words = term.trim().split(/\s+/)
  if (words.length > 4) return '' // cụm quá dài, bỏ qua
  return words.map(w => wordToViet(w)).join('  ·  ')
}

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
  const guide = useMemo(() => termToViet(card.term), [card.term])

  return (
    <div className="card-scene w-full" style={{ height: '360px' }}>
      <div className={`card-inner w-full h-full ${flipped ? 'flipped' : ''}`} onClick={onFlip}>

        {/* FRONT – Term */}
        <div className="card-face card-glass w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer select-none rounded-3xl hover:bg-white/8 transition-colors">
          {card.part_of_speech && (
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full mb-5">
              {card.part_of_speech}
            </span>
          )}

          <h2 className="text-5xl font-bold text-center leading-tight">{card.term}</h2>

          {/* Phiên âm IPA */}
          {card.phonetic && (
            <p className="text-white/35 text-base tracking-widest font-light mt-2">{card.phonetic}</p>
          )}

          {/* Mẹo đọc thuần Việt */}
          {guide && (
            <div className="mt-3 inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 rounded-full px-4 py-1.5">
              <span className="text-[10px] text-indigo-400/60 uppercase tracking-wider font-bold">mẹo đọc</span>
              <span className="text-sm text-indigo-200 font-semibold tracking-wide">{guide}</span>
            </div>
          )}

          {/* UK / US speaker buttons */}
          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); onSpeakUK() }}
              className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 rounded-full transition-all active:scale-90"
              title="Phát âm Anh-Anh (nhấn đúp để đọc chậm)"
            >
              <span className="text-white/60 group-hover:text-indigo-300 transition-colors"><SpeakerIcon /></span>
              <span className="text-xs text-white/50 group-hover:text-indigo-300 font-semibold transition-colors">UK</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onSpeakUS() }}
              className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 rounded-full transition-all active:scale-90"
              title="Phát âm Anh-Mỹ (nhấn đúp để đọc chậm)"
            >
              <span className="text-white/60 group-hover:text-violet-300 transition-colors"><SpeakerIcon /></span>
              <span className="text-xs text-white/50 group-hover:text-violet-300 font-semibold transition-colors">US</span>
            </button>
          </div>

          <p className="text-white/20 text-sm mt-4 animate-pulse">Nhấn để xem nghĩa</p>
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
