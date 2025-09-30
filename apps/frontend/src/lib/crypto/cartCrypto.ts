// Simple AES-GCM encryption/decryption for cart storage
// Uses a secret from VITE_CART_KEY or generates a per-browser fallback secret

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function getCartSecret(): string {
  const envKey = (import.meta as any).env?.VITE_CART_KEY
  if (envKey && String(envKey).length >= 16) return String(envKey)
  try {
    let stored = localStorage.getItem('pos_cart_secret')
    if (!stored) {
      const arr = crypto.getRandomValues(new Uint8Array(32))
      stored = toBase64(arr)
      localStorage.setItem('pos_cart_secret', stored)
    }
    return stored
  } catch {
    return 'pos_cart_default_secret_please_set_VITE_CART_KEY'
  }
}

async function getKey(secret: string): Promise<CryptoKey> {
  // Derive a fixed-length key from the secret using SHA-256
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret))
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptCart(data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getKey(getCartSecret())
  const plaintext = textEncoder.encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const ct = new Uint8Array(ciphertext)
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv, 0)
  out.set(ct, iv.length)
  return toBase64(out)
}

export async function decryptCart(payload: string): Promise<any | null> {
  try {
    const bytes = fromBase64(payload)
    if (bytes.length < 13) return null
    const iv = bytes.slice(0, 12)
    const ct = bytes.slice(12)
    const key = await getKey(getCartSecret())
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    const json = textDecoder.decode(plaintext)
    return JSON.parse(json)
  } catch {
    return null
  }
}
