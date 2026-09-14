const fs = require('fs').promises;
const { initializeLogger, addLog } = require('../core/logging/logger');
const { buildCapabilities } = require('../core/browserstack/capabilities');
const { processSiteList } = require('../modules/nightly/scanner');
const { updateNightlyScanConfluencePage } = require('../core/notifications/confluence');
const { getLogFilePath, formatDateYYYYMMDD } = require('../core/utils');

// Configuration
const logFile = getLogFilePath();

function getUniqueSites(sitesArray) {
  return [...new Set(sitesArray)];
}

/** Redirect lines use this exact separator (see site-processor.js); avoid /-->/ regex (CodeQL js/bad-tag-filter). */
const NIGHTLY_REDIRECT_ARROW = ' --> ';

/** Normalize CSV site line (strip redirect suffix) for comparisons */
function nightlySiteKey(line) {
  const s = String(line || '').trim();
  const i = s.indexOf(NIGHTLY_REDIRECT_ARROW);
  if (i === -1) return s;
  return s.slice(0, i).trim();
}

/**
 * Build per-site failure rows for Confluence "Failed Sites" column (same buckets as totalFailed).
 * @param {Object} tracking
 * @param {Set<string>} uniqueFailedSites
 * @returns {{ site: string, url: string, reason: string }[]}
 */
function buildFailedSitesWithDetails(tracking, uniqueFailedSites) {
  const keys = Array.from(uniqueFailedSites).sort((a, b) => {
    const ua = (a.split(',')[2] || '').toLowerCase();
    const ub = (b.split(',')[2] || '').toLowerCase();
    return ua.localeCompare(ub);
  });

  const hasIn = (arr, key) => (arr || []).some((entry) => nightlySiteKey(entry) === key);

  const out = [];
  for (const key of keys) {
    const reasons = [];
    if (hasIn(tracking.sitesFailedOpen, key)) reasons.push('Failed to open');
    if (hasIn(tracking.sitesMissingValidationFile, key)) reasons.push('Missing validation file (SDR)');
    if (hasIn(tracking.sitesFailedAdobeValidation, key)) reasons.push('Failed Adobe validation');
    if (hasIn(tracking.sitesMissingAdobeRequest, key)) reasons.push('Missing Adobe Analytics request');
    if (hasIn(tracking.sitesRedirected, key)) reasons.push('Unexpected redirect');
    if (hasIn(tracking.sitesFailedOneTrust, key)) reasons.push('OneTrust consent failed');

    const parts = key.split(',');
    const url = (parts[2] || '').trim();
    out.push({
      site: key,
      url: url || key,
      reason: reasons.length > 0 ? reasons.join('; ') : 'Failed (see nightly logs)'
    });
  }
  return out;
}

/**
 * Builds the Confluence nightly dashboard payload expected by updateNightlyScanConfluencePage.
 * @param {Object} tracking - Tracking object from processSiteList
 * @param {number} totalSites - Number of sites in the CSV (header excluded)
 * @returns {Object} - Results object for updateNightlyScanConfluencePage
 */
