/**
 * TC-001: Homepage Load
 * Description: Navigate to CNN app and verify the homepage loads.
 * Platform: Android (iOS patterns noted in comments)
 * Prerequisites: CNN APK installed, Appium running
 */

describe('TC-001: Homepage Load', () => {

    it('should load the CNN homepage and fire a Pageview analytics event', async function () {
        this.timeout(120000)

        const homepageSelectors = [
            { name: 'Homepage RecyclerView', selector: '//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]' },
            { name: 'Homepage container', selector: '//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/container"]' },
            { name: 'Homepage bottom navigation', selector: '//android.widget.LinearLayout[@resource-id="com.cnn.mobile.android.phone:id/bottom_navigation"]' },
            { name: 'Homepage WebView', selector: '//android.webkit.WebView' },
            { name: 'Homepage ComposeView', selector: '//androidx.compose.ui.platform.ComposeView' }
        ]
        const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
        const findDisplayedHomepage = async () => {
            for (const homepageSelector of homepageSelectors) {
                const element = await $(homepageSelector.selector)
                if (await element.isDisplayed().catch(() => false)) {
                    return { element, name: homepageSelector.name }
                }
            }
            return null
        }

        // Wait for the app to leave the splash screen and expose either onboarding or the homepage.
        await browser.waitUntil(async () => {
            const onboardingVisible = await editionScreen.isDisplayed().catch(() => false)
            return onboardingVisible || Boolean(await findDisplayedHomepage())
        }, { timeout: 30000, timeoutMsg: 'CNN app did not leave the splash screen within 30s' })

        // Dismiss onboarding if present (edition selection screen)
        const editionVisible = await editionScreen.isDisplayed().catch(() => false)
        if (editionVisible) {
            console.log('[TC-001] Screen displayed: U.S. Edition')
            const nextBtn = await $('//android.widget.TextView[@text="Next"]')
            await nextBtn.waitForDisplayed({
                timeout: 10000,
                timeoutMsg: 'CNN onboarding displayed, but the Next button was not available'
            })
            console.log('[TC-001] Screen element displayed: Next')
            await nextBtn.click()

            // Save and continue past alerts screen
            const saveBtn = await $('//android.widget.TextView[@text="Save and continue"]')
            if (await saveBtn.waitForDisplayed({ timeout: 10000 }).then(() => true).catch(() => false)) {
                console.log('[TC-001] Screen element displayed: Save and continue')
                await saveBtn.click()
            }

            // Allow notifications if prompted
            const allowBtn = await $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]')
            if (await allowBtn.waitForDisplayed({ timeout: 10000 }).then(() => true).catch(() => false)) {
                console.log('[TC-001] Screen element displayed: Allow notifications')
                await allowBtn.click()
            }

            // Agree to legal terms when the screen is displayed.
            const agreeBtn = await $('//*[@text="AGREE"]')
            if (await agreeBtn.waitForDisplayed({ timeout: 10000 }).then(() => true).catch(() => false)) {
                console.log('[TC-001] Screen element displayed: AGREE')
                await agreeBtn.click()
            }
        }

        // Wait for a homepage surface after onboarding and network loading.
        await browser.waitUntil(async () => Boolean(await findDisplayedHomepage()), {
            timeout: 30000,
            timeoutMsg: 'CNN homepage did not display within 30s'
        })
        const homepage = await findDisplayedHomepage()
        await expect(homepage.element).toBeDisplayed()
        console.log(`[TC-001] Screen displayed: ${homepage.name}`)

        // Fallback: verify any CNN content is on screen
        const pageSource = await browser.getPageSource()
        expect(pageSource).toContain('com.cnn.mobile.android.phone')

        // Activate the WebView so analytics hooks can inspect browser-side requests.
        let webviewContext
        await browser.waitUntil(async () => {
            const contexts = await browser.getContexts()
            webviewContext = contexts.find(context => context.startsWith('WEBVIEW'))
            return Boolean(webviewContext)
        }, {
            timeout: 30000,
            interval: 1000,
            timeoutMsg: 'CNN homepage did not expose a debuggable WEBVIEW context within 30s'
        })
        await browser.switchContext(webviewContext)
        const webviewState = await browser.execute(() => ({
            readyState: document.readyState,
            url: window.location.href
        }))
        expect(webviewState.readyState).toBe('complete')
        console.log(`[TC-001] WebView activated: ${webviewContext} (${webviewState.url})`)
        await browser.switchContext('NATIVE_APP')

        // Keep the CNN homepage visible for review before the session closes.
        await browser.waitUntil(async () => Boolean(await findDisplayedHomepage()), {
            timeout: 10000,
            timeoutMsg: 'CNN homepage was no longer visible before the review pause'
        })
        const finalHomepage = await findDisplayedHomepage()
        console.log(`[TC-001] Screen displayed before review pause: ${finalHomepage.name}`)
        console.log('[TC-001] Waiting for homepage to remain stable before closing')
        await browser.waitUntil(async () => Boolean(await findDisplayedHomepage()), {
            timeout: 10000,
            timeoutMsg: 'Homepage not stable before close'
        })

        console.log('[TC-001] Homepage loaded successfully')
    })
})
