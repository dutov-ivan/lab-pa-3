import React from "react";
import initWasm, { find_ai_move, AiDifficulty } from "../wasm/wasm_rust.js";

export default function useAI() {
  const [wasmReady, setWasmReady] = React.useState(false);

  const aiWorkerRef = React.useRef<Worker | null>(null);
  const aiReqIdRef = React.useRef(0);
  const aiPendingRef = React.useRef(new Map<number, (res: any) => void>());

  React.useEffect(() => {
    let mounted = true;
    initWasm()
      .then(() => {
        if (mounted) setWasmReady(true);
      })
      .catch((err) => {
        console.error("Failed to initialize WASM:", err);
      });

    // Try to create worker
    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        const worker = new Worker(
          new URL("../wasm/aiWorker.ts", import.meta.url),
          {
            type: "module",
          }
        );

        worker.onmessage = (ev: MessageEvent) => {
          const { id, move, error } = ev.data || {};
          const resolver = aiPendingRef.current.get(id);
          if (resolver) {
            resolver({ move, error });
            aiPendingRef.current.delete(id);
          }
        };

        aiWorkerRef.current = worker;
      } catch (err) {
        console.warn(
          "Failed to create AI worker, will fallback to main thread:",
          err
        );
        aiWorkerRef.current = null;
      }
    }

    return () => {
      mounted = false;
      if (aiWorkerRef.current) {
        aiWorkerRef.current.terminate();
        aiWorkerRef.current = null;
      }
      aiPendingRef.current.clear();
    };
  }, []);

  // Play AI move: returns move index or null
  const playAIMove = React.useCallback(
    async (
      x_mask: bigint,
      o_mask: bigint,
      player: number,
      difficulty: number
    ) => {
      let moveIdx: number | null = null;
      const worker = aiWorkerRef.current;

      if (worker) {
        const id = ++aiReqIdRef.current;
        const promise: Promise<{ move?: number; error?: any }> = new Promise(
          (resolve) => {
            aiPendingRef.current.set(id, resolve);
            worker.postMessage({ id, x_mask, o_mask, player, difficulty });
          }
        );

        const res = await promise;
        if (res && res.error) {
          console.error("AI worker error:", res.error);
        } else if (res && typeof res.move === "number") {
          moveIdx = res.move;
        }
      } else {
        try {
          // Fallback to main-thread WASM call
          moveIdx = find_ai_move(x_mask, o_mask, player, difficulty);
        } catch (err) {
          console.error("AI main-thread error:", err);
        }
      }

      return moveIdx;
    },
    []
  );

  return { wasmReady, playAIMove, AiDifficulty } as const;
}
