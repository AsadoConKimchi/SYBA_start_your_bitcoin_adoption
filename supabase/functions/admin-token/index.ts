import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'create': {
        const { linking_key } = body

        if (!linking_key) {
          return jsonError('linking_key is required', 400)
        }

        // 어드민 linking_key 검증
        const allowedKeys = (Deno.env.get('ADMIN_LINKING_KEYS') ?? '').split(',').map(k => k.trim())
        if (!allowedKeys.includes(linking_key)) {
          return jsonError('Unauthorized: not an admin', 403)
        }

        // 32바이트 랜덤 토큰 생성
        const tokenBytes = new Uint8Array(32)
        crypto.getRandomValues(tokenBytes)
        const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

        // DB에 저장
        const { error } = await supabase
          .from('admin_tokens')
          .insert({
            token,
            linking_key,
            used: false,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5분 만료
          })

        if (error) {
          console.error('Token insert error:', error)
          return jsonError('Failed to create token', 500)
        }

        return jsonOk({ token })
      }

      case 'verify': {
        const { token } = body

        if (!token) {
          return jsonError('token is required', 400)
        }

        // 토큰 조회 — 미사용 + 미만료
        const { data: tokenRow, error } = await supabase
          .from('admin_tokens')
          .select('*')
          .eq('token', token)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .single()

        if (error || !tokenRow) {
          return jsonOk({ valid: false, reason: 'Invalid or expired token' })
        }

        // 일회용 소모 — used = true
        await supabase
          .from('admin_tokens')
          .update({ used: true })
          .eq('id', tokenRow.id)

        return jsonOk({ valid: true, linking_key: tokenRow.linking_key })
      }

      default:
        return jsonError(`Unknown action: ${action}`, 400)
    }
  } catch (e) {
    console.error('admin-token error:', e)
    return jsonError('Internal server error', 500)
  }
})

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
