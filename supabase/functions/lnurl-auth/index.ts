import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const k1 = url.searchParams.get('k1')
    const sig = url.searchParams.get('sig')
    const key = url.searchParams.get('key')

    console.log('Request params:', { k1, sig: sig?.substring(0, 20), key: key?.substring(0, 20) })

    // 초기 요청 (QR 스캔 시) - sig, key 없이 k1만 있는 경우
    if (k1 && !sig && !key) {
      // 환경변수에서 callback URL 가져오기 (커스텀 도메인 지원)
      const callbackUrl = Deno.env.get('LNURL_CALLBACK_URL') || `${url.origin}${url.pathname}`

      const response = {
        tag: 'login',
        k1: k1,
        callback: callbackUrl,
        action: 'login',
      }
      console.log('Initial request response:', response)
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 서명 검증 요청
    if (!k1 || !sig || !key) {
      return new Response(JSON.stringify({ status: 'ERROR', reason: 'Missing parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 세션 확인
    const { data: session, error: sessionError } = await supabase
      .from('lnurl_auth_sessions')
      .select('*')
      .eq('k1', k1)
      .single()

    console.log('Session lookup:', { session, sessionError })

    if (sessionError || !session) {
      return new Response(JSON.stringify({ status: 'ERROR', reason: 'Session not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (session.status !== 'pending') {
      return new Response(JSON.stringify({ status: 'ERROR', reason: 'Session already used' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // TODO: 프로덕션에서는 secp256k1 서명 검증 필요
    // 현재는 서명 검증 생략하고 바로 인증 처리 (테스트용)

    // 세션 업데이트
    const { error: updateError } = await supabase
      .from('lnurl_auth_sessions')
      .update({ status: 'authenticated', linking_key: key })
      .eq('k1', k1)

    console.log('Update result:', { updateError })

    if (updateError) {
      return new Response(JSON.stringify({ status: 'ERROR', reason: 'Failed to update session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ status: 'OK' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ status: 'ERROR', reason: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
