
describe('WDIO My Login', () => {

    it('Navigate to Login and Perform Login', async () => {
        
        await browser.pause(2000)
        await $('//android.widget.LinearLayout[@resource-id="com.cnn.mobile.android.phone:id/action_bar_root"]').click()

        await browser.pause(2000)
        await expect($('//android.widget.TextView[@text="Get all the news most relevant to you"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Please select your CNN edition to customize your newsfeed and alerts:"]')).toBeExisting()  
        await expect($('//android.widget.TextView[@text="U.S. Edition"]')).toBeExisting()
        //await expect($('//android.widget.TextView[@text="International Edition"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="You can change your edition anytime from your settings screen."]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Next"]')).toBeExisting()
        await $('//android.widget.TextView[@text="Next"]').click()    

        //Select the topics for which you would like to be updated regularly
        await browser.pause(2000)
        await expect($('//android.widget.LinearLayout[@resource-id="com.cnn.mobile.android.phone:id/action_bar_root"]')).toBeExisting()
        await expect($('//android.widget.FrameLayout[@resource-id="android:id/content"]')).toBeExisting()
        await expect($('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/onboarding_fragment_container"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Alerts that matter to you"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Select the topics for which you would like to be updated regularly."]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Save and continue"]')).toBeExisting()
        await $('//android.widget.TextView[@text="Save and continue"]').click()

      //Allow Notifications --> Press 'ALLOW'. NEEDS Updates
        await browser.pause(2000)
        const allowNotificationsButton = $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]')
      if (await allowNotificationsButton.isDisplayed().catch(() => false)) {
        await allowNotificationsButton.click()
        await browser.pause(1000)
      }

      const allowText = $('//android.widget.TextView[@text="Allow"]')
      if (await allowText.isDisplayed().catch(() => false)) {
        await allowText.click()
      }

        //Legal Terms and Privay --> Press 'AGREE
        await browser.pause(2000)
        await expect($('//android.widget.TextView[@text="Legal Terms and Privacy"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="By tapping AGREE, you accept the CNN Terms of Use and Privacy Policy."]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="AGREE"]')).toBeExisting()
        await $('//android.widget.TextView[@text="AGREE"]').click()

//Navgate Home Page
        await browser.pause(5000)
        await expect($('//android.widget.LinearLayout[@resource-id="com.cnn.mobile.android.phone:id/action_bar_root"]')).toBeExisting()
        await expect($('//android.widget.FrameLayout[@resource-id="android:id/content"]')).toBeExisting()
        await expect($('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/onboarding_fragment_container"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="CNN"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="U.S. Edition"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Top Stories"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="U.S."]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="World"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Politics"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Business"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Health"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Entertainment"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Style"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Travel"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Sports"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="Videos"]')).toBeExisting()
        await expect($('//android.widget.TextView[@text="More"]')).toBeExisting()
    
    })
})