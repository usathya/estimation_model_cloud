interface Env {
  GEMINI_API_KEY?: string
  DEEPSEEK_API_KEY?: string
  GROQ_API_KEY?: string
  AI?: any
}

interface AiRequest {
  contents: string
  systemPrompt?: string
  responseMimeType?: string
  responseSchema?: any
  temperature?: number
}

interface AiResult {
  text: string
  provider: string
}

type ProviderId = 'gemini' | 'deepseek' | 'groq'

const GEMINI_DAILY_LIMIT = 1500
const DEEPSEEK_DAILY_LIMIT = 500
const GROQ_DAILY_LIMIT = 14400

async function fetchGemini(env: Env, req: AiRequest): Promise<AiResult> {
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`
  
  const body: any = {
    contents: [{ parts: [{ text: req.contents }] }],
    generationConfig: {
      temperature: req.temperature ?? 0.1
    }
  }
  
  if (req.systemPrompt) {
    body.systemInstruction = { parts: [{ text: req.systemPrompt }] }
  }
  
  if (req.responseMimeType === 'application/json') {
    body.generationConfig.responseMimeType = 'application/json'
    if (req.responseSchema) {
      body.generationConfig.responseSchema = req.responseSchema
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const data: any = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return { text, provider: 'gemini' }
}

async function fetchOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  req: AiRequest,
  providerName: ProviderId
): Promise<AiResult> {
  const messages: any[] = []
  if (req.systemPrompt) {
    messages.push({ role: 'system', content: req.systemPrompt })
  }
  messages.push({ role: 'user', content: req.contents })

  const body: any = {
    model,
    messages,
    temperature: req.temperature ?? 0.1
  }

  if (req.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`${providerName} API error ${res.status}: ${errText}`)
  }

  const data: any = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  return { text, provider: providerName }
}

function fetchDeepSeek(env: Env, req: AiRequest): Promise<AiResult> {
  return fetchOpenAiCompatible('https://api.deepseek.com', env.DEEPSEEK_API_KEY!, 'deepseek-chat', req, 'deepseek')
}

function fetchGroq(env: Env, req: AiRequest): Promise<AiResult> {
  return fetchOpenAiCompatible('https://api.groq.com/openai', env.GROQ_API_KEY!, 'llama-3.3-70b-versatile', req, 'groq')
}

async function checkUsage(env: Env): Promise<{ gemini: number; deepseek: number; groq: number }> {
  return { gemini: 0, deepseek: 0, groq: 0 }
}

export async function callAI(env: Env, req: AiRequest, usageCheck?: { gemini: number; deepseek: number; groq: number }): Promise<AiResult> {
  const usage = usageCheck || await checkUsage(env)
  const errors: string[] = []

  if (env.GEMINI_API_KEY && usage.gemini < GEMINI_DAILY_LIMIT) {
    try {
      return await fetchGemini(env, req)
    } catch (err: any) {
      errors.push(`Gemini: ${err.message}`)
    }
  }

  if (env.DEEPSEEK_API_KEY && usage.deepseek < DEEPSEEK_DAILY_LIMIT) {
    try {
      return await fetchDeepSeek(env, req)
    } catch (err: any) {
      errors.push(`DeepSeek: ${err.message}`)
    }
  }

  if (env.GROQ_API_KEY && usage.groq < GROQ_DAILY_LIMIT) {
    try {
      return await fetchGroq(env, req)
    } catch (err: any) {
      errors.push(`Groq: ${err.message}`)
    }
  }

  throw new Error(`All AI providers failed: ${errors.join('; ')}`)
}
