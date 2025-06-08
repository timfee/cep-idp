export interface ApiClientOptions {
  base: string
  token?: string
}

export class ApiClient {
  constructor(private opts: ApiClientOptions) {}

  async request(path: string, init: RequestInit = {}) {
    const url = `${this.opts.base}${path}`
    const headers = new Headers(init.headers)
    if (this.opts.token) {
      headers.set('Authorization', this.opts.token)
    }
    const res = await fetch(url, { ...init, headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Request failed: ${res.status} ${text}`)
    }
    return res.json()
  }
}
