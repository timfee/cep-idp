import { randomBytes } from 'crypto'

export type Variables = Record<string, unknown>

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function substitute<T>(input: T, vars: Variables): T {
  if (typeof input === 'string') {
    return input.replace(/\{([^}]+)\}/g, (_, key) => {
      const val = getPath(vars, key)
      return val !== undefined ? String(val) : ''
    }) as T
  }
  if (Array.isArray(input)) {
    return input.map((v) => substitute(v, vars)) as T
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) {
      out[k] = substitute(v, vars)
    }
    return out as T
  }
  return input
}

export function randomPassword(length: number): string {
  const buf = randomBytes(length)
  return buf.toString('base64').slice(0, length)
}
