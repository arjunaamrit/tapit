import { useCallback, useRef, useState, useEffect } from 'react';
import { AnnotationToolbar } from './AnnotationToolbar';
import { NoteDialog } from './NoteDialog';
import { HighlightColor, Highlight, AnnotationState } from '@/hooks/useAnnotations';
import { cn } from '@/lib/utils';

interface EnhancedDocumentViewerProps {
  text: string;
  annotations: AnnotationState;
  onWordSelect: (word: string, context: string, rect: DOMRect) => void;
  onAddHighlight: (text: string, startOffset: number, endOffset: number, color: HighlightColor) => void;
  onAddNote: (content: string, position: number, highlightId?: string) => void;
  onAddBookmark: (paragraphIndex: number, label: string) => void;
  fontSize: number;
  lineHeight: number;
}

const highlightColorClasses: Record<HighlightColor, string> = {
  yellow: 'highlight-yellow',
  green: 'highlight-green',
  blue: 'highlight-blue',
  pink: 'highlight-pink',
};

export const EnhancedDocumentViewer = ({
  text,
  annotations,
  onWordSelect,
  onAddHighlight,
  onAddNote,
  onAddBookmark,
  fontSize,
  lineHeight,
}: EnhancedDocumentViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);

  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate offsets within the full text
    let startOffset = 0;
    let endOffset = 0;
    
    // Simple offset calculation based on position in text
    const textLower = text.toLowerCase();
    const selectedLower = selectedText.toLowerCase();
    startOffset = textLower.indexOf(selectedLower);
    endOffset = startOffset + selectedText.length;

    setSelectedRange({
      text: selectedText,
      startOffset,
      endOffset,
    });

    setToolbarPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });

    setShowToolbar(true);
  }, [text]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    
    if (!selectedText) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeText = node.textContent || '';
          let start = range.startOffset;
          let end = range.startOffset;
          
          while (start > 0 && /\w/.test(nodeText[start - 1])) start--;
          while (end < nodeText.length && /\w/.test(nodeText[end])) end++;
          
          if (start < end) {
            range.setStart(node, start);
            range.setEnd(node, end);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }

    const word = selection.toString().trim();
    if (!word || word.length < 2 || !/^[a-zA-Z'-]+$/.test(word)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const fullText = text;
    const wordLower = word.toLowerCase();
    const textLower = fullText.toLowerCase();
    const wordIndex = textLower.indexOf(wordLower);
    
    let context = '';
    if (wordIndex !== -1) {
      const contextStart = Math.max(0, wordIndex - 50);
      const contextEnd = Math.min(fullText.length, wordIndex + word.length + 50);
      context = fullText.slice(contextStart, contextEnd);
    }

    onWordSelect(word, context, rect);
  }, [text, onWordSelect]);

  const handleHighlight = useCallback((color: HighlightColor) => {
    if (!selectedRange) return;
    onAddHighlight(
      selectedRange.text,
      selectedRange.startOffset,
      selectedRange.endOffset,
      color
    );
    setShowToolbar(false);
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, onAddHighlight]);

  const handleAddNote = useCallback(() => {
    setShowToolbar(false);
    setShowNoteDialog(true);
  }, []);

  const handleSaveNote = useCallback((content: string) => {
    if (!selectedRange) return;
    onAddNote(content, selectedRange.startOffset);
    setShowNoteDialog(false);
    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, onAddNote]);

  const handleAddBookmark = useCallback(() => {
    onAddBookmark(currentParagraphIndex, `Paragraph ${currentParagraphIndex + 1}`);
    setShowToolbar(false);
    window.getSelection()?.removeAllRanges();
  }, [currentParagraphIndex, onAddBookmark]);

  const handleCloseToolbar = useCallback(() => {
    setShowToolbar(false);
    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Apply highlights to text
  const renderParagraphWithHighlights = (paragraph: string, paragraphIndex: number) => {
    // For now, render plain text with potential to add highlight markers
    const isBookmarked = annotations.bookmarks.some(
      b => b.paragraphIndex === paragraphIndex
    );

    return (
      <p
        key={paragraphIndex}
        id={`paragraph-${paragraphIndex}`}
        className={cn(
          'mb-6 leading-relaxed transition-colors',
          isBookmarked && 'border-l-4 border-primary pl-4 -ml-4'
        )}
        style={{ fontSize: `${fontSize}px`, lineHeight }}
        onMouseEnter={() => setCurrentParagraphIndex(paragraphIndex)}
      >
        {paragraph.split('\n').map((line, lineIndex) => (
          <span key={lineIndex}>
            {line}
            {lineIndex < paragraph.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className="reader-card p-8 md:p-12 min-h-[60vh] reader-prose select-text cursor-text"
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {paragraphs.map((paragraph, index) => 
          renderParagraphWithHighlights(paragraph, index)
        )}
      </div>

      <AnnotationToolbar
        position={toolbarPosition}
        onHighlight={handleHighlight}
        onAddNote={handleAddNote}
        onAddBookmark={handleAddBookmark}
        onClose={handleCloseToolbar}
        hasSelection={showToolbar}
      />

      <NoteDialog
        open={showNoteDialog}
        onClose={() => setShowNoteDialog(false)}
        onSave={handleSaveNote}
        selectedText={selectedRange?.text}
      />
    </>
  );
};
