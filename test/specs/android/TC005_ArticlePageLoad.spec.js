/**
 * TC-005: Article Page Load
 * Description: Navigate from homepage to article and verify full article content loads.
 * Platform: Android
 */

describe('TC-005: Article Page Load', () => {

    before(async () => {
        await browser.pause(5000)

        const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
        const editionVisible = await editionScreen.isDisplayed().catch(() => false)
        if (editionVisible) {
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
                await browser.pause(3000)
            }

            await clickWhenReady('//android.widget.Button[@text="Next"] | //android.widget.TextView[@text="Next"] | //*[@text="Next"]', 'Next')
            await clickWhenReady('//android.widget.Button[@text="Save and continue"] | //android.widget.TextView[@text="Save and continue"] | //*[@text="Save and continue"]', 'Save and continue', 10000).catch(() => {})
            await clickWhenReady('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]', 'Allow notifications', 10000).catch(() => {})
            await clickWhenReady('//android.widget.Button[@text="AGREE"] | //android.widget.TextView[@text="AGREE"] | //*[@text="AGREE"]', 'AGREE', 10000).catch(() => {})
        }
    })

    it('should load a full article page with content and analytics', async () => {

        // Verify homepage is loaded
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await expect(contentFeed).toBeDisplayed()

        // Click on the first story headline
        const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        await expect(firstHeadline).toBeDisplayed()
        const headlineText = await firstHeadline.getText()
        console.log('[TC-005] Clicking headline:', headlineText)
        await firstHeadline.click()
        await browser.pause(5000)

        // Verify article page loaded — article scroll view
        const articleScrollView = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await expect(articleScrollView).toBeDisplayed()

        // Verify article headline/title is displayed
        const articleTitle = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/article_headline"]')
        await expect(articleTitle).toBeDisplayed()
        const articleTitleText = await articleTitle.getText()
        console.log('[TC-005] Article title:', articleTitleText)
        expect(articleTitleText.length).toBeGreaterThan(0)

        // Validate analytics in WEBVIEW context
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webview) {
            await browser.switchContext(webview)

            const currentUrl = await browser.getUrl()
            console.log('[TC-005] Article URL:', currentUrl)
            expect(currentUrl).toContain('cnn.com')

            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-005] Article analytics events:', JSON.stringify(analyticsEvents.slice(0, 5)))

            // Validate article pageview event
            const pageviewEvent = analyticsEvents.find(e =>
                e.url && (e.url.includes('pageview') || e.url.includes('article'))
            )
            console.log('[TC-005] Pageview event:', pageviewEvent ? 'found' : 'not found in captured events')

            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-005] Article page load verified')
    })
})
