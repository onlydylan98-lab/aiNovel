import React, { createContext, useContext, useEffect, useReducer, ReactNode } from "react";
import { NovelConfig, NovelOutline, ChapterOutline } from "@/lib/gemini";
import { getDefaultLlmSettings, mergeStoredLlmSettings } from "@/lib/llm-settings";
export type {
  CompatibleProtocol,
  CompatibleSettings,
  GeminiProviderSettings,
  LlmSettings,
  ProviderType,
} from "@/lib/llm-settings";

export type AppState = "setup" | "outline" | "writing";
import type { LlmSettings } from "@/lib/llm-settings";

export interface State {
  appState: AppState;
  config: NovelConfig | null;
  outline: NovelOutline | null;
  currentChapterId: number | null;
  llmSettings: LlmSettings;
}

export const LLM_SETTINGS_STORAGE_KEY = "novel-ai-creator:llm-settings";

export function resetStoredLlmSettings<T extends LlmSettings>(defaults: T): T {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
  }

  return defaults;
}

export function shouldClearStoredLlmSettings(
  current: LlmSettings,
  defaults: LlmSettings
): boolean {
  return JSON.stringify(current) === JSON.stringify(defaults);
}

function loadInitialLlmSettings(): LlmSettings {
  const defaults = getDefaultLlmSettings();

  if (typeof window === "undefined") {
    return defaults;
  }

  const raw = window.localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return defaults;
  }

  try {
    return mergeStoredLlmSettings(defaults, JSON.parse(raw));
  } catch {
    return defaults;
  }
}

export type StoreAction =
  | { type: "SET_APP_STATE"; payload: AppState }
  | { type: "SET_CONFIG"; payload: NovelConfig }
  | { type: "SET_OUTLINE"; payload: NovelOutline }
  | { type: "SET_LLM_SETTINGS"; payload: LlmSettings }
  | { type: "RESET_LLM_SETTINGS" }
  | { type: "SET_CURRENT_CHAPTER"; payload: number }
  | { type: "ADD_CHAPTERS"; payload: ChapterOutline[] }
  | { type: "UPDATE_OUTLINE_FIELD"; payload: { field: keyof Omit<NovelOutline, 'chapters'>; value: string } }
  | { type: "UPDATE_CHAPTER_INFO"; payload: { chapterNumber: number; title?: string; synopsis?: string } }
  | { type: "UPDATE_CHAPTER_STATUS"; payload: { chapterNumber: number; status: ChapterOutline["status"] } }
  | { type: "UPDATE_CHAPTER_CONTENT"; payload: { chapterNumber: number; content: string; append?: boolean } }
  | { type: "UPDATE_CHAPTER_SUMMARY"; payload: { chapterNumber: number; summary: string } };

const initialState: State = {
  appState: "setup",
  config: null,
  outline: null,
  currentChapterId: null,
  llmSettings: getDefaultLlmSettings(),
};

export function reduceStoreState(state: State, action: StoreAction): State {
  switch (action.type) {
    case "SET_APP_STATE":
      return { ...state, appState: action.payload };
    case "SET_CONFIG":
      return { ...state, config: action.payload };
    case "SET_OUTLINE":
      return { ...state, outline: action.payload };
    case "SET_LLM_SETTINGS":
      return { ...state, llmSettings: action.payload };
    case "RESET_LLM_SETTINGS":
      return { ...state, llmSettings: getDefaultLlmSettings() };
    case "SET_CURRENT_CHAPTER":
      return { ...state, currentChapterId: action.payload };
    case "ADD_CHAPTERS":
      if (!state.outline) return state;
      return {
        ...state,
        outline: {
          ...state.outline,
          chapters: [...state.outline.chapters, ...action.payload],
        },
      };
    case "UPDATE_OUTLINE_FIELD":
      if (!state.outline) return state;
      return {
        ...state,
        outline: {
          ...state.outline,
          [action.payload.field]: action.payload.value,
        },
      };
    case "UPDATE_CHAPTER_INFO":
      if (!state.outline) return state;
      return {
        ...state,
        outline: {
          ...state.outline,
          chapters: state.outline.chapters.map((c) =>
            c.chapterNumber === action.payload.chapterNumber
              ? {
                  ...c,
                  title: action.payload.title ?? c.title,
                  synopsis: action.payload.synopsis ?? c.synopsis,
                }
              : c
          ),
        },
      };
    case "UPDATE_CHAPTER_STATUS":
      if (!state.outline) return state;
      return {
        ...state,
        outline: {
          ...state.outline,
          chapters: state.outline.chapters.map((c) =>
            c.chapterNumber === action.payload.chapterNumber
              ? { ...c, status: action.payload.status }
              : c
          ),
        },
      };
    case "UPDATE_CHAPTER_CONTENT":
      if (!state.outline) return state;
      return {
        ...state,
        outline: {
          ...state.outline,
          chapters: state.outline.chapters.map((c) =>
            c.chapterNumber === action.payload.chapterNumber
              ? {
                  ...c,
                  content: action.payload.append
                    ? (c.content || "") + action.payload.content
                    : action.payload.content,
                }
              : c
          ),
        },
      };
      case "UPDATE_CHAPTER_SUMMARY":
        if (!state.outline) return state;
        return {
          ...state,
          outline: {
            ...state.outline,
            chapters: state.outline.chapters.map((c) =>
              c.chapterNumber === action.payload.chapterNumber
                ? { ...c, summary: action.payload.summary }
                : c
            ),
          },
        };
    default:
      return state;
  }
}

const StoreContext = createContext<{
  state: State;
  dispatch: React.Dispatch<StoreAction>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceStoreState, initialState, (baseState) => ({
    ...baseState,
    llmSettings: loadInitialLlmSettings(),
  }));

  useEffect(() => {
    const defaultSettings = getDefaultLlmSettings();

    if (shouldClearStoredLlmSettings(state.llmSettings, defaultSettings)) {
      window.localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(LLM_SETTINGS_STORAGE_KEY, JSON.stringify(state.llmSettings));
  }, [state.llmSettings]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
