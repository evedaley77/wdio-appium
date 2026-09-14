const { initializeLogger, addLog } = require('../core/logging/logger');
const { BrowserConfig } = require('../core/config/browser-config');
const { TestLoader } = require('../modules/regression/test-loader');
const { RegressionRunner } = require('../modules/regression/runner');
const { getLogFilePath, formatDateYYYYMMDD, createElapsedTimeFormatter } = require('../core/utils');

// Configuration
const logFile = getLogFilePath();

/**
 * App runner registry - maps runner names from test config JSON to their module and display name.
 * Used only for app tests that require complex conditional logic not expressible in JSON steps.
 * Most app tests now use JSON-defined steps in the test config (same as web tests).
 * To add a new hardcoded app runner, add an entry here and create the corresponding module file.
 */
const APP_RUNNERS = {
  // All app tests now use JSON-defined steps. This registry is kept for future hardcoded runners if needed.
};

/**
 * Main entry point for regression testing
 * @param {Object} options - Regression test options
 * @param {string} options.testFile - Path to test file (required for custom mode)
 * @param {string} options.brand - Brand name (optional, for brand-based test loading)
 * @param {string} options.browserString - Browser string (e.g., 'win-chrome-desktop', 'mac-safari-desktop')
 *                                        Default: 'win-chrome-desktop' if not provided
 * @param {string} [options.app] - App Automate only: overrides `app` from JSON (`bs://...`), from `--app`
 * @param {string|boolean} [options.saveHar] - Write network log to this path, or true for `logs/last-run.har.json`, from `--save-har`
 * @param {boolean} [options.skipNotifications] - When true (or env FOREST2_SKIP_NOTIFICATIONS), skip Confluence updates and Slack failure alerts
 */
