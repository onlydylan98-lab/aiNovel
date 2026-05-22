import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckCircle2, Download, Loader2, Plus } from "lucide-react";
import type { ChapterOutline } from "@/domain/novel/types";

interface ChapterSidebarProps {
  chapters: ChapterOutline[];
  currentChapterId: number | null;
  isExtending: boolean;
  title: string;
  onSelectChapter: (chapterNumber: number) => void;
  onExtendOutline: () => void;
  onExport: () => void;
}

export function ChapterSidebar({
  chapters,
  currentChapterId,
  isExtending,
  title,
  onSelectChapter,
  onExtendOutline,
  onExport,
}: ChapterSidebarProps) {
  return (
    <div className="w-80 border-r bg-muted/20 flex flex-col">
      <div className="p-4 border-b bg-card flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg truncate w-40" title={title}>
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">章节目录</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onExport} title="导出全书">
          <Download className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chapters.map((chapter) => {
            const isSelected = chapter.chapterNumber === currentChapterId;
            return (
              <button
                key={chapter.chapterNumber}
                onClick={() => onSelectChapter(chapter.chapterNumber)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-start gap-2",
                  isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate">第{chapter.chapterNumber}章：{chapter.title}</span>
                  </div>
                </div>
                <div className="mt-0.5 shrink-0">
                  {chapter.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {chapter.status === "generating" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  {chapter.status === "pending" && <div className="h-2 w-2 rounded-full bg-muted-foreground/30 m-1" />}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-card/50">
        <button
          onClick={onExtendOutline}
          disabled={isExtending}
          className="w-full py-3 border border-dashed border-primary/40 rounded-lg text-sm text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExtending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <>
              <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span>续写后续10章大纲</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          点击续写将根据当前剧情进展由AI生成后续内容
        </p>
      </div>
    </div>
  );
}
