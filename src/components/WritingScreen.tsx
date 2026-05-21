import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { generateChapterStream, generateChapterSummary, extendNovelOutline } from "@/lib/gemini";
import { Loader2, CheckCircle2, PenLine, FileText, Download, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export function WritingScreen() {
  const { state, dispatch } = useStore();
  const { config, outline, currentChapterId, llmSettings } = state;
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExtending, setIsExtending] = useState(false);

  if (!outline || !config) return null;

  const currentChapter = outline.chapters.find((c) => c.chapterNumber === currentChapterId);
  const previousChapters = outline.chapters.filter((c) => c.chapterNumber < (currentChapterId || 0) && c.status === "completed");

  const handleSelectChapter = (id: number) => {
    dispatch({ type: "SET_CURRENT_CHAPTER", payload: id });
  };

  const handleExtendOutline = async () => {
    setIsExtending(true);
    try {
      const newChapters = await extendNovelOutline(config, outline, llmSettings, 10);
      dispatch({ type: "ADD_CHAPTERS", payload: newChapters });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "续写大纲失败，请检查 AI 接口配置。");
    } finally {
      setIsExtending(false);
    }
  };

  const handleExport = () => {
    const completedChapters = outline.chapters.filter(c => c.status === "completed" && c.content);
    if (completedChapters.length === 0) {
      alert("没有已完成的章节可以导出。");
      return;
    }

    let text = `《${config.title}》\n\n`;
    text += `类型：${config.genre}\n`;
    text += `主角：${config.protagonist}\n`;
    text += `大纲摘要：\n${outline.synopsis}\n\n`;
    text += `====================================\n\n`;

    completedChapters.forEach(c => {
      text += `第${c.chapterNumber}章 ${c.title}\n\n`;
      text += c.content + "\n\n";
      text += `------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.title}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleWriteChapter = async () => {
    if (!currentChapter || currentChapter.status === "generating") return;

    dispatch({
      type: "UPDATE_CHAPTER_STATUS",
      payload: { chapterNumber: currentChapter.chapterNumber, status: "generating" },
    });
    // Clear content first 
    dispatch({
       type: "UPDATE_CHAPTER_CONTENT",
       payload: { chapterNumber: currentChapter.chapterNumber, content: "", append: false }
    });

    try {
      const stream = generateChapterStream(
        config,
        outline,
        currentChapter,
        previousChapters,
        llmSettings
      );
      let fullContent = "";
      for await (const chunk of stream) {
        fullContent += chunk;
        dispatch({
          type: "UPDATE_CHAPTER_CONTENT",
          payload: { chapterNumber: currentChapter.chapterNumber, content: chunk, append: true },
        });
      }
      
      dispatch({
        type: "UPDATE_CHAPTER_STATUS",
        payload: { chapterNumber: currentChapter.chapterNumber, status: "completed" },
      });

      // Generate summary asynchronously
      generateChapterSummary(fullContent, llmSettings).then((summary) => {
        dispatch({
          type: "UPDATE_CHAPTER_SUMMARY",
          payload: { chapterNumber: currentChapter.chapterNumber, summary },
        });
      });

    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "生成失败，请检查 AI 接口配置。");
      dispatch({
        type: "UPDATE_CHAPTER_STATUS",
        payload: { chapterNumber: currentChapter.chapterNumber, status: "pending" },
      });
    }
  };

  // Auto-scroll logic when generating
  useEffect(() => {
    if (currentChapter?.status === "generating" && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [currentChapter?.content, currentChapter?.status]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Chapter List */}
      <div className="w-80 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b bg-card flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg truncate w-40" title={config.title}>{config.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">章节目录</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleExport} title="导出全书">
            <Download className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {outline.chapters.map((chapter) => {
              const isSelected = chapter.chapterNumber === currentChapterId;
              return (
                <button
                  key={chapter.chapterNumber}
                  onClick={() => handleSelectChapter(chapter.chapterNumber)}
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
            onClick={handleExtendOutline}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background h-screen">
        {currentChapter ? (
          <>
            <div className="flex-none p-5 md:p-8 shrink-0 bg-background/95 backdrop-blur z-10 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <div className="flex items-center gap-3 mb-1">
                   <h1 className="text-2xl font-bold">第{currentChapter.chapterNumber}章 {currentChapter.title}</h1>
                   <Badge variant={currentChapter.status === "completed" ? "default" : "secondary"}>
                     {currentChapter.status === "completed" ? "已完成" : currentChapter.status === "generating" ? "努力撰写中" : "待生成"}
                   </Badge>
                 </div>
                 <p className="text-sm text-muted-foreground max-w-2xl truncate" title={currentChapter.synopsis}>
                   大纲：{currentChapter.synopsis}
                 </p>
              </div>
              
              {currentChapter.status === "pending" && (
                <Button onClick={handleWriteChapter} size="lg" className="shrink-0 shadow-sm animate-in fade-in zoom-in duration-300">
                  <PenLine className="mr-2 h-4 w-4" />
                  让大模型执笔本章
                </Button>
              )}
               {currentChapter.status === "completed" && (
                <Button onClick={handleWriteChapter} variant="outline" size="sm" className="shrink-0 fade-in zoom-in duration-300">
                  重新生成
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto" ref={contentRef}>
              <div className="max-w-3xl mx-auto p-6 md:p-12 min-h-full">
                {currentChapter.content ? (
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-lg text-foreground/90 whitespace-pre-wrap leading-[2.2] tracking-[0.02em] font-serif">
                    {currentChapter.content}
                    {currentChapter.status === "generating" && (
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
    </div>
  );
}
