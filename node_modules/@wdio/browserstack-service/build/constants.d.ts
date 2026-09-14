import type { BrowserstackConfig } from './types.js';
export declare const BROWSER_DESCRIPTION: readonly ["device", "os", "osVersion", "os_version", "browserName", "browser", "browserVersion", "browser_version"];
export declare const VALID_APP_EXTENSION: string[];
export declare const DEFAULT_OPTIONS: Partial<BrowserstackConfig>;
export declare const consoleHolder: typeof console;
export declare const DATA_ENDPOINT = "https://collector-observability.browserstack.com";
export declare const APP_ALLY_ENDPOINT = "https://app-accessibility.browserstack.com/automate";
export declare const APP_ALLY_ISSUES_ENDPOINT = "api/v1/issues";
export declare const APP_ALLY_ISSUES_SUMMARY_ENDPOINT = "api/v1/issues-summary";
export declare const DATA_EVENT_ENDPOINT = "api/v1/event";
export declare const DATA_BATCH_ENDPOINT = "api/v1/batch";
export declare const DATA_SCREENSHOT_ENDPOINT = "api/v1/screenshots";
export declare const DATA_BATCH_SIZE = 1000;
export declare const DATA_BATCH_INTERVAL = 2000;
export declare const BATCH_EVENT_TYPES: string[];
export declare const DEFAULT_WAIT_TIMEOUT_FOR_PENDING_UPLOADS = 5000;
export declare const DEFAULT_WAIT_INTERVAL_FOR_PENDING_UPLOADS = 100;
export declare const BSTACK_SERVICE_VERSION: string;
export declare const NOT_ALLOWED_KEYS_IN_CAPS: string[];
export declare const BROWSERSTACK_TEST_PLAN_ID = "BROWSERSTACK_TEST_PLAN_ID";
export declare const LOGS_FILE = "logs/bstack-wdio-service.log";
export declare const CLI_DEBUG_LOGS_FILE = "log/sdk-cli-debug.log";
export declare const UPLOAD_LOGS_ADDRESS = "https://upload-observability.browserstack.com";
export declare const UPLOAD_LOGS_ENDPOINT = "client-logs/upload";
export declare const PERCY_LOGS_FILE = "logs/percy.log";
/**
 * Auto-capture of the user's wdio config file (SDK-7250).
 */
export declare const AUTOLOGCAPTURE_NOTIFICATION = "Your wdio config file, the local config files it imports and package.json are captured with the debug logs at the end of the run, with values under known credential keys removed. To disable, set disableAutoCaptureLogs: true in the browserstack service options.";
export declare const BROWSERSTACK_WDIO_CONFIG_FILE_PATH = "BROWSERSTACK_WDIO_CONFIG_FILE_PATH";
export declare const BROWSERSTACK_DISABLE_AUTO_CAPTURE_LOGS = "BROWSERSTACK_DISABLE_AUTO_CAPTURE_LOGS";
export declare const BROWSERSTACK_WDIO_CONFIG_STRATEGY = "BROWSERSTACK_WDIO_CONFIG_STRATEGY";
export declare const SUPPORTED_WDIO_CONFIG_EXTENSIONS: string[];
export declare const DEFAULT_WDIO_CONFIG_BASENAME = "wdio.conf";
export declare const WDIO_CLI_SUBCOMMANDS: string[];
export declare const MAX_CAPTURED_CONFIG_FILE_BYTES: number;
export declare const MAX_CAPTURED_CONFIG_FILES = 6;
export declare const CAPTURE_CONFIG_IMPORT_DEPTH = 1;
export declare const MAX_PACKAGE_JSON_WALK_UP = 5;
/**
 * Keys whose line is scrubbed before a config file enters the archive.
 * `user` / `key` are WDIO's own top-level credential options, hence the bare entries.
 */
/**
 * Word families that make an identifier sensitive when they appear as its SUFFIX —
 * `clientSecret`, `refreshToken`, `privateKey`, `client_secret`. Split by case so the
 * camelCase form requires a capital (distinguishing `privateKey` from `hotkey`) and the
 * snake_case form requires an explicit `_` (distinguishing `client_secret` from `keyword`).
 */
export declare const COMPOUND_SECRET_SUFFIXES_CAMEL = "Key|Token|Secret|Password|Passwd|Credential";
export declare const COMPOUND_SECRET_SUFFIXES_SNAKE = "key|token|secret|password|passwd|credential";
/**
 * Secrets that span lines or hide inside a value, which a line/key-anchored scrub cannot
 * reach. Applied as whole-block passes before the line passes.
 */
