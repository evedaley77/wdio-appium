import fs from 'node:fs'
import path from 'node:path'

const defaultPatterns = {
    adobe: /(?:omtrdc\.net|2o7\.net|adobedtm\.com|adobe\.com\/b\/ss)/i,
    zion: /zion/i,
    snowplow: /com\.snowplowanalytics\.snowplow\/tp2/i
}

function patternsFromEnvironment () {
    const configured = process.env.ANALYTICS_URL_PATTERNS
    if (!configured) {
        return defaultPatterns
    }

    return configured.split(',').reduce((patterns, entry) => {
        const [name, source] = entry.split('=', 2)
        if (name && source) {
            patterns[name.trim().toLowerCase()] = new RegExp(source.trim(), 'i')
        }
        return patterns
    }, { ...defaultPatterns })
}

function classify (url, patterns) {
    return Object.entries(patterns)
        .filter(([, pattern]) => pattern.test(url))
        .map(([name]) => name)
}

function outputPath () {
    return path.resolve(process.env.ANALYTICS_LOG_FILE || 'reports/analytics-events.jsonl')
}

async function findWebview (browser, timeout = 30000) {
    let webview
    await browser.waitUntil(async () => {
        const contexts = await browser.getContexts()
        webview = contexts.find(context => context.startsWith('WEBVIEW'))
        return Boolean(webview)
    }, { timeout, interval: 1000, timeoutMsg: 'No WebView context became available for analytics capture' }).catch(() => {})
    return webview
}

export function installAnalyticsCapture (browser) {
    return browser.execute(() => {
        if (window.__wdioAnalyticsCaptureInstalled) {
            return
        }

        window.__wdioAnalyticsEvents = []
        window.__wdioAnalyticsCaptureInstalled = true

        const record = (url, method, body) => {
            if (!url) return
            window.__wdioAnalyticsEvents.push({
                url: String(url),
                method: method || 'GET',
                body: body == null ? undefined : String(body),
                timestamp: new Date().toISOString()
            })
        }

        const originalFetch = window.fetch
        window.fetch = function (input, init = {}) {
            const url = typeof input === 'string' ? input : input?.url
            record(url, init.method || input?.method, init.body)
            return originalFetch.apply(this, arguments)
        }

        const originalOpen = XMLHttpRequest.prototype.open
        const originalSend = XMLHttpRequest.prototype.send
        XMLHttpRequest.prototype.open = function (method, url) {
            this.__wdioAnalyticsRequest = { method, url }
            return originalOpen.apply(this, arguments)
        }
        XMLHttpRequest.prototype.send = function (body) {
            const request = this.__wdioAnalyticsRequest
            record(request?.url, request?.method, body)
            return originalSend.apply(this, arguments)
        }

        if (navigator.sendBeacon) {
            const originalBeacon = navigator.sendBeacon.bind(navigator)
            navigator.sendBeacon = (url, data) => {
                record(url, 'POST', data)
                return originalBeacon(url, data)
            }
        }

        const originalImageSrc = Object.getOwnPropertyDescriptor(Image.prototype, 'src')
        if (originalImageSrc?.set) {
            Object.defineProperty(Image.prototype, 'src', {
                ...originalImageSrc,
                set (value) {
                    record(value, 'GET')
                    return originalImageSrc.set.call(this, value)
                }
            })
        }
    })
}

export async function collectAnalyticsEvents (browser) {
    const events = await browser.execute(() => {
        const pending = window.__wdioAnalyticsEvents || []
        window.__wdioAnalyticsEvents = []
        return pending
    })

    const patterns = patternsFromEnvironment()
    const records = (events || [])
        .map(event => ({ ...event, types: classify(event.url, patterns) }))
        .filter(event => event.types.length > 0)

    if (records.length === 0) return []

    const file = outputPath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.appendFileSync(file, records.map(record => `${JSON.stringify(record)}\n`).join(''))
    records.forEach(record => console.log(`[analytics:${record.types.join(',')}] ${record.method} ${record.url}`))
    return records
}

export function createAnalyticsHooks () {
    let activeContext
    let collecting = false
    let captureInstalled = false

    return {
        async before () {
            if (!browser.sessionId) return
            activeContext = await browser.getContext()
            const webview = await findWebview(browser)
            if (!webview) return

            await browser.switchContext(webview)
            await installAnalyticsCapture(browser)
            captureInstalled = true
            await browser.switchContext(activeContext)
        },

        async afterCommand () {
            if (!browser.sessionId || !activeContext || collecting) return
            collecting = true
            try {
                const currentContext = await browser.getContext()
                const webview = await findWebview(browser, 5000)
                if (!webview) return

                await browser.switchContext(webview)
                if (!captureInstalled) {
                    await installAnalyticsCapture(browser)
                    captureInstalled = true
                }
                await collectAnalyticsEvents(browser)
                await browser.switchContext(currentContext)
            } catch (error) {
                if (browser.sessionId) {
                    console.warn(`Analytics capture skipped: ${error.message}`)
                }
            } finally {
                collecting = false
            }
        },

        async after () {
            if (!browser.sessionId || !activeContext || collecting) return
            collecting = true
            try {
                const currentContext = await browser.getContext()
                const webview = await findWebview(browser, 5000)
                if (webview && captureInstalled) {
                    await browser.switchContext(webview)
                    await collectAnalyticsEvents(browser)
                    await browser.switchContext(currentContext)
                }
            } catch (error) {
                if (browser.sessionId) {
                    console.warn(`Analytics flush skipped: ${error.message}`)
                }
            } finally {
                collecting = false
            }
        }
    }
}