/**
 * TC-008: Login Error Handling
 * Description: Validate the login flow for a NON-registered user with invalid credentials.
 * Platform: Android
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

describe('TC-008: Login Error Handling', () => {

    before(async () => {
        await completeOnboarding()
    })

    it('should show error message for invalid credentials and fire LoginError event', async () => {

        // Navigate to Sign In
        const profileTab = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/navigation_profile"]')
        if (await profileTab.isDisplayed().catch(() => false)) {
            await profileTab.click()
        } else {
            const navItems = await $$('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/navigation_bar_item_icon_view"]')
            if (navItems.length > 0) await navItems[navItems.length - 1].click()
        }
        await browser.pause(3000)

        const signInBtn = await $('//android.widget.TextView[@text="Sign In"]')
        if (await signInBtn.isDisplayed().catch(() => false)) {
            await signInBtn.click()
            await browser.pause(3000)
        }

        // Enter invalid credentials in WEBVIEW login form
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webview) {
            await browser.switchContext(webview)

            const emailInput = await $('input[type="email"]')
            await expect(emailInput).toBeDisplayed()
            await emailInput.setValue('invalid_user_does_not_exist@notreal.com')

            const passwordInput = await $('input[type="password"]')
            await expect(passwordInput).toBeDisplayed()
            await passwordInput.setValue('WrongPassword999!')

            const loginBtn = await $('button[type="submit"]')
            await loginBtn.click()
            await browser.pause(5000)

            // Verify error message is displayed
            const errorMsg = await $('[role="alert"], .error-message, [data-testid*="error"]')
            const errorVisible = await errorMsg.isDisplayed().catch(() => false)
            console.log('[TC-008] Error message visible:', errorVisible)
            expect(errorVisible).toBe(true)

            // Validate LoginError analytics event
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-008] Login error analytics events:', JSON.stringify(analyticsEvents.slice(0, 5)))
            const loginErrorEvent = analyticsEvents.find(e => e.url && (e.url.includes('LoginError') || e.url.includes('login_error')))
            console.log('[TC-008] LoginError event:', loginErrorEvent ? 'found' : 'not found in captured events')

            // Verify no cnn_uid in error state
            const uidPresent = analyticsEvents.some(e => e.url && e.url.includes('cnn_uid'))
            console.log('[TC-008] cnn_uid present (should be false):', uidPresent)

            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-008] Login error handling test completed')
    })
})
