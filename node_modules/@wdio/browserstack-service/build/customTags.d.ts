/**
 * Helpers for one-to-many custom-tag (Test-Case-ID) tagging.
 *
 * Both runtime paths (CLI/gRPC module + legacy listener handler) funnel through
 * the same tokenizer + merge engine so they produce an identical `custom_metadata`
 * payload shape:
 *   { [key]: { field_type: 'multi_dropdown', values: [...] } }
 *
 * The binary is a strict pass-through for per-test/per-hook `custom_metadata` — it
 * does NOT merge or dedupe across events — so the union+dedupe (set semantics)
 * MUST be completed SDK-side before serialization. Value parsing mirrors the
 * node-agent quote-aware tokenizer (helper.js `parseCommaSeparatedValues`).
 */
export interface CustomMetadataEntry {
    field_type: 'multi_dropdown';
    values: string[];
}
export type CustomMetadata = Record<string, CustomMetadataEntry>;
/**
 * Quote-aware comma split. Mirrors node-agent `helper.js` tokenizer
 * `/\s*"([^"]*)"\s*|[^,]+/g` — a quoted body is preserved verbatim (so an
 * embedded comma is kept), otherwise the raw token is trimmed; empties dropped.
 *   '"checkout,cart", header' -> ['checkout,cart', 'header']
 *   'TC-1, TC-2'              -> ['TC-1', 'TC-2']
 * Backward compatible: unquoted input tokenizes identically to a naive
 * split(',').map(trim).filter(Boolean).
 */
export declare function parseCommaSeparatedValues(value: string | string[] | undefined | null): string[];
/**
 * Union + dedupe, existing-first ordering. Mirrors node-agent
 * `CustomTagManager.mergeValues` — repeated calls accumulate, they do not override.
 */
export declare function mergeValues(existingValues: string[] | undefined | null, incomingValues: string[] | undefined | null): string[];
/**
 * Create-or-merge a single tag key inside a `custom_metadata` container.
 * Always produces `{ field_type: 'multi_dropdown', values: [...] }`; merges values
 * via mergeValues. The container is mutated in place and returned for chaining.
 * Mirrors node-agent `CustomTagManager.mergeIntoTags`.
 */
export declare function mergeIntoTags(tagsContainer: CustomMetadata, key: string, incomingValues: string[]): CustomMetadata;
/**
 * Per-test-uuid accumulator. Both paths key on `InsightsHandler.currentTest.uuid`
 * so repeated `setCustomTags` calls within a single test union into one entry, and
 * the flush sink reads the final consolidated map for that test.
 */
export declare class CustomTagAccumulator {
    private store;
    /**
     * Add (key, value) for a test uuid. value is quote-aware comma-split; the
     * resulting values union+dedupe into the test's custom_metadata for that key.
     * Returns false (no-op) when uuid/key/value resolve to nothing.
     */
    add(testUuid: string | undefined, key: string, value: string): boolean;
    /** Final consolidated custom_metadata for a test uuid, or undefined if none. */
    get(testUuid: string | undefined): CustomMetadata | undefined;
    /** Drop the accumulated entry once flushed (avoid unbounded growth). */
    clear(testUuid: string | undefined): void;
}
export type MochaHookWindow = 'before_each' | 'after_each' | 'before_all' | 'after_all' | null;
/**
 * Classify a Mocha hook title (e.g. '"before each" hook: setup') into a window type.
 * Derives from getHookType so this and the tracked hook-state — both computed from the
 * same hook title in service.beforeHook — can never disagree. getHookType anchors on
 * Mocha's generated '"before each"' prefix (startsWith), so a hook with a custom name
 * that merely contains another window's phrase (e.g. afterEach('reset before each run'))
 * is NOT misrouted, unlike a substring match.
 */
export declare function classifyMochaHookTitle(title: string | undefined | null): MochaHookWindow;
/** Set by the service's beforeHook (mocha); cleared by afterHook. */
export declare function setCurrentMochaHookWindow(window: MochaHookWindow): void;
/** Read by the CLI CustomTagsModule to route setCustomTags calls made inside hooks. */
export declare function getCurrentMochaHookWindow(): MochaHookWindow;
