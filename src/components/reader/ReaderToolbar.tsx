import { 
  Volume2, 
  Pause, 
  Square, 
  ZoomIn, 
  ZoomOut,
  Type,
  Settings,
  AlignLeft,
  Share2
} from 'lucide-react';
import { ExportShareDialog } from './ExportShareDialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ReaderToolbarProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onSpeak: () => void;
  onPause: () => void;
  onStop: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (height: number) => void;
  fileName: string;
  documentText: string;
  annotations: {
    highlights: Array<{
      id: string;
      text: string;
      startOffset: number;
      endOffset: number;
      color: string;
      createdAt: Date;
    }>;
    notes: Array<{
      id: string;
      highlightId?: string;
      content: string;
      position: number;
      createdAt: Date;
    }>;
    bookmarks: Array<{
      id: string;
      paragraphIndex: number;
      label: string;
      createdAt: Date;
    }>;
  };
}

export const ReaderToolbar = ({
  isSpeaking,
  isPaused,
  onSpeak,
  onPause,
  onStop,
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  fileName,
  documentText,
  annotations,
}: ReaderToolbarProps) => {
  return (
    <div className="flex items-center gap-2 p-2 glass-panel rounded-xl">
      {/* Text-to-Speech Controls */}
      <div className="flex items-center gap-1">
        {!isSpeaking ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSpeak}
            className="toolbar-button"
            title="Listen"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={isPaused ? onSpeak : onPause}
              className="toolbar-button"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="toolbar-button"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Font Size Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
          className="toolbar-button"
          title="Decrease font size"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-8 text-center text-muted-foreground">
          {fontSize}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFontSizeChange(Math.min(32, fontSize + 2))}
          className="toolbar-button"
          title="Increase font size"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Reading Settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="toolbar-button"
            title="Reading settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Font Size
                </Label>
                <span className="text-sm text-muted-foreground">{fontSize}px</span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={([value]) => onFontSizeChange(value)}
                min={12}
                max={32}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <AlignLeft className="h-4 w-4" />
                  Line Height
                </Label>
                <span className="text-sm text-muted-foreground">{lineHeight.toFixed(1)}</span>
              </div>
              <Slider
                value={[lineHeight * 10]}
                onValueChange={([value]) => onLineHeightChange(value / 10)}
                min={12}
                max={25}
                step={1}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />

      {/* Export & Share */}
      <ExportShareDialog
        fileName={fileName}
        documentText={documentText}
        annotations={annotations}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="toolbar-button"
            title="Export & Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
};
