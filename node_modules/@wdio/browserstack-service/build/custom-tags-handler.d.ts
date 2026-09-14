import { CustomTagAccumulator } from './customTags.js';
import type { CustomMetadata } from './customTags.js';
/**
 * Legacy/Listener-path handler for `browser.setCustomTags`.
 *
 * Registered from service.ts in the `!BrowserstackCLI.getInstance().isRunning()`
 * branch (alongside AccessibilityHandler.before() / InsightsHandler.before()).
 * Deliberately NOT folded into InsightsHandler.before() — that method registers
 * no browser methods and is SKIPPED when the CLI is running.
 *
 * Accumulates (key, value) pairs per active test, keyed on
 * InsightsHandler.currentTest.uuid (set in beforeTest / setTestData). The
 * accumulator is static so InsightsHandler.getRunData can drain it into the
 * TestData.custom_metadata field at TestRunFinished (flushed in afterTest).
 */
declare class _CustomTagsHandler {
    private _browser;
    private _caps;
    private _framework?;
    static accumulator: CustomTagAccumulator;
    constructor(_browser: WebdriverIO.Browser | WebdriverIO.MultiRemoteBrowser, _caps: WebdriverIO.Capabilities | Record<string, unknown>, _framework?: string | undefined);
    before(): void;
    /** Drain the accumulated custom_metadata for a test uuid; clears after read. */
    static drain(testUuid: string | undefined): CustomMetadata | undefined;
}
declare const CustomTagsHandler: typeof _CustomTagsHandler;
type CustomTagsHandler = _CustomTagsHandler;
export default CustomTagsHandler;
