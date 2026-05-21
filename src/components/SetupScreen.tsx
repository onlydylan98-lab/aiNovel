import { useState } from "react";
import { useStore } from "@/store";
import { generateNovelOutline, NovelConfig } from "@/lib/gemini";
import type { LlmSettings, ProviderType } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const EXAMPLE_CONFIG: NovelConfig = {
  title: "沧渊剑尊",
  genre: "东方玄幻 / 仙侠",
  coreIdea: "在一颗灵气复苏的废土星球上，少年偶然获得上古剑仙遗落的渊空断剑，体内觉醒混沌剑体，从最低级的拾荒者一路杀伐果断，踏碎星空异族，重塑天庭。",
  protagonist: "林渊：孤儿，性格坚毅冷静，极重承诺，杀伐果决不圣母。拥有混沌剑体。",
  tone: "热血，爽快，节奏紧凑，恢弘大气。",
};

export function SetupScreen() {
  const { state, dispatch } = useStore();
  const { llmSettings } = state;
  const [config, setConfig] = useState<NovelConfig>({
    title: "",
    genre: "",
    coreIdea: "",
    protagonist: "",
    tone: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFillExample = () => setConfig(EXAMPLE_CONFIG);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      dispatch({ type: "SET_CONFIG", payload: config });
      const outline = await generateNovelOutline(config, llmSettings);
      dispatch({ type: "SET_OUTLINE", payload: outline });
      dispatch({ type: "SET_APP_STATE", payload: "outline" });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "生成大纲失败，请检查 AI 接口配置。");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateLlmSettings = (nextSettings: LlmSettings) => {
    dispatch({ type: "SET_LLM_SETTINGS", payload: nextSettings });
  };

  const updateProvider = (provider: ProviderType) => {
    updateLlmSettings({ ...llmSettings, provider });
  };

  const updateGeminiField = (field: keyof LlmSettings["gemini"], value: string) => {
    updateLlmSettings({
      ...llmSettings,
      gemini: {
        ...llmSettings.gemini,
        [field]: value,
      },
    });
  };

  const updateOpenAIField = (
    field: keyof LlmSettings["openaiCompatible"],
    value: string
  ) => {
    updateLlmSettings({
      ...llmSettings,
      openaiCompatible: {
        ...llmSettings.openaiCompatible,
        [field]: value,
      },
    });
  };

  const isFormValid = Object.values(config).every((v) => (v as string).trim().length > 0);

  return (
    <div className="max-w-3xl mx-auto p-4 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">起笔：构思小说</CardTitle>
          <CardDescription>设定小说的基本元素，让AI大模型化身白金作家为您定制大纲。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">小说名</Label>
              <Input
                id="title"
                placeholder="例如：斗破苍空"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">小说类型</Label>
              <Input
                id="genre"
                placeholder="例如：东方玄幻、赛博朋克"
                value={config.genre}
                onChange={(e) => setConfig({ ...config, genre: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="coreIdea">核心剧情与创意</Label>
            <Textarea
              id="coreIdea"
              placeholder="小说的主线故事是什么？有什么独特爽点？"
              rows={4}
              value={config.coreIdea}
              onChange={(e) => setConfig({ ...config, coreIdea: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protagonist">主角设定</Label>
            <Textarea
              id="protagonist"
              placeholder="姓名、性格、金手指与背景..."
              rows={3}
              value={config.protagonist}
              onChange={(e) => setConfig({ ...config, protagonist: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">整体基调/风格</Label>
            <Input
              id="tone"
              placeholder="例如：杀伐果断、诙谐幽默、慢热宏大"
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value })}
            />
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">AI 接口配置</h3>
                <p className="text-sm text-muted-foreground">
                  默认值来自当前项目配置；你在这里的修改会保存到当前浏览器，并覆盖这些默认值。
                </p>
                <p className="text-xs text-muted-foreground">
                  重置会清除浏览器中保存的 AI 覆盖设置，并恢复当前默认值。OpenAI 兼容接口仍支持填写完整的
                  `/v1/chat/completions` 和 `/v1/responses` 地址。
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch({ type: "RESET_LLM_SETTINGS" })}
              >
                重置为当前默认值
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={llmSettings.provider === "gemini" ? "default" : "outline"}
                onClick={() => updateProvider("gemini")}
              >
                Gemini
              </Button>
              <Button
                type="button"
                variant={llmSettings.provider === "openai-compatible" ? "default" : "outline"}
                onClick={() => updateProvider("openai-compatible")}
              >
                OpenAI 兼容接口
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
                    onChange={(e) => updateGeminiField("apiKey", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-outline-model">大纲模型</Label>
                    <Input
                      id="gemini-outline-model"
                      value={llmSettings.gemini.outlineModel}
                      onChange={(e) => updateGeminiField("outlineModel", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-chapter-model">正文模型</Label>
                    <Input
                      id="gemini-chapter-model"
                      value={llmSettings.gemini.chapterModel}
                      onChange={(e) => updateGeminiField("chapterModel", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-summary-model">摘要模型</Label>
                    <Input
                      id="gemini-summary-model"
                      value={llmSettings.gemini.summaryModel}
                      onChange={(e) => updateGeminiField("summaryModel", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-base-url">Base URL</Label>
                  <Input
                    id="openai-base-url"
                    placeholder="https://your-provider.example/v1/chat/completions 或 /v1/responses"
                    value={llmSettings.openaiCompatible.baseURL}
                    onChange={(e) => updateOpenAIField("baseURL", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    支持填写完整的 `/v1/chat/completions` 或 `/v1/responses` 地址，程序会按对应协议发送请求。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-api-key">API Key</Label>
                  <Input
                    id="openai-api-key"
                    type="password"
                    placeholder="sk-..."
                    value={llmSettings.openaiCompatible.apiKey}
                    onChange={(e) => updateOpenAIField("apiKey", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openai-outline-model">大纲模型</Label>
                    <Input
                      id="openai-outline-model"
                      value={llmSettings.openaiCompatible.outlineModel}
                      onChange={(e) => updateOpenAIField("outlineModel", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-chapter-model">正文模型</Label>
                    <Input
                      id="openai-chapter-model"
                      value={llmSettings.openaiCompatible.chapterModel}
                      onChange={(e) => updateOpenAIField("chapterModel", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-summary-model">摘要模型</Label>
                    <Input
                      id="openai-summary-model"
                      value={llmSettings.openaiCompatible.summaryModel}
                      onChange={(e) => updateOpenAIField("summaryModel", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/50 p-6">
           <Button variant="ghost" onClick={handleFillExample} disabled={isGenerating}>
             填入示例数据
           </Button>
           <Button onClick={handleGenerate} disabled={!isFormValid || isGenerating} size="lg">
             {isGenerating ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 生成大纲中...
               </>
             ) : (
               "生成世界大纲"
             )}
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
