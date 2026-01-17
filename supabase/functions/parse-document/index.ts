import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum text length to return to the client.
// NOTE: We also stop PDF extraction early once we reach this budget to avoid WORKER_LIMIT timeouts.
const MAX_TEXT_LENGTH = 500000;

// Hard cap on how many PDF pages we try to process in an Edge/worker environment.
const MAX_PDF_PAGES = 50;

function truncateText(text: string, maxLength: number): { text: string; truncated: boolean } {
  if (text.length <= maxLength) {
    return { text, truncated: false };
  }

  // Try to truncate at a sentence or paragraph boundary
  const truncated = text.slice(0, maxLength);
  const lastParagraph = truncated.lastIndexOf('\n\n');
  const lastSentence = truncated.lastIndexOf('. ');

  let cutPoint = maxLength;
  if (lastParagraph > maxLength * 0.8) {
    cutPoint = lastParagraph;
  } else if (lastSentence > maxLength * 0.8) {
    cutPoint = lastSentence + 1;
  }

  return {
    text:
      truncated.slice(0, cutPoint) +
      '\n\n[Document truncated - showing first portion only due to size limits]',
    truncated: true,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let text = '';
    const fileName = file.name.toLowerCase();

    // Handle different file types
    if (fileName.endsWith('.txt') || file.type === 'text/plain') {
      text = new TextDecoder().decode(uint8Array);
    } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown') || file.type === 'text/markdown') {
      text = new TextDecoder().decode(uint8Array);
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm') || file.type === 'text/html') {
      // Simple HTML -> text extraction (server-side)
      const html = new TextDecoder().decode(uint8Array);
      text = extractTextFromHtml(html);
    } else if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      text = await extractTextFromPDF(uint8Array);
    } else if (
      fileName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await extractTextFromDocx(arrayBuffer);
    } else if (fileName.endsWith('.rtf') || file.type === 'application/rtf' || file.type === 'text/rtf') {
      const rtf = new TextDecoder().decode(uint8Array);
      text = extractTextFromRtf(rtf);
    } else if (fileName.endsWith('.epub') || file.type === 'application/epub+zip') {
      text = await extractTextFromEpub(arrayBuffer);
    } else {
      try {
        text = new TextDecoder().decode(uint8Array);
      } catch {
        return new Response(
          JSON.stringify({
            error:
              'Unsupported file format. Please upload PDF, DOCX, EPUB, RTF, HTML, Markdown, or TXT files.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Could not extract text from file. The file might be empty or in an unsupported format.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate if too large (also applies to non-PDF types)
    const { text: finalText, truncated } = truncateText(text.trim(), MAX_TEXT_LENGTH);

    console.log(
      'Extracted text length:',
      text.length,
      'Final length:',
      finalText.length,
      'Truncated:',
      truncated
    );

    return new Response(
      JSON.stringify({
        success: true,
        text: finalText,
        fileName: file.name,
        wordCount: finalText.split(/\s+/).filter((w) => w.length > 0).length,
        truncated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error parsing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse document';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractTextFromHtml(html: string): string {
  // Remove scripts/styles then strip tags.
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const text = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

function extractTextFromRtf(rtf: string): string {
  // Lightweight RTF -> text converter.
  const stripped = rtf
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, (m) => {
      const hex = m.slice(2);
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped;
}

async function extractTextFromEpub(data: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(data);

    const htmlFileNames = Object.keys(zip.files)
      .filter((name) => {
        const lower = name.toLowerCase();
        return (
          (lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm')) &&
          !lower.startsWith('meta-inf/')
        );
      })
      .sort((a, b) => a.localeCompare(b));

    if (htmlFileNames.length === 0) {
      console.log('No HTML/XHTML content found in EPUB');
      return '';
    }

    const parts: string[] = [];
    for (const name of htmlFileNames) {
      try {
        const content = await zip.file(name)?.async('string');
        if (content) {
          const t = extractTextFromHtml(content);
          if (t) parts.push(t);
        }
      } catch (e) {
        console.error('EPUB extract error for file:', name, e);
      }
    }

    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (error) {
    console.error('Error extracting EPUB text:', error);
    return '';
  }
}

async function extractTextFromPDF(data: Uint8Array): Promise<string> {
  const startedAt = Date.now();

  try {
    console.log('Starting PDF extraction (page-limited) with unpdf...');

    const pdf: any = await getDocumentProxy(data);
    const totalPages: number = typeof pdf?.numPages === 'number' ? pdf.numPages : 0;
    const targetPages = Math.min(totalPages || MAX_PDF_PAGES, MAX_PDF_PAGES);

    const parts: string[] = [];
    let extractedChars = 0;
    let pagesProcessed = 0;

    for (let i = 1; i <= targetPages; i++) {
      const page: any = await pdf.getPage(i);
      const textContent: any = await page.getTextContent();

      const pageText = (textContent?.items ?? [])
        .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        parts.push(pageText);
        extractedChars += pageText.length;
      }

      pagesProcessed = i;

      // Cleanup if available
      try {
        page.cleanup?.();
      } catch {
        // ignore
      }

      // Stop early once we have enough text to avoid worker CPU/memory limits.
      if (extractedChars >= MAX_TEXT_LENGTH) {
        break;
      }
    }

    const combined = parts.join('\n\n').trim();

    console.log(
      'PDF extraction complete:',
      {
        totalPages,
        pagesProcessed,
        extractedChars: combined.length,
        ms: Date.now() - startedAt,
      }
    );

    return combined;
  } catch (error) {
    console.error('Error in PDF extraction with unpdf (page-limited):', error);
    // Fallback to basic extraction if unpdf fails
    return extractTextFromPDFFallback(data);
  }
}

function extractTextFromPDFFallback(data: Uint8Array): string {
  console.log('Using fallback PDF extraction...');
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(data);

  const textParts: string[] = [];

  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;

  while ((match = btEtRegex.exec(content)) !== null) {
    const textBlock = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
      textParts.push(tjMatch[1]);
    }

    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(textBlock)) !== null) {
      const items = tjArrayMatch[1].match(/\(([^)]*)\)/g);
      if (items) {
        items.forEach((item) => {
          textParts.push(item.slice(1, -1));
        });
      }
    }
  }

  let result = textParts.join(' ');

  result = result
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(data);

    // Get the main document.xml file
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      console.log('No document.xml found in DOCX');
      return '';
    }

    const xmlContent = await documentXml.async('string');
    console.log('Document XML length:', xmlContent.length);

    const textParts: string[] = [];

    // Extract text from <w:t> tags (Word text elements)
    const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;

    while ((match = wtRegex.exec(xmlContent)) !== null) {
      if (match[1]) {
        textParts.push(match[1]);
      }
    }

    // Handle paragraph breaks - look for </w:p> to add line breaks
    let result = '';
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;

    while ((match = paragraphRegex.exec(xmlContent)) !== null) {
      const paragraphContent = match[1];
      const paragraphTexts: string[] = [];

      const innerWtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let innerMatch;

      while ((innerMatch = innerWtRegex.exec(paragraphContent)) !== null) {
        if (innerMatch[1]) {
          paragraphTexts.push(innerMatch[1]);
        }
      }

      if (paragraphTexts.length > 0) {
        result += paragraphTexts.join('') + '\n';
      }
    }

    // If paragraph parsing didn't work, fall back to simple text extraction
    if (result.trim().length === 0 && textParts.length > 0) {
      result = textParts.join(' ');
    }

    return result.replace(/\n{3,}/g, '\n\n').trim();
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return '';
  }
}
