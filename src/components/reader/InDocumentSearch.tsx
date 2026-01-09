import { useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InDocumentSearchProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
  onClose: () => void;
}

export const InDocumentSearch = ({
  isOpen,
  searchQuery,
  onSearchChange,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPreviousMatch,
  onClose,
}: InDocumentSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          onPreviousMatch();
        } else {
          onNextMatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNextMatch, onPreviousMatch]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-fade-in">
      <div className="glass-card rounded-xl p-3 shadow-xl border border-border/50 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search in document..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-48 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        
        {searchQuery && (
          <span className={cn(
            "text-xs shrink-0 px-2 py-0.5 rounded-full",
            matchCount > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : 'No matches'}
          </span>
        )}

        <div className="flex items-center gap-1 border-l border-border pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPreviousMatch}
            disabled={matchCount === 0}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNextMatch}
            disabled={matchCount === 0}
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Close (Escape)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
