import BaseModule from './baseModule.js';
import { BStackLogger } from '../cliLogger.js';
/**
 * CustomTagsModule — CLI/gRPC path registration for `browser.setCustomTags`.
 *
 * Mirrors AccessibilityModule: registers the browser method in onBeforeExecute()
 * (observer-bound to AutomationFrameworkState.CREATE / HookState.POST), instantiated
 * from BrowserstackCLI.loadModules() whenever the binary is up.
 *
 * The per-test custom_metadata is merged directly into the tracked
 * TestFrameworkInstance map under KEY_CUSTOM_TAGS ('custom_metadata'). That whole
 * map is serialized verbatim into event_json (testHubModule.sendTestFrameworkEvent),
 * so the binary reads it as event.custom_metadata. The instance is created fresh
 * per test, so per-instance merge gives test-scoped union/dedupe; the binary is a
 * strict pass-through and does NOT consolidate across events.
 */
export default class CustomTagsModule extends BaseModule {
    logger: typeof BStackLogger;
    name: string;
    static MODULE_NAME: string;
    /**
     * Tags set before a per-test context exists — e.g. from a `beforeEach` hook, which
     * WDIO runs BEFORE `beforeTest` tracks the test instance. Buffered here and flushed
     * into the test at test start (onBeforeTest), then reset per-test, so hook-set tags
     * land on the test (parity with Java @Before). Process-local (one module per worker)
     * and Mocha runs tests serially, so a plain object is safe.
     */
    private pendingTestLevelTags;
    constructor();
    getModuleName(): string;
    onBeforeExecute(): Promise<void>;
    /**
     * At each test start (TEST/PRE — after beforeTest tracks the instance), flush any
     * tags buffered before the test had a context (e.g. set in a `beforeEach` hook — see
     * the setCustomTags closure) into the tracked instance's custom_metadata via the SAME
     * merge path as explicit setCustomTags, then reset the buffer for the next test — so
     * hook-set tags union onto the test (parity with Java @Before).
     */
    onBeforeTest(args: Record<string, unknown>): Promise<void>;
    /**
     * If the test framework is currently inside a hook, merge custom_metadata onto
     * the last-started hook record so the binary receives hook.custom_metadata.
     * Best-effort: silently no-ops when no active hook is resolvable.
     */
    private applyToActiveHook;
}
