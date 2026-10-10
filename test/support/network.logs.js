import { patternsFromEnvironment, classify } from './analytics.capture.js'
import {
    appendRunIndex,
    describeCapabilities,
    ensureTestOutputDir,
    rememberRunContext,
    runContextSnapshot,
    specLabel,
    writeArtifact
} from './test.output.js'

// Lets the baseline report detect whether a config actually downloads the HAR
// instead of assuming network logging is on. WebdriverIO binds hook functions
// while normalizing the config, which drops the symbol but keeps the name, so
// both markers are published.
export const NETWORK_LOG_HOOK = Symbol.for('wdio-appium.networkLogHook')
export const NETWORK_LOG_HOOK_NAME = 'downloadBrowserStackHar'

// App Automate and Automate are served from different API hosts and the repo
// has never had a successful call to confirm which one applies here, so the
// primary is overridable and the other one is always tried as a fallback.
const DEFAULT_API_HOST = 'api-cloud.browserstack.com'
const DEFAULT_ALTERNATE_API_HOST = 'api.browserstack.com'
const NETWORK_LOG_PATH = '/app-automate/sessions/{sessionId}/networklogs'
const MAX_ERROR_BODY = 4000

function integerFromEnvironment (name, fallback) {
    const parsed = Number.parseInt(process.env[name] ?? '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function apiHosts () {
    const primary = process.env.BROWSERSTACK_API_HOST || DEFAULT_API_HOST
    const alternate = process.env.BROWSERSTACK_API_HOST_ALTERNATE ||
        (primary === DEFAULT_API_HOST ? DEFAULT_ALTERNATE_API_HOST : DEFAULT_API_HOST)
    return alternate && alternate !== primary ? [primary, alternate] : [primary]
}

function endpointFor (host, sessionId) {
    const protocol = process.env.BROWSERSTACK_API_PROTOCOL || 'https'
    return `${protocol}://${host}${NETWORK_LOG_PATH.replace('{sessionId}', encodeURIComponent(sessionId))}`
}

/** Credentials never appear in a URL here, but a host override could carry them. */
function redact (url) {
    return String(url).replace(/\/\/[^/@]+@/, '//***:***@')
}

function truncate (text) {
    const value = String(text ?? '')
    return value.length > MAX_ERROR_BODY ? `${value.slice(0, MAX_ERROR_BODY)}…[truncated]` : value
}

/**
 * BrowserStack assembles the HAR asynchronously once the session is torn down,
 * so a request issued immediately after `afterSession` can 404 for a few
 * seconds. The primary host gets the full retry budget; the alternate host gets
 * a single confirming attempt once the primary has exhausted the backoff.
 */
async function fetchNetworkLog (sessionId, user, key) {
    const authorization = `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`
    const attempts = []
    const maxAttempts = integerFromEnvironment('BROWSERSTACK_HAR_ATTEMPTS', 5)
    const delayMs = integerFromEnvironment('BROWSERSTACK_HAR_RETRY_DELAY_MS', 3000)
    const hosts = apiHosts()

    for (const [index, host] of hosts.entries()) {
        const budget = index === 0 ? maxAttempts : 1

        for (let attempt = 1; attempt <= budget; attempt++) {
            const url = endpointFor(host, sessionId)
            const record = { host, attempt, url: redact(url), requestedAt: new Date().toISOString() }

            try {
                const response = await fetch(url, { headers: { Authorization: authorization } })
                record.status = response.status
                record.statusText = response.statusText

                if (response.ok) {
                    const har = await response.text()
                    record.ok = true
                    record.bytes = Buffer.byteLength(har)
                    attempts.push(record)
                    console.log(`[network-logs] ${host} attempt ${attempt}/${budget}: ${response.status} (${record.bytes} bytes)`)
                    return { har, host, attempts }
                }

                // BrowserStack names the real problem in a JSON error body.
                record.body = truncate(await response.text().catch(() => ''))
            } catch (error) {
                record.error = error.message
            }

            attempts.push(record)
            const detail = [record.status, record.statusText].filter(Boolean).join(' ') || record.error || 'no response'
            console.warn(`[network-logs] ${host} attempt ${attempt}/${budget} for session ${sessionId}: ${detail}` +
                (record.body ? ` — ${record.body}` : ''))

            if (attempt < budget) {
                await new Promise(resolve => setTimeout(resolve, delayMs))
            }
        }
    }

    return { har: undefined, host: undefined, attempts }
}

function decodeBase64Json (value) {
    try {
        const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/')
        const text = Buffer.from(normalized, 'base64').toString('utf8')
        const parsed = JSON.parse(text)
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined
    } catch {
        return undefined
    }
}

/**
 * Snowplow `tp2` bodies are usually a JSON self-describing envelope whose
 * `cx`/`ue_px` members are base64url-encoded JSON; GET beacons put the whole
 * payload in the query string instead. Every branch fails soft: an undecodable
 * payload still gets reported with its raw form.
 */
export function decodeSnowplowPayload (raw) {
    if (!raw) return undefined

    const expandNested = node => {
        if (!node || typeof node !== 'object') return node
        if (Array.isArray(node)) return node.map(expandNested)
        return Object.fromEntries(Object.entries(node).map(([key, value]) => {
            if (typeof value !== 'string') return [key, expandNested(value)]
            const nested = /^(cx|ue_px|co|ue_pr)$/.test(key) ? decodeBase64Json(value) : undefined
            return [key, nested ?? value]
        }))
    }

    try {
        const parsed = JSON.parse(raw)
        return { form: 'json', decoded: expandNested(parsed) }
    } catch {
        // Not JSON; fall through to the base64 and query-string forms.
    }

    const base64 = decodeBase64Json(raw)
    if (base64) return { form: 'base64', decoded: expandNested(base64) }

    if (/[?&=]/.test(raw)) {
        try {
            const query = new URLSearchParams(raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : raw)
            const fields = expandNested(Object.fromEntries(query.entries()))
            if (Object.keys(fields).length > 0) return { form: 'query', decoded: fields }
        } catch {
            // fall through
        }
    }

    return { form: 'unknown', decodeError: 'Payload is neither JSON, base64 JSON, nor a query string' }
}

function decodeContent (content) {
    if (!content?.text) return undefined
    if (content.encoding !== 'base64') return undefined
    try {
        return Buffer.from(content.text, 'base64').toString('utf8')
    } catch {
        return undefined
    }
}

/**
 * Filters the HAR down to the analytics beacons and keeps the payloads that
 * `networkLogsOptions.captureContent` adds, which is the whole point of
 * capturing them: the Adobe/Snowplow contents, not just the URLs.
 */
export function extractAnalytics (har) {
    const patterns = patternsFromEnvironment()
    const vendors = Object.keys(patterns)
    const counts = Object.fromEntries(vendors.map(vendor => [vendor, 0]))

    let entries
    try {
        entries = JSON.parse(har)?.log?.entries ?? []
    } catch (error) {
        return { parseError: error.message, totalEntries: 0, matched: 0, counts, beacons: [] }
    }

    const beacons = []
    for (const entry of entries) {
        const url = entry?.request?.url ?? ''
        const matchedVendors = classify(url, patterns)
        if (matchedVendors.length === 0) continue
        matchedVendors.forEach(vendor => { counts[vendor] = (counts[vendor] ?? 0) + 1 })

        const postData = entry?.request?.postData
        const content = entry?.response?.content
        const beacon = {
            url,
            method: entry?.request?.method ?? null,
            status: entry?.response?.status ?? null,
            statusText: entry?.response?.statusText ?? null,
            timestamp: entry?.startedDateTime ?? null,
            timeMs: entry?.time ?? null,
            vendors: matchedVendors,
            request: postData
                ? { mimeType: postData.mimeType ?? null, text: postData.text ?? null, params: postData.params ?? null }
                : null,
            response: content
                ? {
                    mimeType: content.mimeType ?? null,
                    size: content.size ?? null,
                    encoding: content.encoding ?? null,
                    text: content.text ?? null,
                    decodedText: decodeContent(content) ?? null
                }
                : null
        }

        if (matchedVendors.includes('snowplow')) {
            const raw = postData?.text ?? (url.includes('?') ? url : undefined)
            beacon.snowplow = { raw: raw ?? null, ...(decodeSnowplowPayload(raw) ?? {}) }
        }

        beacons.push(beacon)
    }

    return { totalEntries: entries.length, matched: beacons.length, counts, beacons }
}

export function createNetworkLogHooks () {
    let sessionId
    let context = {}

    // Recorded while the session is still alive; `afterSession` runs after
    // teardown, by which point `browser.sessionId` is gone.
    function rememberSession (capabilities, specs) {
        context = rememberRunContext(capabilities, specs)
        sessionId = context.sessionId
    }

    async function downloadBrowserStackHar (config, capabilities, specs) {
        const snapshot = runContextSnapshot({
            ...(specs?.length ? { specs } : {}),
            sessionId: sessionId ?? context.sessionId
        })
        // The before hook is the authoritative source, but afterSession still
        // gets the requested capabilities if the session never started.
        if (!snapshot.deviceName) {
            snapshot.deviceName = describeCapabilities(capabilities).deviceName
        }

        let directory
        try {
            // Created before anything can fail: a run with no HAR still has to
            // leave a diagnosable trace on disk.
            directory = ensureTestOutputDir(snapshot)
        } catch (error) {
            console.error(`[network-logs] Could not create output directory: ${error.message}`)
            return
        }

        const metadata = {
            generatedAt: new Date().toISOString(),
            specName: specLabel(snapshot.specs?.[0]),
            specFiles: snapshot.specs ?? [],
            outputDir: directory,
            sessionId: snapshot.sessionId ?? null,
            deviceName: snapshot.deviceName ?? null,
            platformName: snapshot.platformName ?? null,
            platformVersion: snapshot.platformVersion ?? null,
            buildName: snapshot.buildName ?? null,
            projectName: snapshot.projectName ?? null,
            sessionName: snapshot.sessionName ?? null,
            apiHostUsed: null,
            harFetch: { outcome: 'skipped', reason: 'not attempted', attempts: [] },
            counts: { harEntries: null, matchedBeacons: null, byVendor: null }
        }

        try {
            const user = config?.user || process.env.BROWSERSTACK_USERNAME
            const key = config?.key || process.env.BROWSERSTACK_ACCESS_KEY

            if (!snapshot.sessionId) {
                metadata.harFetch = { outcome: 'skipped', reason: 'No BrowserStack session id was recorded in the before hook', attempts: [] }
                console.warn('[network-logs] No session id recorded; skipping HAR download')
            } else if (!user || !key) {
                metadata.harFetch = { outcome: 'skipped', reason: 'BrowserStack credentials unavailable', attempts: [] }
                console.warn('[network-logs] BrowserStack credentials unavailable; skipping HAR download')
            } else {
                const { har, host, attempts } = await fetchNetworkLog(snapshot.sessionId, user, key)
                const lastFailure = [...attempts].reverse().find(attempt => !attempt.ok)

                if (har) {
                    metadata.apiHostUsed = host
                    metadata.harFetch = { outcome: 'success', host, attempts, bytes: Buffer.byteLength(har) }
                    writeArtifact(directory, 'network.har', har)

                    const analytics = extractAnalytics(har)
                    writeArtifact(directory, 'analytics.json', `${JSON.stringify({
                        specName: metadata.specName,
                        sessionId: metadata.sessionId,
                        deviceName: metadata.deviceName,
                        generatedAt: metadata.generatedAt,
                        totalEntries: analytics.totalEntries,
                        matched: analytics.matched,
                        counts: analytics.counts,
                        parseError: analytics.parseError ?? null,
                        beacons: analytics.beacons
                    }, null, 2)}\n`)

                    metadata.counts = {
                        harEntries: analytics.totalEntries,
                        matchedBeacons: analytics.matched,
                        byVendor: analytics.counts
                    }
                    if (analytics.parseError) metadata.harParseError = analytics.parseError

                    const summary = Object.entries(analytics.counts)
                        .map(([vendor, count]) => `${vendor}=${count}`)
                        .join(' ')
                    console.log(`[network-logs] Wrote ${directory}/network.har via ${host} (${analytics.matched} beacons: ${summary})`)
                } else {
                    metadata.harFetch = {
                        outcome: 'failure',
                        hostsTried: [...new Set(attempts.map(attempt => attempt.host))],
                        status: lastFailure?.status ?? null,
                        statusText: lastFailure?.statusText ?? null,
                        errorBody: lastFailure?.body ?? null,
                        error: lastFailure?.error ?? null,
                        attempts
                    }
                    console.warn(`[network-logs] No HAR for session ${snapshot.sessionId}; see ${directory}/metadata.json`)
                }
            }
        } catch (error) {
            metadata.harFetch = { outcome: 'failure', error: error.message, attempts: metadata.harFetch.attempts ?? [] }
            console.error(`[network-logs] HAR download failed unexpectedly: ${error.message}`)
        }

        try {
            writeArtifact(directory, 'metadata.json', `${JSON.stringify(metadata, null, 2)}\n`)
            appendRunIndex({
                generatedAt: metadata.generatedAt,
                specName: metadata.specName,
                deviceName: metadata.deviceName,
                sessionId: metadata.sessionId,
                outputDir: directory,
                harOutcome: metadata.harFetch.outcome,
                apiHostUsed: metadata.apiHostUsed,
                counts: metadata.counts
            })
        } catch (error) {
            console.error(`[network-logs] Could not write metadata.json: ${error.message}`)
        }
    }

    downloadBrowserStackHar[NETWORK_LOG_HOOK] = true
    return { rememberSession, afterSession: downloadBrowserStackHar }
}
