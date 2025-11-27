// Worker that initializes the WASM module and runs find_ai_move off the main thread.
// Uses ES module worker (Vite supports this pattern).
import initWasm, { find_ai_move } from "./wasm_rust.js";

let wasmReady: boolean = false;
let initPromise: Promise<void> | null = null;

async function ensureWasm() {
  if (wasmReady) return;
  if (!initPromise)
    initPromise = initWasm().then(() => {
      wasmReady = true;
    });
  return initPromise;
}

self.onmessage = async (ev: MessageEvent) => {
  const data = ev.data;
  const id = data?.id ?? 0;
  try {
    await ensureWasm();

    // x_mask and o_mask are expected to be BigInt values (structured clone supports BigInt).
    const moveIdx: number = find_ai_move(
      data.x_mask,
      data.o_mask,
      data.player,
      data.difficulty
    );

    // send result back
    // keep a simple message shape { id, move }
    (self as any).postMessage({ id, move: moveIdx });
  } catch (err: unknown) {
    (self as any).postMessage({ id, error: String(err) });
  }
};

export {};
