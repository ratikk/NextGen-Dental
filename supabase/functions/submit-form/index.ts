```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json()
    const { formType, data } = body

    // Validate input
    if (!formType || !data) {
      throw new Error('Missing required fields')
    }

    // Store form submission
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .insert([
        { 
          form_type: formType,
          data: data,
          ip_address: req.headers.get('x-real-ip')
        }
      ])
      .select()
      .single()

    if (error) throw error

    // Send email notification (implement with your preferred email service)
    
    return new Response(
      JSON.stringify({ success: true, data: submission }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
```