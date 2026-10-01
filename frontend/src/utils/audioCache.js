// ═══════════════════════════════════════════════════════════════════
//  IndexedDB Audio URL Cache
//  Lưu URL audio từ Free Dictionary API vào trình duyệt vĩnh viễn.
//  Lần sau mở lại trang → lấy URL từ IndexedDB → phát ngay 0ms.
// ═══════════════════════════════════════════════════════════════════

const DB_NAME = 'flashcard_audio_cache'
const DB_VERSION = 1
const STORE_NAME = 'audio_urls'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'word' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Lấy audio URLs đã cache cho 1 từ
 * @returns {{ uk: string, us: string } | null}
 */
export async function getCachedAudio(word) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(word.toLowerCase())
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Lưu audio URLs vào IndexedDB
 */
export async function setCachedAudio(word, urls) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ word: word.toLowerCase(), uk: urls.uk, us: urls.us })
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Không làm gì, cache miss lần sau sẽ fetch lại
  }
}
