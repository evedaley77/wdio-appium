import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { NETWORK_LOG_HOOK, NETWORK_LOG_HOOK_NAME } from './network.logs.js'

const require = createRequire(import.meta.url)

const UNDETECTED = 'NOT DETECTED'

function reportDir () {
    return path.resolve(process.env.BASELINE_REPORT_DIR || 'reports')
}

function versionFromTree (name, startDirectory) {
    const segments = name.split('/')
    let directory = startDirectory
    while (true) {
        const candidate = path.join(directory, 'node_modules', ...segments, 'package.json')
        if (fs.existsSync(candidate)) {
            try {
                return JSON.parse(fs.readFileSync(candidate, 'utf8')).version
            } catch {
                return undefined
            }
        }
        const parent = path.dirname(directory)
        if (parent === directory) return undefined
        directory = parent
    }
}

/**
 * Versions are read from the installed tree so the report can never drift from
 * what actually ran. Never hardcode a version here.
 */
function packageVersion (name) {
    try {
        return require(`${name}/package.json`).version
    } catch {
        // Package may not expose ./package.json through its exports map.
    }

    const roots = [path.dirname(fileURLToPath(import.meta.url)), process.cwd()]
    for (const root of roots) {
        const version = versionFromTree(name, root)
        if (version) return version
    }
    return UNDETECTED
}

function normalizeCapabilities (capabilities) {
    if (!capabilities) return []
    const entries = Array.isArray(capabilities) ? capabilities : Object.values(capabilities)
    return entries
        .map(entry => entry?.capabilities?.alwaysMatch ?? entry?.capabilities ?? entry)
        .filter(entry => entry && typeof entry === 'object')
}

function describeDevices (capabilities) {
    return normalizeCapabilities(capabilities).map(caps => ({
        platformName: caps.platformName ?? caps.platform ?? null,
        platformVersion: caps['appium:platformVersion'] ?? null,
        deviceName: caps['appium:deviceName'] ?? null,
        automationName: caps['appium:automationName'] ?? null,
        app: caps['appium:app'] ?? null,
        sessionName: caps['bstack:options']?.sessionName ?? null,
        networkLogs: caps['bstack:options']?.networkLogs === true
    }))
}

/**
 * Network logging is only reported as enabled when both halves are present:
 * BrowserStack has to record the HAR, and the config has to pull it down.
 */
function deriveNetworkLogging (capabilities, config) {
    const caps = normalizeCapabilities(capabilities)
    const capabilityFlag = caps.length > 0 &&
        caps.every(entry => entry['bstack:options']?.networkLogs === true)

    const afterSessionHooks = [].concat(config?.afterSession ?? [])
    const harHook = afterSessionHooks.some(hook => typeof hook === 'function' &&
        (hook[NETWORK_LOG_HOOK] === true || hook.name.includes(NETWORK_LOG_HOOK_NAME)))

    return { enabled: capabilityFlag && harHook, capabilityFlag, harHook }
}

function summarizeResults (results) {
    const passed = Number(results?.passed ?? 0)
    const failed = Number(results?.failed ?? 0)
    const retries = Number(results?.retries ?? 0)
    // The launcher only reports `finished`; anything finished that neither
    // passed nor failed was skipped (spec file contained no runnable tests).
    const finished = Number(results?.finished ?? passed + failed)
    const skipped = Math.max(0, finished - passed - failed)

    return { tests: finished, passed, failed, skipped, retries }
}

function deriveKnownIssues ({ counts, specOutcomes, specOutcomesCollected, networkLogging }) {
    const issues = []

    if (counts.tests === 0) {
        issues.push('No spec files completed in this run, so there is nothing measured to report.')
    }

    const failedSpecs = specOutcomes.filter(outcome => outcome.status === 'failed')
    if (failedSpecs.length > 0) {
        failedSpecs.forEach(outcome => {
            issues.push(`Failed spec: ${outcome.specs.join(', ')} (worker ${outcome.cid}, exit code ${outcome.exitCode})`)
        })
    } else if (counts.failed > 0 && !specOutcomesCollected) {
        issues.push(`${counts.failed} spec file(s) failed; per-spec detail unavailable because the onWorkerEnd hook was not registered.`)
    } else if (counts.failed > 0) {
        issues.push(`${counts.failed} spec file(s) failed but no failing spec was recorded by onWorkerEnd.`)
    }

    if (counts.skipped > 0) {
        issues.push(`${counts.skipped} spec file(s) were skipped (no runnable tests).`)
    }

    if (counts.retries > 0) {
        issues.push(`${counts.retries} spec file retry attempt(s) were needed.`)
    }

    if (!networkLogging.enabled) {
        const reasons = []
        if (!networkLogging.capabilityFlag) reasons.push('bstack:options.networkLogs is not true on every capability')
        if (!networkLogging.harHook) reasons.push('the HAR download afterSession hook is not wired into this config')
        issues.push(`Network logging disabled: ${reasons.join('; ')}.`)
    }

    return issues
}

