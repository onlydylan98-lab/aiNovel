import type { ChapterOutline, NovelConfig, NovelOutline } from "@/domain/novel/types";
import type { LlmSettings } from "@/lib/llm-settings";

export type AppState = "setup" | "outline" | "writing";

export interface State {
  appState: AppState;
  config: NovelConfig | null;
  outline: NovelOutline | null;
  currentChapterId: number | null;
  llmSettings: LlmSettings;
}

export type StoreAction =
  | { type: "SET_APP_STATE"; payload: AppState }
  | { type: "SET_CONFIG"; payload: NovelConfig }
  | { type: "SET_OUTLINE"; payload: NovelOutline }
  | { type: "SET_LLM_SETTINGS"; payload: LlmSettings }
  | { type: "RESET_LLM_SETTINGS" }
  | { type: "SET_CURRENT_CHAPTER"; payload: number }
  | { type: "ADD_CHAPTERS"; payload: ChapterOutline[] }
  | { type: "UPDATE_OUTLINE_FIELD"; payload: { field: keyof Omit<NovelOutline, "chapters">; value: string } }
  | { type: "UPDATE_CHAPTER_INFO"; payload: { chapterNumber: number; title?: string; synopsis?: string } }
  | { type: "UPDATE_CHAPTER_STATUS"; payload: { chapterNumber: number; status: ChapterOutline["status"] } }
  | { type: "UPDATE_CHAPTER_CONTENT"; payload: { chapterNumber: number; content: string; append?: boolean } }
  | { type: "UPDATE_CHAPTER_SUMMARY"; payload: { chapterNumber: number; summary: string } };
