import React, { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { getDefaultLlmSettings } from "@/lib/llm-settings";
import {
  loadInitialLlmSettings,
  LLM_SETTINGS_STORAGE_KEY,
  resetStoredLlmSettings,
  shouldClearStoredLlmSettings,
} from "@/store/persistence";
import { reduceStoreState } from "@/store/reducer";
import type { State, StoreAction } from "@/store/types";

export type { AppState, State, StoreAction } from "@/store/types";
export {
  LLM_SETTINGS_STORAGE_KEY,
  loadInitialLlmSettings,
  resetStoredLlmSettings,
  shouldClearStoredLlmSettings,
} from "@/store/persistence";
export { reduceStoreState } from "@/store/reducer";

function createInitialStoreState(): State {
  return {
    appState: "setup",
    config: null,
    outline: null,
    currentChapterId: null,
    llmSettings: loadInitialLlmSettings(),
  };
}

const StoreContext = createContext<{
  state: State;
  dispatch: React.Dispatch<StoreAction>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceStoreState, undefined, createInitialStoreState);

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
