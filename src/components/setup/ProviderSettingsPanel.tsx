import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompatibleProtocol, LlmSettings, ProviderType } from "@/lib/llm-settings";

interface ProviderSettingsPanelProps {
  llmSettings: LlmSettings;
  onProviderChange: (provider: ProviderType) => void;
  onGeminiFieldChange: <K extends keyof LlmSettings["gemini"]>(
    field: K,
    value: LlmSettings["gemini"][K]
  ) => void;
  onCompatibleFieldChange: <K extends keyof LlmSettings["compatible"]>(
    field: K,
    value: LlmSettings["compatible"][K]
  ) => void;
  onReset: () => void;
}

export function ProviderSettingsPanel({
  llmSettings,
  onProviderChange,
  onGeminiFieldChange,
  onCompatibleFieldChange,
  onReset,
}: ProviderSettingsPanelProps) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">AI 接口配置</h3>
          <p className="text-sm text-muted-foreground">
            默认值来自当前项目配置；你在这里的修改会保存到当前浏览器，并覆盖这些默认值。
          </p>
          <p className="text-xs text-muted-foreground">
            重置会清除浏览器中保存的 AI 覆盖设置，并恢复当前默认值。兼容接口支持填写完整的
            `/v1/chat/completions` 和 `/v1/responses` 地址，也支持手动指定协议。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onReset}>
          重置为当前默认值
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={llmSettings.provider === "gemini" ? "default" : "outline"}
          onClick={() => onProviderChange("gemini")}
        >
          官方 Gemini
        </Button>
        <Button
          type="button"
          variant={llmSettings.provider === "compatible" ? "default" : "outline"}
          onClick={() => onProviderChange("compatible")}
        >
          兼容接口
        </Button>
      </div>

      {llmSettings.provider === "gemini" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-api-key">Gemini API Key</Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="AIza..."
              value={llmSettings.gemini.apiKey}
              onChange={(e) => onGeminiFieldChange("apiKey", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gemini-outline-model">大纲模型</Label>
              <Input
                id="gemini-outline-model"
                value={llmSettings.gemini.outlineModel}
                onChange={(e) => onGeminiFieldChange("outlineModel", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gemini-chapter-model">正文模型</Label>
              <Input
                id="gemini-chapter-model"
                value={llmSettings.gemini.chapterModel}
                onChange={(e) => onGeminiFieldChange("chapterModel", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gemini-summary-model">摘要模型</Label>
              <Input
                id="gemini-summary-model"
                value={llmSettings.gemini.summaryModel}
                onChange={(e) => onGeminiFieldChange("summaryModel", e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="compatible-base-url">Base URL</Label>
            <Input
              id="compatible-base-url"
              placeholder="https://your-provider.example/v1/chat/completions 或 /v1/responses"
              value={llmSettings.compatible.baseURL}
              onChange={(e) => onCompatibleFieldChange("baseURL", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              兼容接口适用于任何提供兼容端点的厂商，模型名和厂商独立于协议类型。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="compatible-api-key">API Key</Label>
            <Input
              id="compatible-api-key"
              type="password"
              placeholder="sk-... / AIza..."
              value={llmSettings.compatible.apiKey}
              onChange={(e) => onCompatibleFieldChange("apiKey", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compatible-protocol">协议类型</Label>
            <select
              id="compatible-protocol"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={llmSettings.compatible.protocol}
              onChange={(e) => onCompatibleFieldChange("protocol", e.target.value as CompatibleProtocol)}
            >
              <option value="auto">自动识别</option>
              <option value="chat-completions">Chat Completions</option>
              <option value="responses">Responses</option>
            </select>
            <p className="text-xs text-muted-foreground">
              自动识别会优先根据 URL 中的 `/chat/completions` 或 `/responses` 判断；如果供应商实现不标准，可手动切换。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compatible-outline-model">大纲模型</Label>
              <Input
                id="compatible-outline-model"
                value={llmSettings.compatible.outlineModel}
                onChange={(e) => onCompatibleFieldChange("outlineModel", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compatible-chapter-model">正文模型</Label>
              <Input
                id="compatible-chapter-model"
                value={llmSettings.compatible.chapterModel}
                onChange={(e) => onCompatibleFieldChange("chapterModel", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compatible-summary-model">摘要模型</Label>
              <Input
                id="compatible-summary-model"
                value={llmSettings.compatible.summaryModel}
                onChange={(e) => onCompatibleFieldChange("summaryModel", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
