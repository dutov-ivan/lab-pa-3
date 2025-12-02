/* tslint:disable */
/* eslint-disable */
export function find_ai_move(x_mask: bigint, o_mask: bigint, player: number, difficulty: AiDifficulty): number;
export function check_game_state(x_mask: bigint, o_mask: bigint): GameState;
export function get_winning_mask(x_mask: bigint, o_mask: bigint): bigint;
export enum AiDifficulty {
  Easy = 0,
  Medium = 1,
  Hard = 2,
}
export enum GameState {
  Ongoing = 0,
  Draw = 1,
  XWins = 2,
  OWins = 3,
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly find_ai_move: (a: bigint, b: bigint, c: number, d: number) => number;
  readonly check_game_state: (a: bigint, b: bigint) => number;
  readonly get_winning_mask: (a: bigint, b: bigint) => bigint;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
