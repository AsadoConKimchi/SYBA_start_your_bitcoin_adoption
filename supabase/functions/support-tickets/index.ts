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
    const { action, userId, ...params } = body

    // 사용자 검증
    if (!userId) {
      return jsonError('userId is required', 400)
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, display_id, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return jsonError('User not found', 404)
    }

    switch (action) {
      case 'create_ticket': {
        // Rate limit: 5 tickets/day
        const { count } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())

        if ((count ?? 0) >= 5) {
          return jsonError('Daily ticket limit reached (max 5)', 429)
        }

        const { category, subject, message } = params
        if (!category || !subject || !message) {
          return jsonError('category, subject, and message are required', 400)
        }

        // 티켓 생성
        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: userId,
            display_id: user.display_id,
            user_email: user.email,
            category,
            subject,
            status: 'open',
            priority: 'normal',
          })
          .select()
          .single()

        if (ticketError || !ticket) {
          return jsonError('Failed to create ticket', 500)
        }

        // 초기 메시지 추가
        await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          sender_type: 'user',
          sender_id: userId,
          message,
        })

        // Discord 알림 (선택)
        const discordWebhook = Deno.env.get('DISCORD_ADMIN_WEBHOOK')
        if (discordWebhook) {
          fetch(discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🎫 새 티켓: [${category}] ${subject}\n유저: ${user.display_id ?? userId.slice(0, 8)}`,
            }),
          }).catch(() => {}) // fire and forget
        }

        return jsonSuccess(ticket)
      }

      case 'list_tickets': {
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(20)

        return jsonSuccess(tickets ?? [])
      }

      case 'get_ticket': {
        const { ticketId } = params
        if (!ticketId) return jsonError('ticketId is required', 400)

        // 본인 티켓인지 확인
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .eq('user_id', userId)
          .single()

        if (!ticket) return jsonError('Ticket not found', 404)

        const { data: messages } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })

        return jsonSuccess(messages ?? [])
      }

      case 'add_message': {
        const { ticketId, message } = params
        if (!ticketId || !message) {
          return jsonError('ticketId and message are required', 400)
        }

        // 본인 티켓인지 확인
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('id', ticketId)
          .eq('user_id', userId)
          .single()

        if (!ticket) return jsonError('Ticket not found', 404)

        // Rate limit: 20 messages/day
        const { count } = await supabase
          .from('ticket_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userId)
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())

        if ((count ?? 0) >= 20) {
          return jsonError('Daily message limit reached (max 20)', 429)
        }

        const { data: msg, error: msgError } = await supabase
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            sender_type: 'user',
            sender_id: userId,
            message,
          })
          .select()
          .single()

        if (msgError) return jsonError('Failed to add message', 500)

        return jsonSuccess(msg)
      }

      default:
        return jsonError(`Unknown action: ${action}`, 400)
    }
  } catch (error) {
    console.error('Support tickets error:', error)
    return jsonError('Internal server error', 500)
  }
})

function jsonSuccess(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
