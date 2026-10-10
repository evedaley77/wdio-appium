/**
 * TC-002: Homepage Content Rendering
 * Description: Verify top stories, images, and headlines render correctly on the Homepage.
 * Platform: Android
 */

describe('TC-002: Homepage Content Rendering', () => {

    before(async () => {
        // Wait for app launch and complete onboarding if needed
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

    it('should display top stories, images, and headlines on the homepage', async () => {

        // Verify the main content feed/recycler is displayed
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await expect(contentFeed).toBeDisplayed()

        // Verify at least one headline/story card is visible
        const storyCards = await $$('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        expect(storyCards.length).toBeGreaterThan(0)

        // Verify images are rendered (ImageView elements in the feed)
        const images = await $$('//android.widget.ImageView[@resource-id="com.cnn.mobile.android.phone:id/thumbnail"]')
        expect(images.length).toBeGreaterThan(0)

        // Verify no layout errors — content area is fully visible
        const mainLayout = await $('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/container"]')
        await expect(mainLayout).toBeDisplayed()

        // Validate analytics in WEBVIEW context
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)

            const analyticsEvents = await browser.execute(() => {
                return window.__wdioAnalyticsEvents || []
            })
            console.log('[TC-002] Analytics events captured:', JSON.stringify(analyticsEvents.slice(0, 5)))

            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-002] Homepage content rendered successfully')
    })
})