export declare const PEM_BLOCK_REGEX: RegExp;
export declare const PEM_UNTERMINATED_REGEX: RegExp;
export declare const URL_USERINFO_REGEX: RegExp;
export declare const REDACTED_KEYS: string[];
export declare const PERCY_DOM_CHANGING_COMMANDS_ENDPOINTS: string[];
export declare const CAPTURE_MODES: string[];
export declare const LOG_KIND_USAGE_MAP: {
    TEST_LOG: string;
    TEST_SCREENSHOT: string;
    TEST_STEP: string;
    HTTP: string;
};
export declare const FUNNEL_INSTRUMENTATION_URL = "https://api.browserstack.com/sdk/v1/event";
export declare const EDS_URL = "https://eds.browserstack.com";
export declare const SUPPORTED_BROWSERS_FOR_AI: string[];
export declare const TCG_URL = "https://tcg.browserstack.com";
export declare const TCG_INFO: {
    tcgRegion: string;
    tcgUrl: string;
};
export declare const SMART_SELECTION_MODE_RELEVANT_FIRST = "relevantFirst";
export declare const SMART_SELECTION_MODE_RELEVANT_ONLY = "relevantOnly";
export declare const BROWSERSTACK_TESTHUB_JWT = "BROWSERSTACK_TESTHUB_JWT";
export declare const BSTACK_TCG_AUTH_RESULT = "BSTACK_TCG_AUTH_RESULT";
export declare const TESTOPS_SCREENSHOT_ENV = "BS_TESTOPS_ALLOW_SCREENSHOTS";
export declare const BROWSERSTACK_TESTHUB_UUID = "BROWSERSTACK_TESTHUB_UUID";
export declare const BROWSERSTACK_KILL_SIGNAL = "BROWSERSTACK_SDK_KILL_SIGNAL";
export declare const TEST_ANALYTICS_ID = "TEST_ANALYTICS_ID";
export declare const PERF_MEASUREMENT_ENV = "BROWSERSTACK_O11Y_PERF_MEASUREMENT";
export declare const RERUN_TESTS_ENV = "BROWSERSTACK_RERUN_TESTS";
export declare const RERUN_ENV = "BROWSERSTACK_RERUN";
export declare const TESTOPS_BUILD_COMPLETED_ENV = "BS_TESTOPS_BUILD_COMPLETED";
export declare const BROWSERSTACK_PERCY = "BROWSERSTACK_PERCY";
export declare const BROWSERSTACK_ACCESSIBILITY = "BROWSERSTACK_ACCESSIBILITY";
export declare const BROWSERSTACK_OBSERVABILITY = "BROWSERSTACK_OBSERVABILITY";
export declare const BROWSERSTACK_LTS_SESSION_ID = "BROWSERSTACK_LTS_SESSION_ID";
export declare const BROWSERSTACK_LTS = "BROWSERSTACK_LTS";
export declare const BROWSERSTACK_TEST_REPORTING = "BROWSERSTACK_TEST_REPORTING";
export declare const BROWSERSTACK_TEST_REPORTING_DEBUG = "BROWSERSTACK_TEST_REPORTING_DEBUG";
export declare const TEST_REPORTING_BUILD_TAG = "TEST_REPORTING_BUILD_TAG";
export declare const TEST_REPORTING_PROJECT_NAME = "TEST_REPORTING_PROJECT_NAME";
export declare const TEST_REPORTING_BUILD_NAME = "TEST_REPORTING_BUILD_NAME";
export declare const MAX_GIT_META_DATA_SIZE_IN_BYTES: number;
export declare const GIT_META_DATA_TRUNCATED = "...[TRUNCATED]";
export declare const CLI_STOP_TIMEOUT = 5000;
export declare const BINARY_BUSY_ERROR_CODES: string[];
export declare const MAX_SPAWN_RETRIES = 3;
export declare const SPAWN_RETRY_DELAY_MS = 1000;
export declare const WDIO_NAMING_PREFIX = "WebdriverIO-";
export declare const PERF_METRICS_WAIT_TIME = 2000;
export declare const STOP_BUILD_MAX_ATTEMPTS = 4;
export declare const STOP_BUILD_ATTEMPT_TIMEOUT_MS = 10000;
export declare const STOP_BUILD_TOTAL_BUDGET_MS = 30000;
export declare const STOP_BUILD_BACKOFF_BASE_MS = 1000;
export declare const UPDATED_CLI_ENDPOINT = "sdk/v1/update_cli";
/**
 * Module Hook Events - Performance event names for module lifecycle tracking
 * Used by module-hook-tracker.ts to instrument module initialization and cleanup
 */
export declare const MODULE_HOOK_EVENTS: {
    readonly INSTRUMENTATION_ON_START: "MODULE_INSTRUMENTATION_ON_START";
    readonly INSTRUMENTATION_ON_STOP: "MODULE_INSTRUMENTATION_ON_STOP";
    readonly TESTHUB_ON_START: "MODULE_TESTHUB_ON_START";
    readonly TESTHUB_ON_STOP: "MODULE_TESTHUB_ON_STOP";
    readonly OBSERVABILITY_ON_START: "MODULE_OBSERVABILITY_ON_START";
    readonly OBSERVABILITY_ON_STOP: "MODULE_OBSERVABILITY_ON_STOP";
    readonly PERCY_ON_START: "MODULE_PERCY_ON_START";
    readonly PERCY_ON_STOP: "MODULE_PERCY_ON_STOP";
    readonly ACCESSIBILITY_ON_START: "MODULE_ACCESSIBILITY_ON_START";
    readonly ACCESSIBILITY_ON_STOP: "MODULE_ACCESSIBILITY_ON_STOP";
    readonly ACCESSIBILITY_ON_DRIVER_INIT: "MODULE_ACCESSIBILITY_ON_DRIVER_INIT";
    readonly AI_ON_START: "MODULE_AI_ON_START";
    readonly AI_ON_STOP: "MODULE_AI_ON_STOP";
    readonly AI_BEFORE_SESSION: "MODULE_AI_BEFORE_SESSION";
    readonly AI_ON_DRIVER_INIT: "MODULE_AI_ON_DRIVER_INIT";
    readonly LOCAL_ON_START: "MODULE_LOCAL_ON_START";
    readonly LOCAL_ON_STOP: "MODULE_LOCAL_ON_STOP";
    readonly LOCAL_INIT_SESSION: "MODULE_LOCAL_INIT_SESSION";
    readonly LOCAL_ON_DRIVER_INIT: "MODULE_LOCAL_ON_DRIVER_INIT";
    readonly APPAUTOMATE_ON_START: "MODULE_APPAUTOMATE_ON_START";
    readonly APPAUTOMATE_ON_DRIVER_INIT: "MODULE_APPAUTOMATE_ON_DRIVER_INIT";
};
