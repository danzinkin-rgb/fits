# Fits on iPhone: steps for the Mac

Everything up to here is done on Windows. These steps only work on the Mac.
Already fixed on the Mac and in the repo: iOS 15 minimum, scene life cycle (`SceneDelegate`), AdMob app ID, tracking text, 50 SKAdNetwork IDs, export-compliance key, app icon and launch image.

Bundle ID: `uk.co.zinkin.fits`. Version 1.0, build 1. AdMob iOS app ID: `ca-app-pub-5785870881254475~8661177857`.

## 1. Get the latest code and build

```bash
cd ~/Claudelocal/fits        # or wherever the repo is cloned
git pull
npm install
npm run ios:release          # copies the game into ios/ with live ads ON
cd ios/App && pod install && cd ../..
npm run ios:open             # opens Xcode
```

`ios:release` turns live ads on in the app's copy only. Do not tap live ads on your own iPhone. Use the sample build (`npm run ios:sync`) for your own testing.

## 2. Xcode settings (once)

1. Click **App** (blue icon, top of the left list), then the **App** target, then **Signing & Capabilities**.
2. Tick **Automatically manage signing**. Pick your **Team** (your Apple Developer account).
3. Check the Bundle Identifier reads `uk.co.zinkin.fits`.
4. **General** tab: Version `1.0`, Build `1`. Raise Build by one for every new upload.
5. Top bar: set the device to **Any iOS Device (arm64)**.

## 3. Archive and upload

1. Menu **Product > Archive**. Wait for the Organizer window.
2. Select the archive, click **Distribute App > App Store Connect > Upload**. Accept the defaults.
3. Apple emails you when the build has processed (10 to 30 minutes). If it says "Missing compliance", the export-compliance key is not in the build: tell me.

## 4. App Store Connect (appstoreconnect.apple.com), in your browser

1. **Apps > + > New App.** Platform iOS. Name `Fits`. Primary language English (UK). Bundle ID `uk.co.zinkin.fits`. SKU `fits-ios`.
2. **App Information:** category Games > Puzzle (or Word). Privacy policy URL `https://playfits.app/privacy.html`.
3. **Pricing:** Free.
4. **Age rating:** answer none to every content question. Do not tick unrestricted web access. Expect 4+.
5. **App Privacy** (use the same answers as Play's Data safety):
   - Data used to track you: **Device ID** (advertising identifier, for third-party advertising).
   - Data linked to you: none.
   - Data not linked to you: Coarse location (from IP), Product interaction, Other usage data, Crash/performance data, Other user content (the optional rating comment). Purposes: Analytics, Third-party advertising.
   - Tracking: **Yes** (the app asks via Apple's tracking prompt).
6. **Version page:** screenshots (6.9-inch and 6.5-inch iPhone are required), description from `notes/play-listing.md`, keywords, support URL `https://playfits.app`, copyright, and the review notes below.
7. Select the uploaded build, then **Add for Review**. Sending it for review is your decision.

### TestFlight (optional but recommended)
After the build processes: **TestFlight** tab > **Internal Testing** > add yourself. Install on your iPhone, play a puzzle, check the consent message and the tracking prompt appear. Then submit the same build for App Review. You can skip this and submit directly.

## 5. App Review notes (guideline 4.2, "minimum functionality")

Apple sometimes questions apps built from a web page. Paste this into **App Review Information > Notes**:

> Fits is a daily puzzle game. A new secret rule arrives each day and the player has six moves to work out what it is. The game has its own interface, scoring, streak statistics, practice and expert rounds, past puzzles, and a shareable result card. It works fully offline, stores progress on the device, and uses native ads (Google AdMob) with Apple's tracking prompt and Google's consent message. There is no account and no sign-in, so no demo login is needed. The same game is also available as a website; the app adds offline play, the native ad and consent flow, and device sharing.

If Apple still pushes back, the useful answers are: offline play, native sharing, native consent and tracking prompts, and a daily-streak experience. If they ask for more native features, tell me and we can add a native share sheet or notifications.

## 6. Test device for AdMob (iPhone)

Run the **sample** build from Xcode on your iPhone (Product > Run with the phone plugged in). In Xcode's bottom console, search for `Test Ads`. A line shows `To get test ads on this device, set GADMobileAds.sharedInstance.requestConfiguration.testDeviceIdentifiers = @[ @"<long id>" ]`. Send me the long ID and I will add it in AdMob under Settings > Test devices.

## 7. After Apple approves

- In AdMob > Apps, link the iOS app to its App Store listing.
- If AdMob asks for `app-ads.txt`, I will add it to playfits.app.