async function runRegressionTest(options = {}) {
  const {
    testFile = null,
    brand = null,
    browserString = null, // Will default to 'win-chrome-desktop' in BrowserConfig
    skipNotifications = false
  } = options;

  // Initialize logger
  await initializeLogger(logFile);

  // Helper function to format elapsed time
  const startTime = Date.now();
  const getElapsedTime = createElapsedTimeFormatter(startTime);
  const addLogWithTime = async (message) => {
    await addLog(`[${getElapsedTime()}] ${message}`);
  };

  await addLog('========================================');
  await addLog('=== REGRESSION TEST START ===');
  await addLog('Date: ' + new Date());
  if (browserString) {
    await addLog(`Browser: ${browserString}`);
  } else {
    await addLog(`Browser: win-chrome-desktop (default)`);
  }
  await addLog('========================================');

  try {
    // Load test configuration
    await addLogWithTime('[INFO] Loading test configuration...');
    let testConfig;

    if (testFile) {
      testConfig = await TestLoader.loadTest(testFile);
    } else if (brand) {
      testConfig = await TestLoader.loadBrandTest(brand);
    } else {
      throw new Error('Either brand or testFile must be specified');
    }

    // Pass saveHar from CLI for capture runs (saves network log to file)
    if (options.saveHar) {
      testConfig.saveHar = typeof options.saveHar === 'string' ? options.saveHar : 'logs/last-run.har.json';
    }

    // Optional BrowserStack app-automate app id (bs://...) without editing the test JSON
    if (options.app) {
      testConfig.app = options.app;
    }

    const envSkipNotifications = ['1', 'true', 'yes'].includes(
      String(process.env.FOREST2_SKIP_NOTIFICATIONS || '').trim().toLowerCase()
    );
    testConfig.skipExternalNotifications = Boolean(
      testConfig.skipExternalNotifications || skipNotifications === true || envSkipNotifications
    );
    if (testConfig.skipExternalNotifications) {
      await addLogWithTime(
        '[INFO] skipExternalNotifications: Confluence updates and Slack failure alerts are disabled for this run'
      );
    }

    // Priority: CLI workflow input > test file default > framework default
    const finalBrowserString = browserString || testConfig.browserString || 'win-chrome-desktop';
    // Persist effective browser string for downstream reporting (Confluence, summaries).
    testConfig.effectiveBrowserString = finalBrowserString;

    // CNN International: same JSON is reused for edition, Arabic, and Español. CI can set
    // PRISM_CNN_INTL_SITE_LABEL (e.g. edition.cnn.com) so Confluence rows show which site ran.
    const intlSiteLabel = process.env.PRISM_CNN_INTL_SITE_LABEL;
    if (
      intlSiteLabel
      && typeof testConfig.testName === 'string'
      && typeof testFile === 'string'
      && /cnn-international-regression\.json$/i.test(testFile)
    ) {
      testConfig.testName = testConfig.testName.replace(/\s*\(EMEA\)\s*$/i, ` - ${intlSiteLabel} (EMEA)`);
    }

    await addLogWithTime(`[INFO] Test configuration loaded: ${testConfig.testName || 'Unnamed'} (brand: ${testConfig.brand || 'N/A'}, environment: ${testConfig.environment || 'N/A'})`);
    if (options.app) {
      await addLogWithTime(`[INFO] App ID from CLI overrides JSON: ${testConfig.app}`);
    }
    await addLogWithTime(`[INFO] Effective browser string: ${finalBrowserString}`);

    // Determine if this is an app test
    const isAppTest = !!(testConfig.app || testConfig['appium:app']);
    const projectName = isAppTest ? 'forest2-regression-apps' : 'forest2-regression';

    // Load capabilities
    await addLogWithTime('[INFO] Loading BrowserStack capabilities...');
    const capabilities = await BrowserConfig.load({
      browserString: finalBrowserString,
      project: projectName,
      build: `Regression ${testConfig.brand || 'test'} ${formatDateYYYYMMDD()}`,
      geoLocation: testConfig.geoLocation || 'US',
      browserstackLocal: testConfig.browserstackLocal || false,
      browserstackLocalIdentifier: testConfig.browserstackLocalIdentifier || null,
      // App-specific fields for app-automate sessions
      app: testConfig.app || testConfig['appium:app'] || null,
      platformName: testConfig.platformName || testConfig['appium:platformName'] || null,
      appiumDeviceName: testConfig['appium:deviceName'] || null,
      appiumOsVersion: testConfig['appium:osVersion'] || null,
      appiumAutomationName: testConfig['appium:automationName'] || null,
      appiumNewCommandTimeout: testConfig['appium:newCommandTimeout'] || null
    });

    // Pass through BrowserStack-specific options from the test JSON (e.g. resignApp) into capabilities
    for (const key of Object.keys(testConfig)) {
      if (key.startsWith('browserstack.')) {
        capabilities[key] = testConfig[key];
      }
    }

    // Use app-specific runners for app tests, standard runner for web tests
    let results;
    if (isAppTest) {
      // App Automate: retry full run on navigation step failures (new session per attempt).
      const maxAttempts = 3;
      let attempt = 0;

      // Check if app test has JSON steps defined (use standard runner) or needs a hardcoded runner
      const hasJsonSteps = testConfig.steps && testConfig.steps.length > 0;

      if (hasJsonSteps) {
        // App test with JSON-defined steps: use the standard regression runner
        for (attempt = 1; attempt <= maxAttempts; attempt++) {
          if (attempt > 1) {
            await addLogWithTime(`[RETRY] === Attempt ${attempt}/${maxAttempts} === Previous attempt had navigation step failures, retrying with new session...`);
          } else {
            await addLogWithTime('[INFO] Using standard regression runner with JSON steps for app test');
          }

          results = await RegressionRunner.run(testConfig, capabilities, addLogWithTime);

          // If no step failures, no need to retry
          if (!results.stepResults || results.stepResults.failed === 0) {
            break;
          }

          // If there were step failures and we have retries left, log and continue
          if (attempt < maxAttempts) {
            await addLogWithTime(`[WARN] Attempt ${attempt}/${maxAttempts} had ${results.stepResults.failed} navigation step failure(s), retrying...`);
          } else {
            await addLogWithTime(
              maxAttempts === 1
                ? '[WARN] Navigation step failure(s); retries disabled, proceeding with last result'
                : `[WARN] All ${maxAttempts} attempts had navigation step failures, proceeding with last result`
            );
          }
        }
      } else {
        // App test with hardcoded runner: look up from registry
        const runnerKey = testConfig.runner;
        if (!runnerKey || !APP_RUNNERS[runnerKey]) {
          const available = Object.keys(APP_RUNNERS).join(', ');
          throw new Error(`Unknown or missing app test runner: "${runnerKey || '(not specified)'}". Set "runner" in your test config JSON to one of: ${available}, or define "steps" for JSON-driven execution.`);
        }

        const runnerEntry = APP_RUNNERS[runnerKey];
        const runnerModule = require(runnerEntry.module);
        const selectedRunner = runnerModule[runnerEntry.className];
        const runnerName = runnerEntry.displayName;

        for (attempt = 1; attempt <= maxAttempts; attempt++) {
          if (attempt > 1) {
            await addLogWithTime(`[RETRY] === Attempt ${attempt}/${maxAttempts} === Previous attempt had navigation step failures, retrying with new session...`);
          } else {
            await addLogWithTime(`[INFO] Using ${runnerName} runner`);
          }

          results = await selectedRunner.run(testConfig, capabilities, addLogWithTime);

          // If no step failures, no need to retry
          if (!results.stepResults || results.stepResults.failed === 0) {
            break;
          }

          // If there were step failures and we have retries left, log and continue
          if (attempt < maxAttempts) {
            await addLogWithTime(`[WARN] Attempt ${attempt}/${maxAttempts} had ${results.stepResults.failed} navigation step failure(s), retrying...`);
          } else {
            await addLogWithTime(
              maxAttempts === 1
                ? '[WARN] Navigation step failure(s); retries disabled, proceeding with last result'
                : `[WARN] All ${maxAttempts} attempts had navigation step failures, proceeding with last result`
            );
          }
        }
      }

      // Attach attempt info to results for reporting (clamp: for-loop leaves attempt at maxAttempts+1 when the last run did not break early)
      results.attempt = Math.min(attempt, maxAttempts);
      results.maxAttempts = maxAttempts;
    } else {
      await addLogWithTime('[INFO] Using standard regression runner');
      results = await RegressionRunner.run(testConfig, capabilities, addLogWithTime);
    }

    // Display results
    await addLogWithTime('');
    await addLogWithTime('========================================');
    await addLogWithTime('=== REGRESSION TEST RESULTS ===');
    await addLogWithTime('========================================');
    await addLogWithTime(`Test: ${results.testName}`);
    await addLogWithTime(`Result: ${results.passed ? 'PASSED' : 'FAILED'}`);

    if (results.attempt && results.attempt > 1) {
      await addLogWithTime(`Attempts: ${results.attempt}/${results.maxAttempts}`);
    }

    if (results.validationResults) {
      await addLogWithTime(`Passed: ${results.validationResults.passed.length}`);
      await addLogWithTime(`Failed: ${results.validationResults.failed.length}`);
      await addLogWithTime(`Unexpected: ${results.validationResults.missing.length}`);
      if (results.validationResults.unmatchedRules && results.validationResults.unmatchedRules.length > 0) {
        await addLogWithTime(`Missing (Expected but Not Found): ${results.validationResults.unmatchedRules.length}`);
      }
    }

    if (results.confluencePageUrl) {
      await addLogWithTime(`📄 Confluence Page: ${results.confluencePageUrl}`);
    }

    if (results.error) {
      await addLogWithTime(`Error: ${results.error}`);
    }

    await addLogWithTime('========================================');

    return results;
  } catch (error) {
    await addLogWithTime(`[ERROR] Regression test failed: ${error.message}`);
    throw error;
  }
}

module.exports = { runRegressionTest };

