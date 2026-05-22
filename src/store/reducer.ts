import { getDefaultLlmSettings } from "@/lib/llm-settings";
import type { State, StoreAction } from "@/store/types";

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
