#!/usr/bin/env node

/**
 * Forest2 Expansion - Main Entry Point
 * 
 * This is the main entry point for the expanded Forest2 testing framework.
 * It supports multiple modes: nightly scan and regression testing.
 * 
 * Usage:
 *   node forest2-expansion.js nightly [sitelist.csv]
 *   node forest2-expansion.js regression --test-file tests/brand-web-desktop-prod-regression.json
 *   node forest2-expansion.js regression --test-file tests/brand-web-mobile-prod-regression.json --browser-string android-chrome-mobile
 *   node forest2-expansion.js regression --test-file tests/my-app-regression.json --app bs://<id> [--save-har logs/run.har.json] [--skip-notifications]
 *
 * Exit codes: regression exits 0 when the run finishes without uncaught errors; test pass or fail is not mapped to exit code (see docs/USAGE_GUIDE.md#regression-exit-code-ci-and-scripts). validate-har sets exit code 1 when validation fails.
 */

const { runNightlyScan } = require('./src/runners/nightly');
const { runRegressionTest } = require('./src/runners/regression');
const { runHarValidation } = require('./src/runners/validate-har');

// Get command line arguments
const args = process.argv.slice(2);
const mode = args[0];

/**
 * Parses command line arguments into an options object
 * @param {Array} args - Command line arguments
 * @returns {Object} - Parsed options
 */
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const rawKey = args[i].substring(2);
      // Handle both --browser-string and --browserString
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++; // Skip next argument as it's the value
      } else {
        options[key] = true; // Flag without value
      }
    }
  }
  return options;
}

/**
 * Main entry point
 */
async function main() {
  if (!mode) {
    console.error('Error: No mode specified');
    console.log('\nUsage:');
    console.log('  node forest2-expansion.js nightly [sitelist.csv]');
    console.log('  node forest2-expansion.js regression --test-file <file> [--browser-string <browser>] [--app bs://...] [--save-har <path>] [--skip-notifications]');
    console.log('  node forest2-expansion.js regression --brand <brand> [--browser-string <browser>]');
    console.log('    Browser examples: win-chrome-desktop, mac-safari-desktop, win-chrome-mobile');
    console.log('    Default: win-chrome-desktop');
    console.log('  node forest2-expansion.js validate-har --session-id <id> --validation-file <file> --tag <tag> [--build-name <name>]');
    process.exit(1);
  }

  switch (mode) {
    case 'nightly':
      // Nightly scan mode
      const siteListFile = args[1] || 'sitelist.csv';
      await runNightlyScan(siteListFile);
      break;

    case 'regression':
      // Regression testing mode (supports both --test-file and --brand)
      const regressionOptions = parseArgs(args.slice(1));
      if (!regressionOptions.brand && !regressionOptions.testFile) {
        console.error('Error: --brand or --test-file is required for regression mode');
        console.error('  Recommended: --test-file tests/{brand}-web-{device}-{env}-regression.json');
        process.exit(1);
      }
      // Map legacy --browser and --device to browserString if needed
      if (regressionOptions.browser && regressionOptions.device && !regressionOptions.browserString) {
        const os = regressionOptions.device === 'mobile' ? 'android' : 'win';
        regressionOptions.browserString = `${os}-${regressionOptions.browser}-${regressionOptions.device}`;
      }
      // Regression pass/fail is reported in logs and external notifications only; do not set exit code from test outcome.
      await runRegressionTest(regressionOptions);
      break;

    case 'validate-har':
      // Offline HAR validation mode
      const harOptions = parseArgs(args.slice(1));
      
      // Validate required options
      if (!harOptions.sessionId) {
        console.error('Error: --session-id is required for validate-har mode');
        console.error('  --session-id <id>         BrowserStack session ID to fetch network log');
        process.exit(1);
      }
      
      if (!harOptions.validationFile) {
        console.error('Error: --validation-file is required for validate-har mode');
        console.error('  --validation-file <path>  Path to validation rules JSON file');
        process.exit(1);
      }
      
      if (!harOptions.tag) {
        console.error('Error: --tag is required for validate-har mode');
        console.error('  --tag <tag>               Tag to validate (e.g., "adobe", "snowplow", "comscore", "isdk-bolt", "mux", "prism")');
        process.exit(1);
      }
      
      try {
        const harResults = await runHarValidation({
          sessionId: harOptions.sessionId,
          validationFile: harOptions.validationFile,
          tag: harOptions.tag,
          buildName: harOptions.buildName,
          saveHar: harOptions.saveHar
        });
        if (!harResults.passed) {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
      break;

    default:
      console.error(`Error: Unknown mode "${mode}"`);
      console.log('\nAvailable modes:');
      console.log('  nightly    - Run nightly site scan (original functionality)');
      console.log('  regression - Run regression tests from JSON file (recommended: --test-file)');
      console.log('  validate-har - Validate a BrowserStack session network log against validation rules');
      process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };

