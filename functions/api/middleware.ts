import { Context, Next } from 'hono'

export async function corsMiddleware(c: Context, next: Next) {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    c.res = new Response(null, { status: 204 })
    return
  }
  await next()
}

export async function adminGuard(c: Context, next: Next) {
  const profile = c.get('userProfile')
  if (profile?.role !== 'admin') {
    c.res = new Response(JSON.stringify({ error: 'Access denied. Administrator privileges required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
    return
  }
  await next()
}
