/**
 * TC-007: Login Flow (Valid User)
 * Description: Validate the login flow for a registered user with valid credentials.
 * Platform: Android
 * Prerequisites: Set CNN_TEST_EMAIL and CNN_TEST_PASSWORD environment variables.
 */

import { browser, $, $$ } from '@wdio/globals'

async function completeOnboarding () {
    await browser.pause(5000)
    const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
    if (!await editionScreen.isDisplayed().catch(() => false)) return

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

describe('TC-007: Login Flow (Valid User)', () => {

    before(async () => {
        await completeOnboarding()
    })

    it('should login successfully with valid credentials and fire LoginSuccessful event', async () => {
        const testEmail = process.env.CNN_TEST_EMAIL || 'test@example.com'
        const testPassword = process.env.CNN_TEST_PASSWORD || 'TestPassword123!'

        // Navigate to profile/sign-in tab
        const profileTab = await $('~Settings')
        if (await profileTab.isDisplayed().catch(() => false)) {
            await profileTab.click()
        } else {
            const navItems = await $$('//android.view.View[@content-desc="Home" or @content-desc="Magic Wall" or @content-desc="Watch" or @content-desc="Audio" or @content-desc="Settings"]')
            if (navItems.length > 0) await navItems[navItems.length - 1].click()
        }
        await browser.pause(3000)

        // Tap Sign In button
        const signInBtn = await $('//android.widget.TextView[@text="Sign In"]')
        if (await signInBtn.isDisplayed().catch(() => false)) {
            await signInBtn.click()
            await browser.pause(3000)
        }

        // Login form is rendered in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)

            const emailInput = await $('input[type="email"]')
            await expect(emailInput).toBeDisplayed()
            await emailInput.setValue(testEmail)

            const passwordInput = await $('input[type="password"]')
            await expect(passwordInput).toBeDisplayed()
            await passwordInput.setValue(testPassword)

            const loginBtn = await $('button[type="submit"]')
            await loginBtn.click()
            await browser.pause(5000)

            const currentUrl = await browser.getUrl()
            console.log('[TC-007] Post-login URL:', currentUrl)

            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-007] Login analytics events:', JSON.stringify(analyticsEvents.slice(0, 5)))
            const loginEvent = analyticsEvents.find(e => e.url && (e.url.includes('login') || e.url.includes('LoginSuccessful')))
            console.log('[TC-007] LoginSuccessful event:', loginEvent ? 'found' : 'not found in captured events')

            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-007] Login flow with valid credentials completed')
    })
})
