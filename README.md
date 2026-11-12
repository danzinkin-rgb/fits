# Fits

A daily puzzle. One rule on the shortlist is the secret one. Test numbers, words or pictures to find which, in six moves.

Play: https://danzinkin-rgb.github.io/fits/

## Files

| File | What it holds |
|---|---|
| `index.html`, `style.css`, `app.js` | The game. No build step and no dependencies. |
| `rules.js` | The rule library: numbers, words and pictures. |
| `config.js` | Launch settings: ads and the feedback link. |
| `words.txt` | Dictionary for word days (the public-domain ENABLE list, trimmed to 2-12 letters). |
| `privacy.html` | Privacy page. |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and install-to-home-screen. |
| `check.js` | Content check. Run `node check.js`. |

## Switching things on

Everything is set in `config.js`. With the file as shipped there are no ads and nothing is gated.

1. **Feedback.** Create a Google Form and paste its link into `feedbackUrl`. A Feedback button then appears on the result screen and in the menu.
2. **Banner ads.** Once AdSense approves the site, set `adsenseClient` to the publisher ID and `adsenseBannerSlot` to a display ad unit ID.
3. **Rewarded ads.** Once Google accepts the account into H5 Games Ads, set `rewardedAds` to `true`. Tidy up, practice, expert rounds and past puzzles then ask the player to watch an ad first. The daily puzzle never needs one.

Before ads go live, also:

- Turn on a consent message for UK and European visitors in AdSense (Privacy & messaging).
- Add an `ads.txt` file at the root of the site's domain, as AdSense instructs.

After changing any file, raise the `?v=` number on the script and style links in `index.html` and the cache name in `sw.js`, so returning players get the new version.

## Publishing

The site is served by GitHub Pages from the `main` branch. Pushing to `main` updates it within a minute or two.
