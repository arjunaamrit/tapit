import { useEffect, useState, useCallback } from "react";
import { X, Loader2, Volume2, Search, ExternalLink, Languages, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
];

interface Source {
  url: string;
  title: string;
}

interface SearchResult {
  summary: string;
  sources: Source[];
}

interface WordDefinitionPopoverProps {
  word: string;
  context: string;
  position: { x: number; y: number };
  onClose: () => void;
}

// Component for clickable/double-tappable text within definitions
const ClickableText = ({ 
  text, 
  onWordClick,
  className = ""
}: { 
  text: string; 
  onWordClick: (word: string) => void;
  className?: string;
}) => {
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let selectedText = selection.toString().trim();
    
    // If no text selected, try to select the word under cursor
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
            selectedText = selection.toString().trim();
          }
        }
      }
    }

    if (selectedText && selectedText.length >= 2 && /^[a-zA-Z'-]+$/.test(selectedText)) {
      onWordClick(selectedText);
    }
  }, [onWordClick]);

  return (
    <span 
      onDoubleClick={handleDoubleClick}
      className={`cursor-text select-text ${className}`}
    >
      {text}
    </span>
  );
};

// Nested definition component for recursive lookups
const NestedDefinition = ({ 
  word, 
  context,
  onClose,
  depth = 1
}: { 
  word: string;
  context: string;
  onClose: () => void;
  depth?: number;
}) => {
  const [definition, setDefinition] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [nestedWord, setNestedWord] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefinition = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/define-word`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ word, context }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get definition');
        }

        if (data.success && data.definition) {
          setDefinition(data.definition);
        } else {
          throw new Error('No definition received');
        }
      } catch (err) {
        console.error('Error fetching nested definition:', err);
        setError(err instanceof Error ? err.message : 'Failed to get definition');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefinition();
  }, [word, context]);

  const handleNestedWordClick = useCallback((clickedWord: string) => {
    if (clickedWord.toLowerCase() !== word.toLowerCase()) {
      setNestedWord(clickedWord);
    }
  }, [word]);

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`border-l-2 border-primary/40 pl-3 mt-3 ${depth > 3 ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm capitalize">{word}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleSpeak}
          >
            <Volume2 className="h-3 w-3" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Looking up...</span>
        </div>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <ClickableText text={definition} onWordClick={handleNestedWordClick} />
        </p>
      )}

      {nestedWord && depth < 5 && (
        <NestedDefinition 
          word={nestedWord}
          context={context}
          onClose={() => setNestedWord(null)}
          depth={depth + 1}
        />
      )}
    </div>
  );
};

const WordDefinitionPopover = ({ word, context, position, onClose }: WordDefinitionPopoverProps) => {
  const { toast } = useToast();
  const [definition, setDefinition] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [nestedWord, setNestedWord] = useState<string | null>(null);
  
  // AI Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  
  // Translation state
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefinition = async () => {
      setIsLoading(true);
      setError("");
      setNestedWord(null);
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/define-word`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ word, context }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get definition');
        }

        if (data.success && data.definition) {
          setDefinition(data.definition);
        } else {
          throw new Error('No definition received');
        }
      } catch (err) {
        console.error('Error fetching definition:', err);
        setError(err instanceof Error ? err.message : 'Failed to get definition');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefinition();
    // Pre-fill search with the selected word
    setSearchQuery(word);
  }, [word, context]);

  const handleNestedWordClick = useCallback((clickedWord: string) => {
    if (clickedWord.toLowerCase() !== word.toLowerCase()) {
      setNestedWord(clickedWord);
    }
  }, [word]);

  // Calculate position to keep popover in viewport
  const calculatePosition = () => {
    const popoverWidth = 400;
    const popoverHeight = searchResult ? 500 : nestedWord ? 380 : 320;
    const padding = 16;
    
    let x = position.x - popoverWidth / 2;
    let y = position.y;
    
    // Keep within horizontal bounds
    if (x < padding) x = padding;
    if (x + popoverWidth > window.innerWidth - padding) {
      x = window.innerWidth - popoverWidth - padding;
    }
    
    // If popover would go below viewport, show above the word
    if (y + popoverHeight > window.innerHeight - padding) {
      y = position.y - popoverHeight - 40;
    }
    
    return { left: x, top: y };
  };

  const popoverStyle = calculatePosition();

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  const handleTranslate = async (langCode: string, langName: string) => {
    setIsTranslating(true);
    setSelectedLanguage(langName);
    setTranslation(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-word', {
        body: { word, targetLanguage: langCode, targetLanguageName: langName }
      });

      if (error) throw error;
      
      setTranslation(data.translation);
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation failed",
        description: "Please try again later",
        variant: "destructive",
      });
      setSelectedLanguage(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!searchQuery.trim()) {
      toast({
        title: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-summarize', {
        body: { query: searchQuery.trim() }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSearchResult(data);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50" 
        onClick={onClose}
      />
      
      {/* Popover */}
      <div
        className="fixed z-50 w-[400px] max-w-[calc(100vw-32px)] bg-popover border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95"
        style={popoverStyle}
      >
        <ScrollArea className="max-h-[70vh]">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg capitalize">{word}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleSpeak}
                  title="Listen to pronunciation"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2"
                      disabled={isTranslating}
                      title="Translate to another language"
                    >
                      {isTranslating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Languages className="h-4 w-4" />
                          <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                    {LANGUAGES.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleTranslate(lang.code, lang.name)}
                        className="cursor-pointer"
                      >
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Translation Result */}
            {(translation || isTranslating) && selectedLanguage && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Languages className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">{selectedLanguage}</span>
                </div>
                {isTranslating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Translating...</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium">{translation}</p>
                )}
              </div>
            )}
            
            {/* Definition Content */}
            <div className="min-h-[60px] mb-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <ClickableText text={definition} onWordClick={handleNestedWordClick} />
                </p>
              )}
            </div>

            {/* Nested Definition */}
            {nestedWord && (
              <NestedDefinition 
                word={nestedWord}
                context={context}
                onClose={() => setNestedWord(null)}
                depth={1}
              />
            )}

            {/* Hint */}
            {!isLoading && !error && (
              <p className="text-xs text-muted-foreground/70 mb-3 italic">
                💡 Double-tap any word in the definition to look it up
              </p>
            )}

            {/* Divider */}
            <div className="border-t border-border my-3" />

            {/* AI Search Section */}
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for more info..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                    disabled={isSearching}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSearching || !searchQuery.trim()}
                  size="sm"
                  className="h-9"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </form>

              {isSearching && (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Searching...</p>
                </div>
              )}

              {searchResult && !isSearching && (
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      <ClickableText text={searchResult.summary} onWordClick={handleNestedWordClick} />
                    </p>
                  </div>

                  {searchResult.sources && searchResult.sources.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                      <div className="space-y-1">
                        {searchResult.sources.slice(0, 3).map((source, index) => (
                          <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-background rounded hover:bg-muted transition-colors group"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                            <span className="text-xs text-muted-foreground group-hover:text-primary truncate">
                              {source.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default WordDefinitionPopover;
