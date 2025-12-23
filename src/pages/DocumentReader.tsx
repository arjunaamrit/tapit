import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  FileText, 
  X, 
  Sparkles,
  BookOpen,
  Lightbulb,
  MousePointer2,
  Upload,
  Zap,
  Volume2,
  ArrowRight
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
  const navigate = useNavigate();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    {
      icon: MousePointer2,
      title: "Tap to Define",
      description: "Double-click any word to get AI-powered contextual definitions instantly. Even define words within definitions!",
      color: "from-primary/20 to-primary/5"
    },
    {
      icon: Lightbulb,
      title: "Smart Annotations",
      description: "Highlight text in multiple colors, add notes, and bookmark important passages for easy reference later.",
      color: "from-accent/20 to-accent/5"
    },
    {
      icon: FileText,
      title: "Universal Format Support",
      description: "PDF, Word, EPUB, Text, Markdown, HTML, and RTF - we handle them all seamlessly.",
      color: "from-primary/20 to-accent/5"
    },
    {
      icon: Volume2,
      title: "Text-to-Speech",
      description: "Listen to your documents with natural-sounding speech. Perfect for multitasking or accessibility.",
      color: "from-accent/20 to-primary/5"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xl font-display font-bold">ReadMate</span>
              </Link>
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
                  <Button variant="outline" size="sm" onClick={handleClearDocument} className="gap-2">
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">New Document</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {!documentText ? (
        <main className="relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="glow-orb w-96 h-96 bg-primary/30 -top-48 -right-48" />
            <div className="glow-orb w-80 h-80 bg-accent/20 top-1/3 -left-40 animation-delay-300" />
            <div className="glow-orb w-64 h-64 bg-primary/20 bottom-20 right-1/4" />
          </div>

          {/* Hero Section */}
          <section className="relative container mx-auto px-4 py-20 lg:py-32">
            <div className="max-w-5xl mx-auto text-center">
              <div className="animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                  <Sparkles className="h-4 w-4" />
                  AI-Powered Reading Assistant
                </div>
              </div>
              
              <h1 className="animate-fade-in-up animation-delay-150 text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
                Read <span className="text-gradient">Smarter</span>,
                <br />Learn <span className="text-gradient">Faster</span>
              </h1>
              
              <p className="animate-fade-in-up animation-delay-300 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
                Transform any document into an interactive learning experience. 
                Get instant definitions, annotate with ease, and listen to your content.
              </p>

              <div className="animate-fade-in-up animation-delay-450 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Button 
                  size="lg" 
                  className="gap-2 px-8 py-6 text-lg rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Upload className="h-5 w-5" />
                  Upload Document
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 px-8 py-6 text-lg rounded-2xl"
                  onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Mock Preview */}
              <div className="animate-fade-in-up animation-delay-600 relative max-w-4xl mx-auto">
                <div className="glass-card rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-accent/60" />
                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                    <span className="ml-4 text-sm text-muted-foreground">sample-document.pdf</span>
                  </div>
                  <div className="bg-reader-bg rounded-2xl p-6 text-left reader-prose text-reader-text">
                    <p className="text-lg mb-4">
                      The concept of <span className="bg-primary/20 px-1 rounded cursor-pointer border-b-2 border-primary">artificial intelligence</span> has 
                      evolved significantly over the decades, transforming from theoretical 
                      discussions into <span className="highlight-yellow px-1 rounded">practical applications</span> that 
                      impact our daily lives...
                    </p>
                    <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-card rounded-xl shadow-lg border border-border">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Definition appears here</span>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 md:-right-8 animate-float">
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl shadow-lg text-sm font-medium">
                    ✨ Double-tap any word
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 md:-left-8 animate-float-delayed">
                  <div className="bg-accent text-accent-foreground px-4 py-2 rounded-xl shadow-lg text-sm font-medium">
                    📝 Add notes & highlights
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features-section" className="relative container mx-auto px-4 py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Everything You Need to Read Better
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Powerful features designed to enhance comprehension and make reading more productive.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="feature-card group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Upload Section */}
          <section id="upload-section" className="relative container mx-auto px-4 py-20">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Start Reading Now
                </h2>
                <p className="text-muted-foreground">
                  Drop your document and experience the difference.
                </p>
              </div>

              <EnhancedDocumentUploader 
                onDocumentParsed={handleDocumentParsed}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
              
              <p className="text-center text-sm text-muted-foreground mt-6">
                Supports PDF, Word (.docx), EPUB, TXT, Markdown, HTML, and RTF files
              </p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="relative container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto glass-card rounded-3xl p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Ready to Transform Your Reading?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of learners who read smarter with ReadMate.
              </p>
              <Button 
                size="lg" 
                className="gap-2 px-8 py-6 text-lg rounded-2xl shadow-lg shadow-primary/25"
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Upload className="h-5 w-5" />
                Get Started Free
              </Button>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-border/40 py-8">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>© 2024 ReadMate. Built with ❤️ for learners everywhere.</p>
            </div>
          </footer>
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
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm text-muted-foreground">
                  <MousePointer2 className="h-4 w-4" />
                  Double-click any word for its definition
                </div>
              </div>
              
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
