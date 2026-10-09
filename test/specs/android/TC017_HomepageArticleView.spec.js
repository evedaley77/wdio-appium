/**
 * TC017: Anonymous User Views Homepage Article (CNNAPP-45678)
 * User Story: As an anonymous user, I want to view an article on the homepage,
 *             so that I can read the article content.
 *
 * Acceptance Criteria:
 *   AC1 - CNN Homepage has an article that loads successfully
 *   AC2 - Hero article displays
 *   AC3 - User can scroll through the article
 *   AC4 - Adobe article-load event fires
 *   AC5 - Zion article-load event fires
 *   AC6 - Nova article-load event fires
 *
 * Platform: Android
 */

import { installAnalyticsCapture, collectAnalyticsEvents } from '../../support/analytics.capture.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function completeOnboarding () {
    const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
    await browser.waitUntil(
        async () => {
            const onboarding = await editionScreen.isDisplayed().catch(() => false)
            const feed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
                .isDisplayed().catch(() => false)
            return onboarding || feed
        },
        { timeout: 30000, timeoutMsg: 'CNN app did not leave the splash screen within 30s' }
    )

    const editionVisible = await editionScreen.isDisplayed().catch(() => false)
    if (!editionVisible) return

    const clickWhenReady = async (selector, name, timeout = 15000) => {
        const element = await $(selector)
        await browser.waitUntil(async () => {
            const visible = await element.isDisplayed().catch(() => false)
            const enabled = await element.isEnabled().catch(() => false)
            return visible && enabled
        }, {
            timeout,
            interval: 500,
            timeoutMsg: `${name} button was not ready to click`
        })
        await element.click()
    }

    await clickWhenReady('//android.widget.Button[@text="Next"] | //android.widget.TextView[@text="Next"] | //*[@text="Next"]', 'Next')
    await clickWhenReady('//android.widget.Button[@text="Save and continue"] | //android.widget.TextView[@text="Save and continue"] | //*[@text="Save and continue"]', 'Save and continue', 10000).catch(() => {})
    await clickWhenReady('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]', 'Allow notifications', 10000).catch(() => {})
    await clickWhenReady('//android.widget.Button[@text="AGREE"] | //android.widget.TextView[@text="AGREE"] | //*[@text="AGREE"]', 'AGREE', 10000).catch(() => {})
}

async function installAnalyticsInWebview () {
    try {
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (!webview) return false
        await browser.switchContext(webview)
        await installAnalyticsCapture(browser)
        await browser.switchContext('NATIVE_APP')
        return true
    } catch (err) {
        console.warn('[TC017] Analytics webview install skipped:', err.message)
        try { await browser.switchContext('NATIVE_APP') } catch (_) {}
        return false
    }
}

async function harvestAnalyticsEvents () {
    const contexts = await browser.getContexts()
    const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
    if (!webview) return []
    await browser.switchContext(webview)
    const events = await collectAnalyticsEvents(browser)
    await browser.switchContext('NATIVE_APP')
    return events
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TC017: Anonymous User Views Homepage Article (CNNAPP-45678)', () => {

    before(async () => {
        await completeOnboarding()
        await installAnalyticsInWebview()
    })

    it('TC017 AC1 — CNN Homepage loads with at least one article', async () => {
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await contentFeed.waitForDisplayed({ timeout: 30000, timeoutMsg: 'CNN homepage feed did not display within 30s' })
        await expect(contentFeed).toBeDisplayed()

        const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        await firstHeadline.waitForDisplayed({ timeout: 15000, timeoutMsg: 'No article headline found on homepage' })
        await expect(firstHeadline).toBeDisplayed()

        const headlineText = await firstHeadline.getText()
        expect(headlineText.length).toBeGreaterThan(0)
        console.log('[TC017] AC1 PASS — Homepage loaded, headline:', headlineText)
    })

    it('TC017 AC2 — Hero article displays after tapping a headline', async () => {
        const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        await firstHeadline.waitForDisplayed({ timeout: 15000, timeoutMsg: 'Headline not found before tap' })
        const headlineText = await firstHeadline.getText()
        console.log('[TC017] Tapping headline:', headlineText)
        await firstHeadline.click()

        const articleScrollView = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await articleScrollView.waitForDisplayed({ timeout: 20000, timeoutMsg: 'Article scroll view did not appear within 20s' })
        await expect(articleScrollView).toBeDisplayed()

        const articleTitle = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/article_headline"]')
        await articleTitle.waitForDisplayed({ timeout: 10000, timeoutMsg: 'Article headline element not found' })
        await expect(articleTitle).toBeDisplayed()

        const titleText = await articleTitle.getText()
        expect(titleText.length).toBeGreaterThan(0)
        console.log('[TC017] AC2 PASS — Hero article displayed, title:', titleText)

        await installAnalyticsInWebview()
    })

    it('TC017 AC3 — User can scroll through the article', async () => {
        const articleScrollView = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await expect(articleScrollView).toBeDisplayed()

        const { width, height } = await driver.getWindowSize()
        const startX = Math.floor(width / 2)

        for (let i = 0; i < 5; i++) {
            await driver.action('pointer')
                .move({ duration: 0, x: startX, y: Math.floor(height * 0.8) })
                .down({ button: 0 })
                .move({ duration: 500, x: startX, y: Math.floor(height * 0.2) })
                .up({ button: 0 })
                .perform()
            await articleScrollView.waitForDisplayed({ timeout: 3000 }).catch(() => {})
        }

        await expect(articleScrollView).toBeDisplayed()
        console.log('[TC017] AC3 PASS — Scrolled through article, scroll view still displayed')

        await harvestAnalyticsEvents()
    })

    it('TC017 AC4+AC5+AC6 — Adobe, Zion, and Nova article-load analytics events fire', async () => {
        const events = await harvestAnalyticsEvents()

        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        let rawEvents = []
        if (webview) {
            await browser.switchContext(webview)
            rawEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC017] Raw analytics event count:', rawEvents.length)
            console.log('[TC017] Sample events:', JSON.stringify(rawEvents.slice(0, 5)))
            await browser.switchContext('NATIVE_APP')
        }

        const allUrls = [
            ...events.map(e => e.url),
            ...rawEvents.map(e => e.url)
        ].filter(Boolean)

        // AC4 — Adobe article-load event
        const adobePattern = /omtrdc\.net|2o7\.net|adobedtm\.com|adobe\.com\/b\/ss/i
        const adobeEvent = allUrls.find(url => adobePattern.test(url))
        console.log('[TC017] AC4 Adobe event:', adobeEvent ?? 'NOT FOUND')
        expect(adobeEvent).toBeDefined()

        // AC5 — Zion article-load event
        const zionPattern = /zion/i
        const zionEvent = allUrls.find(url => zionPattern.test(url))
        console.log('[TC017] AC5 Zion event:', zionEvent ?? 'NOT FOUND')
        expect(zionEvent).toBeDefined()

        // AC6 — Nova article-load event
        const novaPattern = /nova/i
        const novaEvent = allUrls.find(url => novaPattern.test(url))
        console.log('[TC017] AC6 Nova event:', novaEvent ?? 'NOT FOUND')
        expect(novaEvent).toBeDefined()

        console.log('[TC017] AC4+AC5+AC6 PASS — Adobe, Zion, and Nova article-load events verified')
    })
})
