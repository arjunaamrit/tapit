import { useEffect, useState } from "react";
import { X, Loader2, Volume2, Search, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const WordDefinitionPopover = ({ word, context, position, onClose }: WordDefinitionPopoverProps) => {
  const { toast } = useToast();
  const [definition, setDefinition] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  // AI Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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

  // Calculate position to keep popover in viewport
  const calculatePosition = () => {
    const popoverWidth = 400;
    const popoverHeight = showSearch && searchResult ? 500 : 280;
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
    setShowSearch(true);

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
              >
                <Volume2 className="h-4 w-4" />
              </Button>
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
                {definition}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border my-3" />

          {/* AI Search Section */}
          <div>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-primary transition-colors mb-3"
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                AI-Powered Search
              </span>
              {showSearch ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showSearch && (
              <div className="space-y-3">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search for more info..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-9 text-sm"
                    disabled={isSearching}
                  />
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    size="sm"
                    className="h-9"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
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
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-3 pr-3">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {searchResult.summary}
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
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WordDefinitionPopover;
