/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StoreProvider, useStore } from "@/store";
import { SetupScreen } from "@/components/SetupScreen";
import { OutlineScreen } from "@/components/OutlineScreen";
import { WritingScreen } from "@/components/WritingScreen";
import { ErrorBoundary } from "react-error-boundary";

function AppContent() {
  const { state } = useStore();

  switch (state.appState) {
    case "setup":
      return <SetupScreen />;
    case "outline":
      return <OutlineScreen />;
    case "writing":
      return <WritingScreen />;
    default:
      return <div>State Exception</div>;
  }
}

export default function App() {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-red-500">Something went wrong.</div>}>
      <StoreProvider>
        <div className="min-h-screen bg-background font-sans text-foreground">
          <AppContent />
        </div>
      </StoreProvider>
    </ErrorBoundary>
  );
}
