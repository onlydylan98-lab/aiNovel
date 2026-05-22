import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NovelOutline } from "@/domain/novel/types";

interface OutlineMetaEditorProps {
  synopsis: string;
  worldview: string;
  characterProfiles: string;
  onFieldChange: (field: keyof Omit<NovelOutline, "chapters">, value: string) => void;
}

export function OutlineMetaEditor({
  synopsis,
  worldview,
  characterProfiles,
  onFieldChange,
}: OutlineMetaEditorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="font-semibold text-lg text-primary">主线梗概</Label>
        <Textarea
          className="min-h-[150px] resize-none focus-visible:ring-1"
          value={synopsis}
          onChange={(e) => onFieldChange("synopsis", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="font-semibold text-lg text-primary">世界观与力量体系</Label>
        <Textarea
          className="min-h-[150px] resize-none focus-visible:ring-1"
          value={worldview}
          onChange={(e) => onFieldChange("worldview", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="font-semibold text-lg text-primary">人物设定</Label>
        <Textarea
          className="min-h-[150px] resize-none focus-visible:ring-1"
          value={characterProfiles}
          onChange={(e) => onFieldChange("characterProfiles", e.target.value)}
        />
      </div>
    </div>
  );
}
