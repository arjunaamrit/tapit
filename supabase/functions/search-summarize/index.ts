import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple function to extract text content from HTML
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Limit text length
  return text.substring(0, 5000);
}

// Fetch content from a URL
async function fetchUrlContent(url: string): Promise<{ url: string; title: string; content: string } | null> {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    
    // Extract content
    const content = extractTextFromHtml(html);
    
    return { url, title, content };
  } catch (error) {
    console.log(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Use DuckDuckGo HTML search to find URLs
async function searchForUrls(query: string): Promise<string[]> {
  try {
    console.log(`Searching for: ${query}`);
    
    // Use DuckDuckGo HTML search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`Search failed: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    
    // Extract URLs from search results
    const urlRegex = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/g;
    const urls: string[] = [];
    let match;
    
    while ((match = urlRegex.exec(html)) !== null && urls.length < 5) {
      try {
        const decodedUrl = decodeURIComponent(match[1]);
        if (decodedUrl.startsWith('http')) {
          urls.push(decodedUrl);
        }
      } catch (e) {
        console.log('Error decoding URL:', e);
      }
    }
    
    console.log(`Found ${urls.length} URLs`);
    return urls;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing search query: ${query}`);

    // Step 1: Search for URLs
    const urls = await searchForUrls(query);
    
    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: `No search results found for "${query}". Please try a different search term.`,
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch content from URLs
    const contentPromises = urls.map(url => fetchUrlContent(url));
    const results = await Promise.all(contentPromises);
    const validResults = results.filter(r => r !== null) as { url: string; title: string; content: string }[];

    if (validResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: `Found links but could not fetch their content. Please try again.`,
          sources: urls.map(url => ({ url, title: url }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully fetched ${validResults.length} pages`);

    // Step 3: Summarize using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const combinedContent = validResults.map((r, i) => 
      `Source ${i + 1} (${r.title}):\n${r.content}`
    ).join('\n\n---\n\n');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful research assistant. Summarize the following web content that was found for the search query "${query}". 
            
Provide a comprehensive but concise summary that:
1. Answers the user's search query directly
2. Synthesizes information from multiple sources
3. Highlights key facts and insights
4. Uses clear, easy-to-read formatting with bullet points where appropriate

Keep the summary informative but not too long (2-3 paragraphs max).`
          },
          {
            role: 'user',
            content: `Here is the content from ${validResults.length} web pages about "${query}":\n\n${combinedContent}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to generate summary');
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || 'Unable to generate summary.';

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({
        summary,
        sources: validResults.map(r => ({ url: r.url, title: r.title }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-summarize:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
