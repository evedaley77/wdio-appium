import {
    ensureTestOutputDir,
    rememberRunContext,
    runContextSnapshot,
    sanitizeSegment,
    writeArtifact
} from './test.output.js'

/**
 * Persists the page source (and a screenshot) after every test, passing or
 * failing, into the same `logs/<test-name>/` directory the HAR lands in.
 *
 * Failing specs have only ever captured the app's "Something went wrong"
 * screen, so the Compose trees needed to replace the dead resource-ids are
 * never written down. Capturing after passing tests is what makes a
 * loaded-state tree obtainable.
 */

const MAX_TITLE_LENGTH = 60

function disabled () {
    return /^(0|false|off)$/i.test(process.env.PAGE_CAPTURE ?? '')
}

function screenshotsDisabled () {
    return /^(0|false|off)$/i.test(process.env.PAGE_CAPTURE_SCREENSHOTS ?? '')
}

function titleSegment (test) {
    const title = test?.title ?? test?.fullTitle ?? 'untitled'
    return sanitizeSegment(String(title).slice(0, MAX_TITLE_LENGTH), 'untitled')
}

export function createPageCaptureHooks () {
    let captured = 0

    function before (capabilities, specs) {
        rememberRunContext(capabilities, specs)
    }

    /**
     * Never throws: a diagnostics hook must not turn a passing test red, and a
     * capture failure on a dead session must not mask the original error.
     */
    async function capturePageSource (test, context, result) {
        if (disabled()) return

        const driver = globalThis.browser
        if (!driver?.sessionId) return

        try {
            const snapshot = runContextSnapshot(test?.file ? { specs: [test.file] } : {})
            const directory = ensureTestOutputDir(snapshot)
            const index = String(++captured).padStart(2, '0')
            const outcome = result?.passed === false ? 'failed' : 'passed'
            const prefix = `page-${index}_${titleSegment(test)}-${outcome}`

            const source = await driver.getPageSource().catch(error => `<!-- page source unavailable: ${error.message} -->`)
            writeArtifact(directory, `${prefix}.xml`, source)

            if (!screenshotsDisabled()) {
                await driver.saveScreenshot(`${directory}/${prefix}.png`)
            }

            console.log(`[page-capture] ${directory}/${prefix}.xml`)
        } catch (error) {
            console.warn(`[page-capture] Skipped capture for "${test?.title ?? 'unknown test'}": ${error.message}`)
        }
    }

    return { before, afterTest: capturePageSource }
}
