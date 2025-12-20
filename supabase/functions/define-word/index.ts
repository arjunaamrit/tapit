import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, context } = await req.json();
    
    if (!word) {
      return new Response(
        JSON.stringify({ error: 'No word provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Defining word:', word, 'with context:', context?.substring(0, 100));

    const systemPrompt = `You are a helpful dictionary assistant. When given a word and its surrounding context, provide a clear, precise, and contextually relevant definition. 

Rules:
- Keep definitions concise (2-3 sentences max)
- If the word has multiple meanings, use the context to determine the most relevant one
- Include the part of speech (noun, verb, adjective, etc.)
- If it's a technical term, explain it in simple language
- Format: "[Part of speech] - [Definition]"`;

    const userPrompt = context 
      ? `Define the word "${word}" as used in this context: "...${context}..."`
      : `Define the word "${word}"`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to get definition from AI');
    }

    const data = await response.json();
    const definition = data.choices?.[0]?.message?.content;

    if (!definition) {
      throw new Error('No definition received from AI');
    }

    console.log('Definition generated for:', word);

    return new Response(
      JSON.stringify({ 
        success: true, 
        word,
        definition: definition.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error defining word:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to define word' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
