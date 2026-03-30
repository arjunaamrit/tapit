import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FileText, 
  X, 
  Sparkles,
  BookOpen,
  Lightbulb,
  MousePointer2,
  Upload,
  Zap,
  Volume2,
  ArrowRight,
  LogOut,
  User,
  Loader2,
  Search,
  MessageSquare,
  HelpCircle,
  PanelLeft,
  FileTextIcon
} from "lucide-react";
import { SAMPLE_DOCUMENT } from "@/data/sampleDocument";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments, useDocumentAnnotations, Document } from "@/hooks/useDocuments";
import { useLocalDocuments, LocalDocument } from "@/hooks/useLocalDocuments";
import { useInDocumentSearch } from "@/hooks/useInDocumentSearch";
import EnhancedDocumentUploader from "@/components/reader/EnhancedDocumentUploader";
import { EnhancedDocumentViewer } from "@/components/reader/EnhancedDocumentViewer";
import { ReaderSidebar } from "@/components/reader/ReaderSidebar";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { DocumentLibraryDialog } from "@/components/reader/DocumentLibraryDialog";
import { InDocumentSearch } from "@/components/reader/InDocumentSearch";
import { DocumentChat } from "@/components/reader/DocumentChat";
import WordDefinitionPopover from "@/components/WordDefinitionPopover";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DocumentReader = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { saveDocument, updateDocumentFolder, documents, deleteDocument } = useDocuments();
  const { documents: localDocuments, addDocument: addLocalDocument, removeDocument: removeLocalDocument } = useLocalDocuments();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentLocalDocId, setCurrentLocalDocId] = useState<string | null>(null);
  
  const [documentText, setDocumentText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordContext, setWordContext] = useState<string>("");
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [showPopover, setShowPopover] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [speechRate, setSpeechRate] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // In-document search
  const {
    searchQuery: inDocSearchQuery,
    setSearchQuery: setInDocSearchQuery,
    matches: searchMatches,
    currentMatchIndex: currentSearchMatchIndex,
    goToNextMatch,
    goToPreviousMatch,
    isSearchOpen,
    openSearch,
    closeSearch,
  } = useInDocumentSearch(documentText);

  // Document chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Onboarding tour
  const { showOnboarding, closeOnboarding, openOnboarding } = useOnboardingTour();
  // Use database annotations when user is logged in and document is saved
  const {
    highlights: dbHighlights,
    notes: dbNotes,
    bookmarks: dbBookmarks,
    addHighlight: dbAddHighlight,
    removeHighlight: dbRemoveHighlight,
    addNote: dbAddNote,
    removeNote: dbRemoveNote,
    addBookmark: dbAddBookmark,
    removeBookmark: dbRemoveBookmark,
  } = useDocumentAnnotations(currentDocumentId);

  // Convert DB annotations to the format expected by the viewer
  const annotations = {
    highlights: dbHighlights.map(h => ({
      id: h.id,
      text: h.text,
      startOffset: h.start_offset,
      endOffset: h.end_offset,
      color: h.color as 'yellow' | 'green' | 'blue' | 'pink',
      createdAt: new Date(h.created_at),
    })),
    notes: dbNotes.map(n => ({
      id: n.id,
      highlightId: n.highlight_id || undefined,
      content: n.content,
      position: n.position,
      createdAt: new Date(n.created_at),
    })),
    bookmarks: dbBookmarks.map(b => ({
      id: b.id,
      paragraphIndex: b.paragraph_index,
      label: b.label,
      createdAt: new Date(b.created_at),
    })),
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Keyboard shortcut for search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && documentText) {
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [documentText, openSearch]);

  const handleSpeak = () => {
    if (!documentText) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(documentText);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    
    // Set voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0 && selectedVoice < voices.length) {
      utterance.voice = voices[selectedVoice];
    }
    
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

  const handleDocumentParsed = async (text: string, name: string) => {
    setDocumentText(text);
    setFileName(name);
    setShowPopover(false);
    setSelectedWord(null);
    
    // Save document to database if user is logged in, otherwise save locally
    if (user) {
      const doc = await saveDocument(name, 'text', text);
      if (doc) {
        setCurrentDocumentId(doc.id);
        setCurrentLocalDocId(null);
        setCurrentFolderId(doc.folder_id);
        toast({ title: "Document saved", description: "Your document has been saved to your account" });
      }
    } else {
      // Save to local storage for non-logged-in users
      const localDoc = addLocalDocument(name, text);
      setCurrentLocalDocId(localDoc.id);
      setCurrentDocumentId(null);
      toast({ title: "Document loaded", description: "Sign in to sync your documents across devices" });
    }
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
    setCurrentDocumentId(null);
    setCurrentLocalDocId(null);
    setShowPopover(false);
    setSelectedWord(null);
  };


  const handleSelectDocumentFromLibrary = (doc: Document) => {
    if (doc.content) {
      setDocumentText(doc.content);
      setFileName(doc.file_name);
      setCurrentDocumentId(doc.id);
      setCurrentLocalDocId(null);
      setCurrentFolderId(doc.folder_id);
    }
  };

  const handleSelectLocalDocument = (doc: LocalDocument) => {
    setDocumentText(doc.content);
    setFileName(doc.file_name);
    setCurrentLocalDocId(doc.id);
    setCurrentDocumentId(null);
    setCurrentFolderId(null);
  };

  const handleSelectAnyDocument = (doc: LocalDocument | Document) => {
    if ('folder_id' in doc) {
      handleSelectDocumentFromLibrary(doc as Document);
    } else {
      handleSelectLocalDocument(doc as LocalDocument);
    }
  };

  const handleDeleteDocumentFromLibrary = async (id: string) => {
    const success = await deleteDocument(id);
    if (success && currentDocumentId === id) {
      handleClearDocument();
    }
  };

  const handleDeleteLocalDocument = (id: string) => {
    removeLocalDocument(id);
    if (currentLocalDocId === id) {
      handleClearDocument();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Wrapper functions for annotations
  const handleAddHighlight = async (text: string, startOffset: number, endOffset: number, color: 'yellow' | 'green' | 'blue' | 'pink' = 'yellow') => {
    if (currentDocumentId) {
      const result = await dbAddHighlight(text, startOffset, endOffset, color);
      return result ? {
        id: result.id,
        text: result.text,
        startOffset: result.start_offset,
        endOffset: result.end_offset,
        color: result.color as 'yellow' | 'green' | 'blue' | 'pink',
        createdAt: new Date(result.created_at),
      } : null;
    }
    return null;
  };

  const handleAddNote = async (content: string, position: number, highlightId?: string) => {
    if (currentDocumentId) {
      const result = await dbAddNote(content, position, highlightId);
      return result ? {
        id: result.id,
        highlightId: result.highlight_id || undefined,
        content: result.content,
        position: result.position,
        createdAt: new Date(result.created_at),
      } : null;
    }
    return null;
  };

  const handleAddBookmark = async (paragraphIndex: number, label: string = '') => {
    if (currentDocumentId) {
      const result = await dbAddBookmark(paragraphIndex, label || `Bookmark ${annotations.bookmarks.length + 1}`);
      return result ? {
        id: result.id,
        paragraphIndex: result.paragraph_index,
        label: result.label,
        createdAt: new Date(result.created_at),
      } : null;
    }
    return null;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
    <div className="h-[100svh] bg-background flex flex-col">
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
            
            <div className="flex items-center gap-1 sm:gap-2 flex-nowrap overflow-x-auto">
              {user && documents.length > 0 && (
                <DocumentLibraryDialog
                  documents={documents}
                  currentDocumentId={currentDocumentId}
                  onSelectDocument={handleSelectDocumentFromLibrary}
                  onDeleteDocument={handleDeleteDocumentFromLibrary}
                />
              )}
              {documentText && (
                <>
                  <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 px-2 sm:px-3"
                        title="Open document sidebar"
                      >
                        <PanelLeft className="h-4 w-4" />
                        <span className="hidden md:inline">Library</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[18rem] sm:w-[20rem]">
                      <div className="h-[100dvh]">
                        <ReaderSidebar
                          annotations={annotations}
                          onJumpToBookmark={(i) => {
                            setIsSidebarOpen(false);
                            handleJumpToBookmark(i);
                          }}
                          onJumpToHighlight={(o) => {
                            setIsSidebarOpen(false);
                            handleJumpToHighlight(o);
                          }}
                          onRemoveBookmark={dbRemoveBookmark}
                          onRemoveHighlight={dbRemoveHighlight}
                          onRemoveNote={dbRemoveNote}
                          fileName={fileName}
                          localDocuments={localDocuments}
                          cloudDocuments={documents}
                          currentDocumentId={currentDocumentId || currentLocalDocId}
                          onSelectDocument={(doc) => {
                            setIsSidebarOpen(false);
                            handleSelectAnyDocument(doc);
                          }}
                          onDeleteLocalDocument={handleDeleteLocalDocument}
                          isLoggedIn={!!user}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsChatOpen(true)}
                    className="gap-1 px-2 sm:px-3"
                    title="Ask questions about this document"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden md:inline">Ask</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openSearch}
                    className="gap-1 px-2 sm:px-3"
                    title="Search in document (Ctrl+F)"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden md:inline">Find</span>
                  </Button>
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
                    fileName={fileName}
                    documentText={documentText}
                    annotations={annotations}
                    speechRate={speechRate}
                    onSpeechRateChange={setSpeechRate}
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                  />
                  <Button variant="outline" size="sm" onClick={handleClearDocument} className="gap-1 px-2 sm:px-3">
                    <X className="h-4 w-4" />
                    <span className="hidden md:inline">New</span>
                  </Button>
                </>
              )}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 px-2 sm:px-3">
                      <User className="h-4 w-4" />
                      <span className="hidden lg:inline max-w-[80px] truncate">{user.email?.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-1 px-2 sm:px-3">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">Sign In</span>
                </Button>
              )}
              
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {!documentText ? (
        <main className="relative flex-1 overflow-y-auto">
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px] -top-60 -right-60 animate-pulse" />
            <div className="absolute w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] top-1/2 -left-60 animate-pulse animation-delay-300" />
            <div className="absolute w-[400px] h-[400px] rounded-full bg-primary/10 blur-[80px] bottom-0 right-1/3 animate-pulse animation-delay-600" />
          </div>

          {/* ─── HERO ─── */}
          <section className="relative container mx-auto px-4 pt-16 pb-24 lg:pt-28 lg:pb-36">
            <div className="max-w-5xl mx-auto text-center">
              <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-semibold tracking-wide uppercase mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Reading
              </div>

              <h1 className="animate-fade-in-up animation-delay-150 text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight leading-[1.08] mb-6">
                Read{" "}
                <span className="relative inline-block">
                  <span className="text-gradient">Smarter</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent rounded-full opacity-60" />
                </span>
                ,<br className="hidden sm:block" />{" "}
                Learn{" "}
                <span className="relative inline-block">
                  <span className="text-gradient">Faster</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-accent to-primary rounded-full opacity-60" />
                </span>
              </h1>

              <p className="animate-fade-in-up animation-delay-300 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
                Transform any document into an interactive learning experience with instant AI definitions, annotations, and text-to-speech.
              </p>

              <div className="animate-fade-in-up animation-delay-450 flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 px-8 py-6 text-base rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Upload className="h-5 w-5" />
                  Upload Document
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto gap-2 px-8 py-6 text-base rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                  onClick={() => {
                    setDocumentText(SAMPLE_DOCUMENT.content);
                    setFileName(SAMPLE_DOCUMENT.name);
                    toast({ title: "Sample loaded", description: "Explore all reader features" });
                  }}
                >
                  <FileTextIcon className="h-5 w-5" />
                  Try Sample
                </Button>
              </div>

              <div className="animate-fade-in-up animation-delay-600 flex items-center justify-center gap-5 text-xs text-muted-foreground mb-16">
                <button
                  onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  Learn More <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="w-px h-4 bg-border" />
                <button
                  onClick={openOnboarding}
                  className="hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Take a Tour
                </button>
              </div>

              {/* ─── Interactive Preview Card ─── */}
              <div className="animate-fade-in-up animation-delay-600 relative max-w-3xl mx-auto">
                <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur-2xl shadow-2xl shadow-primary/5 p-6 sm:p-8 transition-all hover:border-primary/20 hover:shadow-primary/10">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                    <div className="w-3 h-3 rounded-full bg-accent/50" />
                    <div className="w-3 h-3 rounded-full bg-primary/50" />
                    <span className="ml-3 text-xs text-muted-foreground font-medium tracking-wide">Your Document</span>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Volume2 className="h-3 w-3" />
                      TTS
                    </div>
                  </div>

                  {/* Simulated reader */}
                  <div className="rounded-2xl bg-gradient-to-br from-background via-background to-muted/40 p-6 sm:p-8 text-left reader-prose relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                    <p className="text-base sm:text-lg mb-4 text-foreground/90 relative z-10 leading-relaxed">
                      The concept of{" "}
                      <span className="bg-primary/25 px-1.5 py-0.5 rounded border-b-2 border-primary font-medium cursor-pointer hover:bg-primary/35 transition-colors">
                        artificial intelligence
                      </span>{" "}
                      has evolved significantly, transforming from theory into{" "}
                      <span className="highlight-yellow px-1.5 py-0.5 rounded font-medium">
                        practical applications
                      </span>{" "}
                      that shape our daily lives...
                    </p>

                    {/* Definition tooltip */}
                    <div className="inline-flex items-center gap-3 mt-3 px-4 py-3 bg-card border border-border/60 rounded-2xl shadow-lg">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">artificial intelligence</p>
                        <p className="text-sm text-foreground/80">The simulation of human intelligence by machines...</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-1 sm:-right-8 animate-float z-10">
                  <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2">
                    <MousePointer2 className="h-3.5 w-3.5" />
                    Double-tap
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-1 sm:-left-8 animate-float-delayed z-10">
                  <div className="bg-accent text-accent-foreground px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Annotate
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── FEATURES ─── */}
          <section id="features-section" className="relative container mx-auto px-4 py-20">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-3 tracking-tight">
                Everything You Need
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
                Powerful features designed to enhance comprehension and make reading productive.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl p-7 transition-all duration-500 hover:bg-card/80 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── THEME SHOWCASE ─── */}
          <section className="relative container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3 tracking-tight">
                  Designed for Your Eyes
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                  Switch between light & dark themes seamlessly. Every color adapts contextually.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* Light theme card */}
                <div className="rounded-3xl p-6 border border-border/50" style={{ background: 'hsl(220, 25%, 97%)', color: 'hsl(220, 30%, 8%)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(252, 85%, 60%)', color: 'white' }}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-display font-semibold">Light Mode</span>
                  </div>
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: 'white' }}>
                    <div className="h-2.5 rounded-full w-3/4" style={{ background: 'hsl(220, 15%, 90%)' }} />
                    <div className="h-2.5 rounded-full w-full" style={{ background: 'hsl(220, 15%, 90%)' }} />
                    <div className="h-2.5 rounded-full w-5/6" style={{ background: 'hsl(220, 15%, 90%)' }} />
                    <div className="inline-block mt-2 px-3 py-1 rounded-lg text-[10px] font-semibold" style={{ background: 'hsl(48, 100%, 70%)', color: 'hsl(30, 10%, 20%)' }}>
                      Highlighted text
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {['hsl(252, 85%, 60%)', 'hsl(172, 66%, 50%)', 'hsl(48, 100%, 70%)', 'hsl(330, 80%, 80%)', 'hsl(142, 70%, 70%)'].map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
                    ))}
                  </div>
                </div>

                {/* Dark theme card */}
                <div className="rounded-3xl p-6 border border-border/50" style={{ background: 'hsl(224, 35%, 6%)', color: 'hsl(220, 15%, 96%)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(252, 85%, 65%)', color: 'white' }}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-display font-semibold">Dark Mode</span>
                  </div>
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: 'hsl(224, 30%, 10%)' }}>
                    <div className="h-2.5 rounded-full w-3/4" style={{ background: 'hsl(224, 20%, 18%)' }} />
                    <div className="h-2.5 rounded-full w-full" style={{ background: 'hsl(224, 20%, 18%)' }} />
                    <div className="h-2.5 rounded-full w-5/6" style={{ background: 'hsl(224, 20%, 18%)' }} />
                    <div className="inline-block mt-2 px-3 py-1 rounded-lg text-[10px] font-semibold" style={{ background: 'hsl(48, 80%, 30%)', color: 'hsl(220, 15%, 92%)' }}>
                      Highlighted text
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {['hsl(252, 85%, 65%)', 'hsl(172, 66%, 45%)', 'hsl(48, 80%, 30%)', 'hsl(330, 60%, 35%)', 'hsl(142, 50%, 25%)'].map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 shadow-sm" style={{ background: c, borderColor: 'hsl(224, 20%, 18%)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── UPLOAD ─── */}
          <section id="upload-section" className="relative container mx-auto px-4 py-20">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3 tracking-tight">
                  Start Reading Now
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Drop your document and experience the difference.
                </p>
              </div>

              <EnhancedDocumentUploader
                onDocumentParsed={handleDocumentParsed}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />

              <p className="text-center text-xs text-muted-foreground mt-5">
                PDF, Word, EPUB, TXT, Markdown, HTML, RTF
              </p>
            </div>
          </section>

          {/* ─── CTA ─── */}
          <section className="relative container mx-auto px-4 py-20">
            <div className="max-w-3xl mx-auto rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-accent/5 to-primary/8 backdrop-blur-xl p-10 sm:p-14 text-center">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold mb-4">
                Ready to Transform Your Reading?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-sm sm:text-base">
                Join thousands of learners using ReadMate to read smarter every day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 px-8 py-6 text-base rounded-2xl shadow-lg shadow-primary/20"
                  onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Upload className="h-5 w-5" />
                  Get Started Free
                </Button>
                {!user && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 px-8 py-6 text-base rounded-2xl border-2"
                    onClick={() => navigate('/auth')}
                  >
                    <User className="h-5 w-5" />
                    Create Account
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* ─── FOOTER ─── */}
          <footer className="border-t border-border/30 py-8">
            <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-4 mb-3">
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                <span className="w-px h-3 bg-border" />
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              </div>
              <p>© {new Date().getFullYear()} ReadMate. Built with ❤️ for learners.</p>
            </div>
          </footer>
        </main>
      ) : (
        <div className="flex w-full flex-1 min-h-0 overflow-hidden">
          {/* Main Content (always full-width; sidebar opens as slide-over) */}
          <main className="flex-1 min-w-0 w-full min-h-0 overflow-auto">
            <div className="w-full min-h-0 flex flex-col">
              
              <div className="flex items-center justify-center gap-4 py-2 sm:py-4 px-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm text-muted-foreground">
                  <MousePointer2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Double-click any word for its definition</span>
                  <span className="sm:hidden">Tap word for definition</span>
                </div>
              </div>
              
              <EnhancedDocumentViewer
                text={documentText} 
                annotations={annotations}
                onWordSelect={handleWordSelect}
                onAddHighlight={handleAddHighlight}
                onAddNote={handleAddNote}
                onAddBookmark={handleAddBookmark}
                fontSize={fontSize}
                lineHeight={lineHeight}
                searchMatches={searchMatches}
                currentSearchMatchIndex={currentSearchMatchIndex}
              />
            </div>
          </main>
        </div>
      )}

      {/* In-document search panel */}
      <InDocumentSearch
        isOpen={isSearchOpen}
        searchQuery={inDocSearchQuery}
        onSearchChange={setInDocSearchQuery}
        matchCount={searchMatches.length}
        currentMatchIndex={currentSearchMatchIndex}
        onNextMatch={goToNextMatch}
        onPreviousMatch={goToPreviousMatch}
        onClose={closeSearch}
      />

      {showPopover && selectedWord && (
        <WordDefinitionPopover
          word={selectedWord}
          context={wordContext}
          position={popoverPosition}
          onClose={handleClosePopover}
        />
      )}

      {/* Document Chat */}
      <DocumentChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        documentContent={documentText}
        documentName={fileName}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={closeOnboarding}
        onComplete={closeOnboarding}
      />
    </div>
  );
};

export default DocumentReader;
