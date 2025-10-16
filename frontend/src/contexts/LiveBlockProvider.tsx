import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ENABLE_LIVE_COLLABORATION,
  MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION,
} from "@/utils/editorConfig";

function LiveBlockProvider({
  enabled = false,
  roomId,
  children,
}: {
  readonly enabled: boolean;
  readonly roomId: string;
  readonly children: React.ReactNode;
}) {
  const liveBlockKey = import.meta.env.VITE_LIVEBLOCK_KEY || "";

  if (!enabled || !liveBlockKey) {
    return <>{children}</>;
  }

  return (
    <LiveblocksProvider publicApiKey={liveBlockKey}>
      <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}

export const useLiveBlockActive = (currentDoc: any) => {
  const [isLiveEnabled, setIsLiveEnabled] = useState(false);
  useEffect(() => {
    if (!ENABLE_LIVE_COLLABORATION) {
      setIsLiveEnabled(false);
      return () => {};
    }
    if (!currentDoc?.currentVersion?.content) return () => {};
    // Calculate text length from Delta ops
    const ops = currentDoc.currentVersion.content.ops || [];
    const textLength =
      ops.length > 0
        ? ops.reduce((total, op) => {
            if (typeof op.insert === "string") {
              return total + op.insert.length;
            }
            return total;
          }, 0)
        : 0;

    // Disable live collaboration if text length exceeds 10,000 characters
    setIsLiveEnabled(textLength <= MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION);
  }, [currentDoc]);
  return isLiveEnabled;
};

export default LiveBlockProvider;
