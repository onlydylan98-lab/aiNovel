import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChapterOutline } from "@/domain/novel/types";
import { FileText, PenLine } from "lucide-react";
import type { RefObject } from "react";

interface ChapterContentPaneProps {
  chapter: ChapterOutline | undefined;
  contentRef: RefObject<HTMLDivElement>;
  onWriteChapter: () => void;
}

export function ChapterContentPane({
  chapter,
  contentRef,
  onWriteChapter,
}: ChapterContentPaneProps) {
  return (
    <div className="flex-1 flex flex-col bg-background h-screen">
      {chapter ? (
        <>
          <div className="flex-none p-5 md:p-8 shrink-0 bg-background/95 backdrop-blur z-10 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">第{chapter.chapterNumber}章 {chapter.title}</h1>
                <Badge variant={chapter.status === "completed" ? "default" : "secondary"}>
                  {chapter.status === "completed"
                    ? "已完成"
                    : chapter.status === "generating"
                      ? "努力撰写中"
                      : "待生成"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl truncate" title={chapter.synopsis}>
                大纲：{chapter.synopsis}
              </p>
            </div>

            {chapter.status === "pending" && (
              <Button onClick={onWriteChapter} size="lg" className="shrink-0 shadow-sm animate-in fade-in zoom-in duration-300">
                <PenLine className="mr-2 h-4 w-4" />
                让大模型执笔本章
              </Button>
            )}
            {chapter.status === "completed" && (
              <Button onClick={onWriteChapter} variant="outline" size="sm" className="shrink-0 fade-in zoom-in duration-300">
                重新生成
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto" ref={contentRef}>
            <div className="max-w-3xl mx-auto p-6 md:p-12 min-h-full">
              {chapter.content ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none text-lg text-foreground/90 whitespace-pre-wrap leading-[2.2] tracking-[0.02em] font-serif">
                  {chapter.content}
                  {chapter.status === "generating" && (
                    <span className="inline-block w-2.5 h-5 bg-primary ml-1 animate-pulse align-middle" />
                  )}
                </div>
              ) : (
                <div className="h-full mt-24 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                  <FileText className="h-16 w-16 mb-4 stroke-[1]" />
                  <p className="text-lg">点击上方按钮，开始生成本章内容。</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          请在左侧选择章节
        </div>
      )}
    </div>
  );
}