function renderMarkdown (report) {
    const knownIssues = report.knownIssues.length > 0
        ? report.knownIssues.map(issue => `- ${issue}`).join('\n')
        : 'None'

    return [
        'TEST BASELINE',
        '--------------',
        '',
        'Framework:',
        `Node.js ${report.framework.node}`,
        `WebdriverIO ${report.framework.webdriverio}`,
        `Appium ${report.framework.appium}`,
        `BrowserStack SDK ${report.framework.browserstackSdk}`,
        '',
        'Android Tests:',
        `${report.counts.tests}`,
        '',
        'Pass:',
        `${report.counts.passed}`,
        '',
        'Fail:',
        `${report.counts.failed}`,
        '',
        'Confirm Network logging:',
        report.networkLogging.enabled ? 'Enabled' : 'Disabled',
        '',
        'Known issues:',
        knownIssues,
        '',
        'Notes:',
        `- Generated from a real run at ${report.generatedAt}.`,
        `- Config file: ${report.configFile ?? UNDETECTED}`,
        '- Counts are spec-file level, which is the granularity the WebdriverIO launcher reports to onComplete.',
        `- Skipped spec files: ${report.counts.skipped}. Retried spec files: ${report.counts.retries}. Launcher exit code: ${report.exitCode}.`,
        ''
    ].join('\n')
}

function describeSpec (spec) {
    const absolute = spec.startsWith('file:') ? fileURLToPath(spec) : spec
    const relative = path.relative(process.cwd(), absolute)
    return relative.startsWith('..') ? absolute : relative
}

/**
 * Finds the config path WebdriverIO was launched with, so the report can say
 * which suite produced it even when the caller does not pass `configFile`.
 */
function configFileFromArgv () {
    const match = process.argv.slice(2).find(argument => /\.conf(ig)?\.(m|c)?[jt]s$/.test(argument))
    return match ? path.relative(process.cwd(), path.resolve(match)) : null
}

/**
 * Builds the launcher hooks that turn a real run into reports/baseline.json
 * and reports/baseline.md. Nothing in here may invent a number: every count
 * comes from the `results` object WebdriverIO hands to onComplete.
 *
 * @param {object} [options]
 * @param {string} [options.configFile] path of the config being run, for the report header
 * @returns {{onWorkerEnd: Function, onComplete: Function}}
 */
export function createBaselineReport (options = {}) {
    const specOutcomes = []

    return {
        onWorkerEnd (cid, exitCode, specs, retries) {
            specOutcomes.push({
                cid,
                specs: (specs || []).map(describeSpec),
                exitCode,
                retries,
                status: exitCode === 0 ? 'passed' : 'failed'
            })
        },

        onComplete (exitCode, config, capabilities, results) {
            const counts = summarizeResults(results)
            const networkLogging = deriveNetworkLogging(capabilities, config)
            const specOutcomesCollected = specOutcomes.length > 0

            const report = {
                generatedAt: new Date().toISOString(),
                configFile: options.configFile ?? configFileFromArgv(),
                exitCode,
                framework: {
                    node: process.version,
                    webdriverio: packageVersion('webdriverio'),
                    appium: packageVersion('appium'),
                    browserstackSdk: packageVersion('@wdio/browserstack-service')
                },
                counts,
                rawLauncherResults: results ?? null,
                specOutcomesCollected,
                specOutcomes,
                devices: describeDevices(capabilities),
                networkLogging,
                knownIssues: []
            }
            report.knownIssues = deriveKnownIssues({ counts, specOutcomes, specOutcomesCollected, networkLogging })

            const directory = reportDir()
            const jsonFile = path.join(directory, 'baseline.json')
            const markdownFile = path.join(directory, 'baseline.md')
            try {
                fs.mkdirSync(directory, { recursive: true })
                fs.writeFileSync(jsonFile, `${JSON.stringify(report, null, 2)}\n`)
                fs.writeFileSync(markdownFile, renderMarkdown(report))
                console.log(`[baseline] Wrote ${jsonFile} and ${markdownFile}`)
            } catch (error) {
                // A reporting hook must not turn a passing suite into a failure.
                console.error(`[baseline] Could not write baseline report: ${error.message}`)
            }

            return report
        }
    }
}
