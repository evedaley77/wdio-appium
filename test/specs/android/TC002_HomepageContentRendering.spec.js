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
            await $('//android.widget.TextView[@text="Next"]').click()
            await browser.pause(3000)

            const saveBtn = await $('//android.widget.TextView[@text="Save and continue"]')
            const saveBtnVisible = await saveBtn.isDisplayed().catch(() => false)
            if (saveBtnVisible) {
                await saveBtn.click()
                await browser.pause(3000)
            }

            const allowBtn = await $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]')
            const allowVisible = await allowBtn.isDisplayed().catch(() => false)
            if (allowVisible) {
                await allowBtn.click()
                await browser.pause(3000)
            }

            const agreeBtn = await $('//android.widget.TextView[@text="AGREE"]')
            const agreeVisible = await agreeBtn.isDisplayed().catch(() => false)
            if (agreeVisible) {
                await agreeBtn.click()
                await browser.pause(5000)
            }
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
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
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
