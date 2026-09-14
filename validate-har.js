const fs = require('fs').promises;
const path = require('path');
const { initializeLogger, addLog } = require('../core/logging/logger');
const { RegressionValidator } = require('../modules/regression/validator');
const { Reporter } = require('../core/logging/reporter');
const { fetchNetworkLogFromSession } = require('../core/browserstack/network-logs');
const { safeParseJson, readJsonFile, getLogFilePath, createElapsedTimeFormatter } = require('../core/utils');

// Shared log filename logic
const logFile = getLogFilePath();

/**
 * Creates default identifiers based on tag type
 * @param {string} tag - Tag type (e.g., "adobe", "isdk-bolt", "mux")
 * @param {Object} validationData - Validation data to extract identifiers from
 * @returns {Object} - Default identifiers object
 */
function createDefaultIdentifiers(tag, validationData) {
  const identifiers = {};
  
  if (tag === 'adobe') {
    // For Adobe, create identifiers from common fields
    if (validationData.events) {
      // Extract event number from events string (e.g., "event26" -> { events: "event26" })
      identifiers.events = validationData.events.split(',')[0]; // Use first event
    }
    if (validationData.pageName) {
      identifiers.pageName = validationData.pageName;
    } else if (validationData.page_name) {
      identifiers.page_name = validationData.page_name;
    }
    // Add pe=pageview as default for Adobe pageview calls
    if (!identifiers.pe) {
      identifiers.pe = 'pageview';
    }
    // Add event26 as fallback if no events specified
    if (!identifiers.events && !identifiers.event26) {
      identifiers.event26 = true;
    }
  } else if (tag === 'isdk-bolt') {
    // For iSDK BOLT, create identifiers from common fields
    if (validationData.event) {
      identifiers.event = validationData.event;
    }
    if (validationData.page) {
      identifiers.page = validationData.page;
    }
  }
  
  return identifiers;
}

/**
 * Loads validation rules from a standalone validation file
 * @param {string} validationFile - Path to validation JSON file
 * @param {string} tag - Tag to validate (e.g., "adobe", "isdk-bolt", "mux")
 * @param {Function} addLogWithTime - Logging function
 * @returns {Promise<Array>} - Array of validation rules
 */
async function loadValidationRulesFromFile(validationFile, tag, addLogWithTime) {
  await addLogWithTime(`[INFO] Loading validation file: ${validationFile}`);
  
  const fileData = await readJsonFile(validationFile, addLogWithTime);
  if (!fileData) {
    throw new Error(`Failed to read or parse validation file: ${validationFile}`);
  }
  
  // Validation files must use new format (validations array)
  if (!fileData.validations || !Array.isArray(fileData.validations)) {
    throw new Error(`Invalid validation file format: must contain a "validations" array`);
  }
  
  await addLogWithTime(`[INFO] Loading ${fileData.validations.length} validation(s) from file`);
  
  // Filter by tag if specified
  let validations = fileData.validations;
  if (tag) {
    validations = fileData.validations.filter(v => v.tag === tag);
    if (validations.length === 0) {
      await addLogWithTime(`[WARN] No validations found for tag: ${tag}`);
    } else {
      await addLogWithTime(`[INFO] Filtered to ${validations.length} validation(s) for tag: ${tag}`);
    }
  }
  
  // Validate that each validation has required fields
  for (let i = 0; i < validations.length; i++) {
    const validation = validations[i];
    if (!validation.tag) {
      await addLogWithTime(`[WARN] Validation ${i + 1} missing tag field - using provided tag: ${tag}`);
      validation.tag = tag;
    }
    if (!validation.validationData) {
      throw new Error(`Validation ${i + 1} missing validationData field`);
    }
    if (!validation.identifiers) {
      await addLogWithTime(`[WARN] Validation ${i + 1} missing identifiers - creating defaults`);
      validation.identifiers = createDefaultIdentifiers(validation.tag || tag, validation.validationData);
    }
  }
  
  return validations;
}

