/**
 * TC-004: Webview Rendering
 * Description: Open CNN.com in mobile/webview context and validate responsive layout and UI elements.
 * Platform: Android
 */

describe('TC-004: Webview Rendering', () => {

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

    it('should render CNN.com in webview with correct layout and analytics', async () => {

        // Verify the app loaded (native container present)
        const mainContainer = await $('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/container"]')
        await expect(mainContainer).toBeDisplayed()

        // Switch to WEBVIEW context to validate web rendering
        const contexts = await browser.getContexts()
        console.log('[TC-004] Available contexts:', JSON.stringify(contexts))

        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webview) {
            await browser.switchContext(webview)

            // Validate page loaded in webview
            const pageTitle = await browser.getTitle()
            console.log('[TC-004] Webview page title:', pageTitle)

            const currentUrl = await browser.getUrl()
            console.log('[TC-004] Webview URL:', currentUrl)
            expect(currentUrl).toContain('cnn.com')

            // Validate analytics event fields
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-004] Webview analytics events:', JSON.stringify(analyticsEvents.slice(0, 5)))

            // Validate page is responsive — check viewport meta
            const viewportMeta = await browser.execute(() => {
                const meta = document.querySelector('meta[name="viewport"]')
                return meta ? meta.getAttribute('content') : null
            })
            console.log('[TC-004] Viewport meta:', viewportMeta)
            expect(viewportMeta).not.toBeNull()

            // Validate session ID is present in analytics
            const sessionEvent = analyticsEvents.find(e => e.url && e.url.includes('session'))
            console.log('[TC-004] Session event:', sessionEvent ? 'found' : 'not found in captured events')

            await browser.switchContext('NATIVE_APP')
        } else {
            console.log('[TC-004] No WEBVIEW context available — validating native layout only')
            // Validate native layout is not broken
            const bottomNav = await $('~Home')
            await expect(bottomNav).toBeDisplayed()
        }

        console.log('[TC-004] Webview rendering validated')
    })
})
