import BaseModule from './baseModule.js';
import { BStackLogger } from '../cliLogger.js';
/**
 * TestHub Module for BrowserStack
 */
export default class TestHubModule extends BaseModule {
    logger: typeof BStackLogger;
    testhubConfig: unknown;
    name: string;
    static MODULE_NAME: string;
    /**
     * Mocha-only: the TEST/POST (TestRunFinished) send deferred past the after-each hook
     * window. WDIO fires `afterTest` (which triggers TEST/POST) BEFORE the user's
     * `afterEach` hooks run, so custom tags set in `afterEach` would otherwise miss the
     * event. The payload (`eventJson`) is serialized from the instance's live data map at
     * SEND time, so deferring the send picks up those late merges; uuid / started_at /
     * ended_at are already stamped in the data and do not drift. The stashed
     * `args.instance` is the finished test's OWN object — INIT_TEST replaces the tracked
     * slot with a fresh instance for the next test — so it stays valid across tests.
     * Flushed at the next test's first event (INIT_TEST / TEST PRE) or, for the worker's
     * last test, from service.after() via flushPendingTestFinishEvent().
     */
    private pendingTestFinish;
    /**
     * Create a new TestHubModule
     */
    constructor(testhubConfig: unknown);
    /**
     * Get the module name
     * @returns {string} The module name
     */
    getModuleName(): string;
    onBeforeTest(args: Record<string, unknown>): void;
    onAllTestEvents(args: Record<string, unknown>): void;
    /**
     * Send a deferred TEST/POST (TestRunFinished) event, if one is pending. The instance's
     * CURRENT state may have moved on (e.g. LOG events during afterEach), so the send uses
     * an explicit TEST/POST state override; the payload data itself is read fresh from the
     * instance so late custom-tag merges are included. Called from onAllTestEvents at the
     * next test's boundary and from service.after() at worker end.
     */
    flushPendingTestFinishEvent(): Promise<void> | undefined;
    sendTestFrameworkEvent(args: Record<string, unknown>, stateOverride?: {
        testFrameworkState: string;
        testHookState: string;
    }): Promise<boolean>;
    /**
     * Send test session event to the service
     * @param args containing test session data
     */
    sendTestSessionEvent(args: Record<string, unknown>): Promise<void>;
    sendLogCreatedEvent(args: Record<string, unknown>): Promise<void>;
}
