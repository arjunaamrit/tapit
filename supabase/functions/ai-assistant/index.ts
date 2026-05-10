import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Simple in-memory rate limiter (per user, 30 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function stripCodeBlock(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

function safeParseJSON(text: string, fallbackKey: string): Record<string, any> {
  const cleaned = stripCodeBlock(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    return { [fallbackKey]: cleaned };
  }
}

async function callAI(messages: { role: string; content: string }[], stream = false) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      stream,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: "Rate limits exceeded, please try again later." };
    if (response.status === 402) throw { status: 402, message: "Payment required, please add funds." };
    const t = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${t}`);
  }

  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const json = (obj: unknown, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (action === "define") {
      const { word, context } = body;
      const resp = await callAI([
        { role: "system", content: "You are a dictionary assistant. Return JSON with a 'definition' field." },
        { role: "user", content: `Define the word "${word}" as used in this context: "${context}". Provide a clear, concise definition. Return JSON: {"definition": "..."}` },
      ]);
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      return json(safeParseJSON(text, "definition"));
    }

    if (action === "more-info") {
      const { word, context } = body;
      const resp = await callAI([
        { role: "system", content: "You provide detailed information about words. Return JSON with an 'info' field." },
        { role: "user", content: `Provide detailed information about "${word}" as used in: "${context}". Keep it ~129 words. Return JSON: {"info": "..."}` },
      ]);
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      return json(safeParseJSON(text, "info"));
    }

    if (action === "explain") {
      const { sentence, context } = body;
      const resp = await callAI([
        { role: "system", content: "You explain sentences contextually. Return JSON with an 'explanation' field." },
        { role: "user", content: `Explain this sentence contextually:\nSENTENCE: "${sentence}"\nCONTEXT: "${context}"\nReturn JSON: {"explanation": "..."}` },
      ]);
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      return json(safeParseJSON(text, "explanation"));
    }

    if (action === "translate") {
      const { text: inputText, targetLanguageName } = body;
      const resp = await callAI([
        { role: "system", content: "You are a translator. Return JSON with a 'translation' field." },
        { role: "user", content: `Translate to ${targetLanguageName}: "${inputText}". Return JSON: {"translation": "..."}` },
      ]);
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      return json(safeParseJSON(text, "translation"));
    }

    if (action === "search") {
      const { query } = body;
      const resp = await callAI([
        { role: "system", content: "You are a knowledgeable assistant. Provide a comprehensive summary answering the query. Return JSON: {\"summary\": \"...\", \"sources\": []}" },
        { role: "user", content: query },
      ]);
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const result = safeParseJSON(text, "summary");
      if (!result.sources) result.sources = [];
      return json(result);
    }

    if (action === "chat") {
      const { question, documentContent, conversationHistory } = body;
      const messages = [
        {
          role: "system",
          content: `You are a helpful assistant that answers questions about the following document:\n\nDOCUMENT CONTENT:\n${documentContent?.slice(0, 50000)}\n\nUse the document content to answer the user's questions. If the answer is not in the document, say so.`,
        },
        ...(conversationHistory || []).map((msg: any) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
        { role: "user", content: question },
      ];

      const response = await callAI(messages, true);
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("ai-assistant error:", e);
    const status = e.status || 500;
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
