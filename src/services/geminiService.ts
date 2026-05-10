import { supabase } from "@/integrations/supabase/client";
import { getAuthToken } from "@/lib/auth-helpers";

export interface Source {
  url: string;
  title: string;
}

export interface SearchResult {
  summary: string;
  sources: Source[];
}

async function callAI(action: string, payload: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { action, ...payload },
  });

  if (error) {
    console.error(`AI ${action} error:`, error);
    throw new Error(error.message || `AI ${action} failed`);
  }

  return data;
}

export async function defineWord(word: string, context: string) {
  const data = await callAI("define", { word, context });
  return {
    success: !!data.definition,
    definition: data.definition || "Definition not found.",
  };
}

export async function getMoreInfo(word: string, context: string) {
  const data = await callAI("more-info", { word, context });
  return {
    success: !!data.info,
    info: data.info || "No additional information found.",
  };
}

export async function explainSentence(sentence: string, context: string) {
  const data = await callAI("explain", { sentence, context });
  return {
    success: !!data.explanation,
    explanation: data.explanation || "Explanation not found.",
  };
}

export async function translateText(text: string, targetLanguageName: string) {
  const data = await callAI("translate", { text, targetLanguageName });
  return { translation: data.translation || "Translation failed." };
}

export async function searchAndSummarize(query: string): Promise<SearchResult> {
  const data = await callAI("search", { query });
  return {
    summary: data.summary || "No summary available.",
    sources: data.sources || [],
  };
}

export async function* chatWithDocumentStream(
  question: string,
  documentContent: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
) {
  const token = await getAuthToken();
  if (!token) throw new Error("You must be signed in to chat.");

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      action: "chat",
      question,
      documentContent,
      conversationHistory,
    }),
  });

  if (!resp.ok || !resp.body) {
    const errorText = await resp.text();
    throw new Error(`Chat failed: ${errorText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") return;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) yield content;
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }
}
