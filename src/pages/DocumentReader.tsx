import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  X, 
  Sparkles,
  BookOpen,
  Lightbulb,
  MousePointer2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAnnotations } from "@/hooks/useAnnotations";
import EnhancedDocumentUploader from "@/components/reader/EnhancedDocumentUploader";
import { EnhancedDocumentViewer } from "@/components/reader/EnhancedDocumentViewer";
import { ReaderSidebar } from "@/components/reader/ReaderSidebar";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import WordDefinitionPopover from "@/components/WordDefinitionPopover";

const DocumentReader = () => {
  const { toast } = useToast();
  const [documentText, setDocumentText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordContext, setWordContext] = useState<string>("");
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [showPopover, setShowPopover] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    annotations,
    addHighlight,
    removeHighlight,
    addNote,
    removeNote,
    addBookmark,
    removeBookmark,
    exportAnnotations,
  } = useAnnotations();

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeak = () => {
    if (!documentText) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(documentText);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      toast({ title: "Speech error", description: "Failed to read document", variant: "destructive" });
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleDocumentParsed = (text: string, name: string) => {
    setDocumentText(text);
    setFileName(name);
    setShowPopover(false);
    setSelectedWord(null);
  };

  const handleWordSelect = useCallback((word: string, context: string, rect: DOMRect) => {
    setSelectedWord(word);
    setWordContext(context);
    setPopoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    });
    setShowPopover(true);
  }, []);

  const handleClosePopover = () => {
    setShowPopover(false);
    setSelectedWord(null);
  };

  const handleClearDocument = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setDocumentText("");
    setFileName("");
    setShowPopover(false);
    setSelectedWord(null);
  };

  const handleExportAnnotations = () => {
    const data = exportAnnotations();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}-annotations.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Annotations exported successfully" });
  };

  const handleJumpToBookmark = (paragraphIndex: number) => {
    const element = document.getElementById(`paragraph-${paragraphIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleJumpToHighlight = (startOffset: number) => {
    // Simple scroll to top for now - could be enhanced with more precise positioning
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Document Reader</h1>
                  {documentText && (
                    <p className="text-xs text-muted-foreground hidden sm:block">{fileName}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {documentText && (
                <>
                  <ReaderToolbar
                    isSpeaking={isSpeaking}
                    isPaused={isPaused}
                    onSpeak={handleSpeak}
                    onPause={handlePause}
                    onStop={handleStop}
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    lineHeight={lineHeight}
                    onLineHeightChange={setLineHeight}
                    onExportAnnotations={handleExportAnnotations}
                  />
                  <Button variant="outline" size="sm" onClick={handleClearDocument}>
                    <X className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {!documentText ? (
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                AI-Powered Reading Assistant
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Read Smarter, Learn Faster
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Upload any document and get instant word definitions, annotations, 
                and text-to-speech capabilities.
              </p>
            </div>

            <EnhancedDocumentUploader 
              onDocumentParsed={handleDocumentParsed}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />

            {/* Features Grid */}
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MousePointer2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Tap to Define</h3>
                <p className="text-sm text-muted-foreground">
                  Double-click any word to get AI-powered contextual definitions instantly.
                </p>
              </div>
              
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Highlight & Annotate</h3>
                <p className="text-sm text-muted-foreground">
                  Mark important passages with colors, add notes, and create bookmarks.
                </p>
              </div>
              
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Multiple Formats</h3>
                <p className="text-sm text-muted-foreground">
                  Support for PDF, Word, EPUB, Text, Markdown, HTML, and RTF documents.
                </p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex h-[calc(100vh-64px)]">
          {/* Sidebar */}
          <ReaderSidebar
            annotations={annotations}
            onJumpToBookmark={handleJumpToBookmark}
            onJumpToHighlight={handleJumpToHighlight}
            onRemoveBookmark={removeBookmark}
            onRemoveHighlight={removeHighlight}
            onRemoveNote={removeNote}
            fileName={fileName}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Double-click any word for its definition • Select text for annotation options
              </p>
              
              <EnhancedDocumentViewer 
                text={documentText} 
                annotations={annotations}
                onWordSelect={handleWordSelect}
                onAddHighlight={addHighlight}
                onAddNote={addNote}
                onAddBookmark={addBookmark}
                fontSize={fontSize}
                lineHeight={lineHeight}
              />
            </div>
          </main>
        </div>
      )}

      {showPopover && selectedWord && (
        <WordDefinitionPopover
          word={selectedWord}
          context={wordContext}
          position={popoverPosition}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
};

export default DocumentReader;
