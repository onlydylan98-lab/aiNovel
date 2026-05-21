import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateNovelOutline, NovelOutline } from "@/lib/gemini";
import { useState } from "react";
import { Loader2, BookOpen, PenTool } from "lucide-react";

export function OutlineScreen() {
  const { state, dispatch } = useStore();
  const { config, outline, llmSettings } = state;
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!outline || !config) return null;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const newOutline = await generateNovelOutline(config, llmSettings);
      dispatch({ type: "SET_OUTLINE", payload: newOutline });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "重新生成失败，请检查 AI 接口配置。");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleStartWriting = () => {
    dispatch({ type: "SET_APP_STATE", payload: "writing" });
    if (outline.chapters.length > 0) {
      dispatch({ type: "SET_CURRENT_CHAPTER", payload: outline.chapters[0].chapterNumber });
    }
  };

  const updateField = (field: keyof Omit<NovelOutline, 'chapters'>, value: string) => {
    dispatch({ type: "UPDATE_OUTLINE_FIELD", payload: { field, value } });
  };

  const updateChapter = (chapterNumber: number, info: { title?: string; synopsis?: string }) => {
    dispatch({ type: "UPDATE_CHAPTER_INFO", payload: { chapterNumber, ...info } });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:py-8 h-screen flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">《{config.title}》 设定集</h1>
          <p className="text-muted-foreground mt-1">您可以手动微调大纲，或者让白金作家重新构思</p>
        </div>
        <div className="space-x-4">
          <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
            {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
            重新生成
          </Button>
          <Button onClick={handleStartWriting} className="min-w-32">
            <BookOpen className="mr-2 h-4 w-4" />
            开始正式写作
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="flex flex-col h-full shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle>卷宗大纲</CardTitle>
            <CardDescription>点击下方文本框可直接进行微调</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4 text-sm">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-lg text-primary">主线梗概</Label>
                  <Textarea
                    className="min-h-[150px] resize-none focus-visible:ring-1"
                    value={outline.synopsis}
                    onChange={(e) => updateField("synopsis", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-lg text-primary">世界观与力量体系</Label>
                  <Textarea
                    className="min-h-[150px] resize-none focus-visible:ring-1"
                    value={outline.worldview}
                    onChange={(e) => updateField("worldview", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-lg text-primary">人物设定</Label>
                  <Textarea
                    className="min-h-[150px] resize-none focus-visible:ring-1"
                    value={outline.characterProfiles}
                    onChange={(e) => updateField("characterProfiles", e.target.value)}
                  />
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle>章节脉络 (前10章)</CardTitle>
            <CardDescription>展开可编辑章节名与本章细纲</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
             <ScrollArea className="h-full pr-4">
                <Accordion type="single" collapsible className="w-full">
                  {outline.chapters.map((chapter) => (
                    <AccordionItem value={chapter.chapterNumber.toString()} key={chapter.chapterNumber}>
                      <AccordionTrigger className="text-left font-medium hover:text-primary">
                        第{chapter.chapterNumber}章：{chapter.title}
                      </AccordionTrigger>
                      <AccordionContent className="px-1 space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">章节标题</Label>
                          <Input
                            value={chapter.title}
                            onChange={(e) => updateChapter(chapter.chapterNumber, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">本章细纲</Label>
                          <Textarea
                            rows={4}
                            value={chapter.synopsis}
                            onChange={(e) => updateChapter(chapter.chapterNumber, { synopsis: e.target.value })}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
             </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
