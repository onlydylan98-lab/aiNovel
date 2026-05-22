import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChapterOutline } from "@/domain/novel/types";

interface ChapterOutlineListProps {
  chapters: ChapterOutline[];
  onUpdateChapter: (chapterNumber: number, info: { title?: string; synopsis?: string }) => void;
}

export function ChapterOutlineList({ chapters, onUpdateChapter }: ChapterOutlineListProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {chapters.map((chapter) => (
        <AccordionItem value={chapter.chapterNumber.toString()} key={chapter.chapterNumber}>
          <AccordionTrigger className="text-left font-medium hover:text-primary">
            第{chapter.chapterNumber}章：{chapter.title}
          </AccordionTrigger>
          <AccordionContent className="px-1 space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">章节标题</Label>
              <Input
                value={chapter.title}
                onChange={(e) => onUpdateChapter(chapter.chapterNumber, { title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">本章细纲</Label>
              <Textarea
                rows={4}
                value={chapter.synopsis}
                onChange={(e) =>
                  onUpdateChapter(chapter.chapterNumber, { synopsis: e.target.value })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
