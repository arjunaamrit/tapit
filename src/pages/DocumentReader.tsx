import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, FileText, X, Volume2, Pause, Square, Zap, Lightbulb, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DocumentUploader from "@/components/DocumentUploader";
import DocumentViewer from "@/components/DocumentViewer";
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
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Document Reader</h1>
              </div>
            </div>
            {documentText && (
              <Button variant="outline" size="sm" onClick={handleClearDocument}>
                <X className="h-4 w-4 mr-2" />
                Clear Document
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!documentText ? (
          <div className="max-w-2xl mx-auto">
            <Card className="border-dashed border-2">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Upload className="h-6 w-6" />
                  Upload Your Document
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Upload a PDF, DOCX, or TXT file. Double-tap any word to get its contextual definition.
                </p>
              </CardHeader>
              <CardContent>
                <DocumentUploader 
                  onDocumentParsed={handleDocumentParsed}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <h3 className="font-semibold mb-4">How it works</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3 mx-auto">
                    <Upload className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h4 className="font-medium">1. Upload</h4>
                  <p className="text-sm text-muted-foreground">Upload any PDF, Word, or text document</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3 mx-auto">
                    <Zap className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h4 className="font-medium">2. Double-Tap</h4>
                  <p className="text-sm text-muted-foreground">Double-click on any word you want to understand</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3 mx-auto">
                    <Lightbulb className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h4 className="font-medium">3. Learn</h4>
                  <p className="text-sm text-muted-foreground">Get instant AI-powered contextual definitions</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                {!isSpeaking ? (
                  <Button variant="outline" size="sm" onClick={handleSpeak}>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Listen
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={isPaused ? handleSpeak : handlePause}>
                      {isPaused ? <Volume2 className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleStop}>
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Double-click any word for its definition
            </p>
            
            <DocumentViewer 
              text={documentText} 
              onWordSelect={handleWordSelect}
            />
          </div>
        )}
      </main>

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
