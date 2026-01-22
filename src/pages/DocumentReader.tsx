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
  ArrowRight,
  LogOut,
  User,
  Loader2,
  Search,
  MessageSquare,
  Star,
  Quote,
  Users,
  FileCheck,
  Globe,
  HelpCircle
} from "lucide-react";
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
import { DocumentOrganizer } from "@/components/reader/DocumentOrganizer";
import { DocumentLibraryDialog } from "@/components/reader/DocumentLibraryDialog";
import { InDocumentSearch } from "@/components/reader/InDocumentSearch";
import { DocumentChat } from "@/components/reader/DocumentChat";
import WordDefinitionPopover from "@/components/WordDefinitionPopover";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import { SAMPLE_DOCUMENT } from "@/data/sampleDocument";
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

  const handleLoadSampleDocument = () => {
    setDocumentText(SAMPLE_DOCUMENT.content);
    setFileName(SAMPLE_DOCUMENT.fileName);
    setCurrentDocumentId(null);
    setCurrentLocalDocId(null);
    setShowPopover(false);
    setSelectedWord(null);
    toast({ 
      title: "Sample document loaded", 
      description: "Try double-clicking any word to see the AI definition feature!" 
    });
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

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "PhD Student, MIT",
      content: "ReadMate has revolutionized how I study research papers. The instant definitions save me hours of googling terms.",
      avatar: "SC",
      rating: 5
    },
    {
      name: "Michael Torres",
      role: "Business Analyst",
      content: "I process dozens of reports weekly. The annotation and text-to-speech features are game changers for productivity.",
      avatar: "MT",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "ESL Teacher",
      content: "My students love the translation feature. It's made reading English texts so much more accessible for them.",
      avatar: "EW",
      rating: 5
    }
  ];

  const stats = [
    { icon: Users, value: "50K+", label: "Active Readers" },
    { icon: FileCheck, value: "2M+", label: "Documents Processed" },
    { icon: Globe, value: "20+", label: "Languages Supported" },
    { icon: Star, value: "4.9", label: "User Rating" },
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChatOpen(true)}
                        className="gap-2"
                        title="Ask questions about this document"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Ask</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openSearch}
                        className="gap-2"
                        title="Search in document (Ctrl+F)"
                      >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">Find</span>
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
                      <Button variant="outline" size="sm" onClick={handleClearDocument} className="gap-2">
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">New Document</span>
                      </Button>
                    </>
                  )}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
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
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
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

              <div className="animate-fade-in-up animation-delay-450 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
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
                  onClick={handleLoadSampleDocument}
                >
                  <Sparkles className="h-5 w-5" />
                  Try Sample Document
                </Button>
              </div>
              
              <div className="animate-fade-in-up animation-delay-500 flex items-center justify-center gap-6 mb-16">
                <button
                  onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={openOnboarding}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  Take a Tour
                </button>
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

          {/* Stats Section */}
          <section className="relative container mx-auto px-4 py-16">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div 
                    key={stat.label}
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-display font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="relative container mx-auto px-4 py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Loved by Readers Worldwide
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                See what our community has to say about their reading experience.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={testimonial.name}
                  className="glass-card rounded-2xl p-6 relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="relative container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto glass-card rounded-3xl p-12 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Ready to Transform Your Reading?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join over 50,000 learners who read smarter with ReadMate. Start for free today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="gap-2 px-8 py-6 text-lg rounded-2xl shadow-lg shadow-primary/25"
                  onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Upload className="h-5 w-5" />
                  Get Started Free
                </Button>
                {!user && (
                  <Button 
                    variant="outline"
                    size="lg" 
                    className="gap-2 px-8 py-6 text-lg rounded-2xl"
                    onClick={() => navigate('/auth')}
                  >
                    <User className="h-5 w-5" />
                    Create Account
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-border/40 py-8">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                <span>•</span>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              </div>
              <p>© 2025 ReadMate. Built with ❤️ for learners everywhere.</p>
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
            onRemoveBookmark={dbRemoveBookmark}
            onRemoveHighlight={dbRemoveHighlight}
            onRemoveNote={dbRemoveNote}
            fileName={fileName}
            localDocuments={localDocuments}
            cloudDocuments={documents}
            currentDocumentId={currentDocumentId || currentLocalDocId}
            onSelectDocument={handleSelectAnyDocument}
            onDeleteLocalDocument={handleDeleteLocalDocument}
            isLoggedIn={!!user}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <div className="max-w-3xl mx-auto">
              {/* Document Organization */}
              {user && currentDocumentId && (
                <div className="mb-4">
                  <DocumentOrganizer
                    documentId={currentDocumentId}
                    currentFolderId={currentFolderId}
                    onFolderChange={async (folderId) => {
                      setCurrentFolderId(folderId);
                      if (currentDocumentId) {
                        await updateDocumentFolder(currentDocumentId, folderId);
                      }
                    }}
                  />
                </div>
              )}
              
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
