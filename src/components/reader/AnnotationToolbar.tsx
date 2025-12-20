import { Highlighter, StickyNote, Bookmark, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HighlightColor } from '@/hooks/useAnnotations';
import { cn } from '@/lib/utils';

interface AnnotationToolbarProps {
  position: { x: number; y: number };
  onHighlight: (color: HighlightColor) => void;
  onAddNote: () => void;
  onAddBookmark: () => void;
  onClose: () => void;
  hasSelection: boolean;
}

const highlightColors: { color: HighlightColor; className: string; label: string }[] = [
  { color: 'yellow', className: 'bg-[hsl(48,100%,70%)]', label: 'Yellow' },
  { color: 'green', className: 'bg-[hsl(142,70%,70%)]', label: 'Green' },
  { color: 'blue', className: 'bg-[hsl(217,90%,75%)]', label: 'Blue' },
  { color: 'pink', className: 'bg-[hsl(330,80%,80%)]', label: 'Pink' },
];

export const AnnotationToolbar = ({
  position,
  onHighlight,
  onAddNote,
  onAddBookmark,
  onClose,
  hasSelection,
}: AnnotationToolbarProps) => {
  if (!hasSelection) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 p-1.5 glass-panel rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent/20"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="center">
          <div className="flex gap-2">
            {highlightColors.map(({ color, className, label }) => (
              <button
                key={color}
                onClick={() => {
                  onHighlight(color);
                  onClose();
                }}
                className={cn(
                  'w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95',
                  className
                )}
                title={label}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent/20"
        onClick={() => {
          onAddNote();
          onClose();
        }}
      >
        <StickyNote className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent/20"
        onClick={() => {
          onAddBookmark();
          onClose();
        }}
      >
        <Bookmark className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-destructive/20 text-destructive"
        onClick={onClose}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
