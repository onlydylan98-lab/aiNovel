import { useStore } from "@/store";
import { generateChapterStream, generateChapterSummary, extendNovelOutline } from "@/lib/gemini";
import { ChapterSidebar } from "@/components/writing/ChapterSidebar";
import { ChapterContentPane } from "@/components/writing/ChapterContentPane";
import { useState, useRef, useEffect } from "react";

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
      <ChapterSidebar
        chapters={outline.chapters}
        currentChapterId={currentChapterId}
        isExtending={isExtending}
        title={config.title}
        onSelectChapter={handleSelectChapter}
        onExtendOutline={handleExtendOutline}
        onExport={handleExport}
      />
      <ChapterContentPane
        chapter={currentChapter}
        contentRef={contentRef}
        onWriteChapter={handleWriteChapter}
      />
    </div>
  );
}
