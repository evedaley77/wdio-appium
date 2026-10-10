import fs from 'node:fs'
import path from 'node:path'

const SESSIONS_ENDPOINT = 'https://api-cloud.browserstack.com/app-automate/sessions'

// Lets the baseline report detect whether a config actually downloads the HAR
// instead of assuming network logging is on. WebdriverIO binds hook functions
// while normalizing the config, which drops the symbol but keeps the name, so
// both markers are published.
export const NETWORK_LOG_HOOK = Symbol.for('wdio-appium.networkLogHook')
export const NETWORK_LOG_HOOK_NAME = 'downloadBrowserStackHar'

const ANALYTICS_PATTERN = /omtrdc\.net|2o7\.net|adobedtm\.com|adobe\.com\/b\/ss|com\.snowplowanalytics\.snowplow\/tp2/i

function outputDir () {
    return path.resolve(process.env.NETWORK_LOG_DIR || 'logs/network')
}

/**
 * BrowserStack assembles the HAR asynchronously once the session is torn down,
 * so a request issued immediately after `afterSession` can 404 for a few seconds.
 */
async function fetchNetworkLog (sessionId, user, key, attempts = 5, delayMs = 3000) {
    const authorization = `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`

    for (let attempt = 1; attempt <= attempts; attempt++) {
        const response = await fetch(`${SESSIONS_ENDPOINT}/${sessionId}/networklogs`, {
            headers: { Authorization: authorization }
        }).catch(error => ({ ok: false, statusText: error.message }))

        if (response.ok) {
            return await response.text()
        }

        if (attempt === attempts) {
            const detail = [response.status, response.statusText].filter(Boolean).join(' ')
            console.warn(`[network-logs] Could not fetch HAR for session ${sessionId}: ${detail}`)
            return undefined
        }

        await new Promise(resolve => setTimeout(resolve, delayMs))
    }
}

function countAnalyticsBeacons (har) {
    try {
        const entries = JSON.parse(har)?.log?.entries ?? []
        return entries.filter(entry => ANALYTICS_PATTERN.test(entry?.request?.url ?? '')).length
    } catch {
        return undefined
    }
}

export function createNetworkLogHooks () {
    let sessionId

    // Recorded while the session is still alive; `afterSession` runs after teardown.
    function rememberSession () {
        sessionId = browser.sessionId
    }

    async function downloadBrowserStackHar (config) {
        if (!sessionId) return

        const user = config?.user || process.env.BROWSERSTACK_USERNAME
        const key = config?.key || process.env.BROWSERSTACK_ACCESS_KEY
        if (!user || !key) {
            console.warn('[network-logs] BrowserStack credentials unavailable; skipping HAR download')
            return
        }

        const har = await fetchNetworkLog(sessionId, user, key)
        if (!har) return

        const directory = outputDir()
        fs.mkdirSync(directory, { recursive: true })
        const file = path.join(directory, `${sessionId}.har`)
        fs.writeFileSync(file, har)

        const beacons = countAnalyticsBeacons(har)
        const summary = beacons === undefined ? '' : ` (${beacons} Adobe/Snowplow beacons)`
        console.log(`[network-logs] Wrote ${file}${summary}`)
    }

    downloadBrowserStackHar[NETWORK_LOG_HOOK] = true
    return { rememberSession, afterSession: downloadBrowserStackHar }
}