/**
 * Validates a BrowserStack session network log against validation rules
 * @param {Object} options - Validation options
 * @param {string} options.sessionId - BrowserStack session ID (required)
 * @param {string} options.validationFile - Path to validation rules JSON file (required)
 * @param {string} options.tag - Tag to validate (required, e.g., "adobe", "isdk-bolt", "mux")
 * @param {string} options.buildName - Optional build name for app-automate sessions
 * @param {string} options.saveHar - Optional path to save HAR content to file
 * @returns {Promise<Object>} - Validation results
 */
async function runHarValidation(options = {}) {
  const { sessionId, validationFile, tag, buildName, saveHar } = options;

  // Validate input options
  if (!sessionId) {
    throw new Error('BrowserStack session ID (--session-id) is required');
  }
  
  if (!validationFile) {
    throw new Error('Validation file (--validation-file) is required');
  }
  
  if (!tag) {
    throw new Error('Tag (--tag) is required');
  }

  // Initialize logger
  await initializeLogger(logFile);

  // Helper for elapsed timestamps
  const startTime = Date.now();
  const getElapsedTime = createElapsedTimeFormatter(startTime);
  const addLogWithTime = async (message) => {
    await addLog(`[${getElapsedTime()}] ${message}`);
  };

  await addLog('========================================');
  await addLog('=== HAR VALIDATION START ===');
  await addLog(`Date: ${new Date()}`);
  await addLog('========================================');

  const results = {
    testName: 'HAR Validation',
    brand: null,
    environment: null,
    domain: null,
    passed: false,
    validationResults: null,
    error: null
  };

  try {
    // Load validation rules from validation file
    await addLogWithTime(`[INFO] Loading validation file with tag: ${tag}`);
    const validationRules = await loadValidationRulesFromFile(validationFile, tag, addLogWithTime);
    results.testName = `HAR Validation - ${tag}`;
    results.brand = 'N/A';
    results.environment = 'N/A';
    results.domain = 'N/A';

    if (!validationRules || validationRules.length === 0) {
      throw new Error('No validation rules found');
    }

    // Fetch network log from BrowserStack session
    await addLogWithTime(`[INFO] Fetching network log from BrowserStack session: ${sessionId}`);
    if (buildName) {
      await addLogWithTime(`[INFO] Using build name for app-automate session: ${buildName}`);
    }
    const harContent = await fetchNetworkLogFromSession(sessionId, buildName);
    if (!harContent) {
      throw new Error(`Failed to fetch network log from BrowserStack session: ${sessionId}`);
    }

    // Save HAR to file if requested
    if (saveHar) {
      const savePath = path.resolve(process.cwd(), typeof saveHar === 'string' ? saveHar : 'logs/last-run.har.json');
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, harContent, 'utf8');
      await addLogWithTime(`[INFO] Network log saved to: ${savePath}`);
    }

    // Validate HAR against validation rules
    await addLogWithTime(`[INFO] Validating network calls from HAR log against ${validationRules.length} rule(s)...`);
    const validationResults = await RegressionValidator.validate(
      harContent,
      validationRules,
      addLogWithTime
    );

    results.validationResults = validationResults;
    const unmatchedRulesCount = validationResults.unmatchedRules ? validationResults.unmatchedRules.length : 0;
    results.passed = validationResults.failed.length === 0 && unmatchedRulesCount === 0;

    // Generate summary report (no step results in offline mode)
    await Reporter.generateRegressionSummary(results, null);

    if (results.passed) {
      await addLogWithTime('[INFO] HAR validation PASSED');
    } else {
      await addLogWithTime('[ERROR] HAR validation FAILED');
    }

    return results;
  } catch (error) {
    results.error = error.message;
    await addLogWithTime(`[ERROR] HAR validation failed: ${error.message}`);

    // Ensure summary still prints even on fatal error
    await Reporter.generateRegressionSummary(results, null);
    throw error;
  }
}

module.exports = { runHarValidation };


