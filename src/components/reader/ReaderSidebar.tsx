import { useState } from 'react';
import { 
  Bookmark, 
  Highlighter, 
  StickyNote, 
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnotationState, HighlightColor } from '@/hooks/useAnnotations';
import { cn } from '@/lib/utils';

interface ReaderSidebarProps {
  annotations: AnnotationState;
  onJumpToBookmark: (paragraphIndex: number) => void;
  onJumpToHighlight: (startOffset: number) => void;
  onRemoveBookmark: (id: string) => void;
  onRemoveHighlight: (id: string) => void;
  onRemoveNote: (id: string) => void;
  fileName: string;
}

const highlightColorClasses: Record<HighlightColor, string> = {
  yellow: 'bg-[hsl(48,100%,70%)]',
  green: 'bg-[hsl(142,70%,70%)]',
  blue: 'bg-[hsl(217,90%,75%)]',
  pink: 'bg-[hsl(330,80%,80%)]',
};

export const ReaderSidebar = ({
  annotations,
  onJumpToBookmark,
  onJumpToHighlight,
  onRemoveBookmark,
  onRemoveHighlight,
  onRemoveNote,
  fileName,
}: ReaderSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-sidebar flex flex-col items-center py-4 border-r border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-4 items-center">
          <div className="relative">
            <Bookmark className="h-5 w-5 text-sidebar-foreground/60" />
            {annotations.bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {annotations.bookmarks.length}
              </span>
            )}
          </div>
          <div className="relative">
            <Highlighter className="h-5 w-5 text-sidebar-foreground/60" />
            {annotations.highlights.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {annotations.highlights.length}
              </span>
            )}
          </div>
          <div className="relative">
            <StickyNote className="h-5 w-5 text-sidebar-foreground/60" />
            {annotations.notes.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {annotations.notes.length}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <span className="font-medium text-sm truncate">{fileName}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="bookmarks" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 p-1 mx-2 mt-2">
          <TabsTrigger value="bookmarks" className="text-xs gap-1">
            <Bookmark className="h-3 w-3" />
            <span className="hidden sm:inline">{annotations.bookmarks.length}</span>
          </TabsTrigger>
          <TabsTrigger value="highlights" className="text-xs gap-1">
            <Highlighter className="h-3 w-3" />
            <span className="hidden sm:inline">{annotations.highlights.length}</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1">
            <StickyNote className="h-3 w-3" />
            <span className="hidden sm:inline">{annotations.notes.length}</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-2">
          <TabsContent value="bookmarks" className="mt-0 space-y-2">
            {annotations.bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No bookmarks yet. Select text and click the bookmark icon.
              </p>
            ) : (
              annotations.bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="sidebar-item group"
                  onClick={() => onJumpToBookmark(bookmark.paragraphIndex)}
                >
                  <Bookmark className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{bookmark.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bookmark.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="highlights" className="mt-0 space-y-2">
            {annotations.highlights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No highlights yet. Select text and choose a color.
              </p>
            ) : (
              annotations.highlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="sidebar-item group"
                  onClick={() => onJumpToHighlight(highlight.startOffset)}
                >
                  <div className={cn(
                    'w-3 h-3 rounded-full shrink-0',
                    highlightColorClasses[highlight.color]
                  )} />
                  <span className="text-sm truncate flex-1">
                    "{highlight.text.slice(0, 30)}{highlight.text.length > 30 ? '...' : ''}"
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveHighlight(highlight.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-0 space-y-2">
            {annotations.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notes yet. Select text and add a note.
              </p>
            ) : (
              annotations.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg bg-[hsl(var(--note-bg))] group"
                >
                  <p className="text-sm leading-relaxed">{note.content}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => onRemoveNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
