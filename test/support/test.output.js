import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Shared layout for per-test artifacts.
 *
 *   logs/<spec>__<device>__<shortSessionId>/
 *       network.har
 *       analytics.json
 *       metadata.json
 *       page-01_<test title>-passed.xml / .png
 *
 * The directory name has to be identical for the `afterTest` page captures and
 * the `afterSession` HAR download even though those hooks see different data,
 * so the run context is recorded once in `before` and read by both.
 */

const DEFAULT_ROOT = 'logs'
const INDEX_FILE = 'index.jsonl'

export function outputRoot () {
    return path.resolve(process.env.TEST_OUTPUT_DIR || DEFAULT_ROOT)
}

export function sanitizeSegment (value, fallback = 'unknown') {
    const cleaned = String(value ?? '')
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^[._-]+|[._-]+$/g, '')
        .slice(0, 80)
    return cleaned || fallback
}

function toLocalPath (spec) {
    if (!spec) return ''
    const value = Array.isArray(spec) ? spec[0] : spec
    const text = String(value)
    return text.startsWith('file:') ? fileURLToPath(text) : text
}

/**
 * `TC019_AnalyticsJourney.spec.js` -> `TC019_AnalyticsJourney`
 */
export function specLabel (spec, fallback = 'unknown-spec') {
    const local = toLocalPath(spec)
    if (!local) return fallback
    const base = path.basename(local).replace(/\.(spec|test)\.[cm]?[jt]s$/i, '').replace(/\.[cm]?[jt]s$/i, '')
    return sanitizeSegment(base, fallback)
}

export function shortSessionId (sessionId) {
    const cleaned = sanitizeSegment(sessionId, '')
    return cleaned ? cleaned.slice(0, 8) : 'nosession'
}

/**
 * Pulls device/build identity out of either requested capabilities or the
 * capabilities the session reported back; BrowserStack uses different key
 * shapes for the two.
 */
export function describeCapabilities (capabilities) {
    const caps = (Array.isArray(capabilities) ? capabilities[0] : capabilities) || {}
    const matched = caps.capabilities?.alwaysMatch ?? caps.capabilities ?? caps
    const bstack = matched['bstack:options'] || {}

    return {
        deviceName: matched['appium:deviceName'] ?? matched.deviceName ?? null,
        platformName: matched.platformName ?? matched.platform ?? null,
        platformVersion: matched['appium:platformVersion'] ?? matched.platformVersion ?? null,
        buildName: bstack.buildName ?? matched.build ?? null,
        projectName: bstack.projectName ?? null,
        sessionName: bstack.sessionName ?? null
    }
}

const runContext = {
    specs: [],
    sessionId: undefined,
    deviceName: undefined,
    platformName: undefined,
    platformVersion: undefined,
    buildName: undefined,
    projectName: undefined,
    sessionName: undefined
}

/**
 * Called from the `before` hook, while the session is still alive. Values from
 * the live session win over the requested capabilities because BrowserStack
 * can substitute a device.
 */
export function rememberRunContext (capabilities, specs) {
    const driver = globalThis.browser
    const requested = describeCapabilities(capabilities)
    const actual = describeCapabilities(driver?.capabilities)

    runContext.specs = (Array.isArray(specs) ? specs : [specs]).filter(Boolean).map(toLocalPath)
    runContext.sessionId = driver?.sessionId ?? runContext.sessionId
    for (const key of ['deviceName', 'platformName', 'platformVersion', 'buildName', 'projectName', 'sessionName']) {
        runContext[key] = actual[key] ?? requested[key] ?? runContext[key]
    }

    return { ...runContext }
}

export function runContextSnapshot (overrides = {}) {
    const specs = (overrides.specs && overrides.specs.length ? overrides.specs : runContext.specs) || []
    const merged = { ...runContext, ...overrides, specs: specs.map(toLocalPath) }
    merged.sessionId = overrides.sessionId ?? globalThis.browser?.sessionId ?? runContext.sessionId
    return merged
}

/**
 * The same spec runs on two devices in the BrowserStack configs, so the spec
 * name alone collides. The device name keeps the directory readable and the
 * short session id keeps it unique across reruns and identical device models.
 */
export function testOutputDirName (context = {}) {
    const spec = specLabel(context.spec ?? context.specs?.[0])
    const device = sanitizeSegment(context.deviceName, 'unknown-device')
    return `${spec}__${device}__${shortSessionId(context.sessionId)}`
}

export function testOutputDir (context = {}) {
    return path.join(outputRoot(), testOutputDirName(context))
}

export function ensureTestOutputDir (context = {}) {
    const directory = testOutputDir(context)
    fs.mkdirSync(directory, { recursive: true })
    return directory
}

export function writeArtifact (directory, name, contents) {
    const file = path.join(directory, name)
    fs.writeFileSync(file, contents)
    return file
}

/**
 * One line per session so the per-test directories stay discoverable without
 * walking them. Appends are small enough to be safe across parallel workers.
 */
export function appendRunIndex (record) {
    try {
        const root = outputRoot()
        fs.mkdirSync(root, { recursive: true })
        fs.appendFileSync(path.join(root, INDEX_FILE), `${JSON.stringify(record)}\n`)
    } catch {
        // The index is a convenience; losing it must not fail a run.
    }
}