function buildNightlyConfluenceResults(tracking, totalSites) {
  const uniqueFailedAdobe = getUniqueSites(tracking.sitesFailedAdobeValidation);
  const uniqueMissingAdobe = getUniqueSites(tracking.sitesMissingAdobeRequest);
  const uniqueFailedOpen = getUniqueSites(tracking.sitesFailedOpen);
  const uniqueRedirected = getUniqueSites(tracking.sitesRedirected);
  const uniqueMissingSDR = getUniqueSites(tracking.sitesMissingValidationFile);
  const uniqueFailedOneTrust = getUniqueSites(tracking.sitesFailedOneTrust);

  const uniqueFailedSites = new Set();
  uniqueFailedOpen.forEach((site) => uniqueFailedSites.add(site));
  uniqueMissingSDR.forEach((site) => uniqueFailedSites.add(site));
  uniqueFailedAdobe.forEach((site) => uniqueFailedSites.add(site));
  uniqueMissingAdobe.forEach((site) => uniqueFailedSites.add(site));
  uniqueRedirected.forEach((site) => {
    uniqueFailedSites.add(nightlySiteKey(site));
  });
  uniqueFailedOneTrust.forEach((site) => uniqueFailedSites.add(site));

  const totalFailed = uniqueFailedSites.size;
  const totalPassed = totalSites - totalFailed;

  const nightlyBuildIds = tracking.nightlyBuildIds instanceof Set ? tracking.nightlyBuildIds : new Set();
  const firstBuildId = Array.from(nightlyBuildIds)[0] || null;
  const browserstackBuildLink = firstBuildId
    ? `https://automate.browserstack.com/dashboard/v2/builds/${firstBuildId}?projectIds=2152428`
    : null;

  return {
    totalSites,
    totalPassed,
    totalFailed,
    failedAdobeValidation: uniqueFailedAdobe,
    missingAdobeRequest: uniqueMissingAdobe,
    failedOpen: uniqueFailedOpen,
    redirected: uniqueRedirected,
    missingValidationFile: uniqueMissingSDR,
    failedOneTrust: uniqueFailedOneTrust,
    failedSitesWithDetails: buildFailedSitesWithDetails(tracking, uniqueFailedSites),
    browserstackBuildLink
  };
}

/**
 * Main entry point for nightly scan
 * @param {string} siteListFile - Path to site list file (default: 'sitelist.csv')
 */
async function runNightlyScan(siteListFile = 'sitelist.csv') {
  const envSkipNotifications = ['1', 'true', 'yes'].includes(
    String(process.env.FOREST2_SKIP_NOTIFICATIONS || '').trim().toLowerCase()
  );

  // Initialize logger
  await initializeLogger(logFile);
  
  // Initialize logging
  await addLog('========================================');
  await addLog('=== ADOBE ANALYTICS VALIDATION START ===');
  await addLog('Date: ' + new Date());
  await addLog('Site List: ' + siteListFile);
  if (envSkipNotifications) {
    await addLog('[INFO] skipExternalNotifications: Confluence updates and Slack failure alerts are disabled for this run');
  }
  await addLog('========================================');
  
  // Build capabilities
  const capabilities = buildCapabilities({
    project: 'forest2',
    build: `Nightly Scan ${formatDateYYYYMMDD()}`,
    name: 'Adobe Pageview',
    os: 'Windows',
    osVersion: '10',
    browser: 'chrome',
    browserVersion: 'latest',
    geoLocation: 'US',
    idleTimeout: 600
  });
  
  // Load site list and start processing
  await addLog('[INFO] Loading site list from file...');
  try {
    const data = await fs.readFile(siteListFile, 'utf8');
    await addLog('[INFO] Site list file loaded successfully');
    const { tracking, totalSites } = await processSiteList(data, capabilities, siteListFile);

    const confluenceResults = buildNightlyConfluenceResults(tracking, totalSites);
    await addLog('');
    await addLog('========================================');
    await addLog('=== ADOBE ANALYTICS VALIDATION COMPLETE ===');
    await addLog('Date: ' + new Date());
    await addLog(`Total Sites Tested: ${confluenceResults.totalSites}`);
    await addLog(`Passed: ${confluenceResults.totalPassed}`);
    await addLog(`Failed: ${confluenceResults.totalFailed}`);
    await addLog('========================================');

    if (envSkipNotifications) {
      await addLog('[INFO] Skipping Confluence update (skipExternalNotifications)');
    } else {
      try {
        const confluenceUrl = await updateNightlyScanConfluencePage(confluenceResults);
        if (confluenceUrl) {
          await addLog(`[INFO] Confluence page updated: ${confluenceUrl}`);
        }
      } catch (confluenceErr) {
        await addLog(`[WARN] Failed to update Confluence page: ${confluenceErr.message}`);
      }
    }

    process.exit(0);
  } catch (error) {
    await addLog(`[ERROR] ${error.code === 'ENOENT' ? 'Failed to load site list file' : 'Fatal error during site processing'}: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const siteListFile = process.argv[2] || 'sitelist.csv';
  runNightlyScan(siteListFile);
}

module.exports = { runNightlyScan };

