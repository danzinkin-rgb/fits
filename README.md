# Fits

A daily puzzle. One rule on the shortlist is the secret one. Test numbers, words or pictures to find which, in six moves.

Play: https://danzinkin-rgb.github.io/fits/

## Files

| File | What it holds |
|---|---|
| `index.html`, `style.css`, `app.js` | The game. No build step and no dependencies. |
| `rules.js` | The rule library: numbers, words and pictures. |
| `config.js` | Launch settings: play data, ratings and ads. |
| `words.txt` | Dictionary for word days (the public-domain ENABLE list, trimmed to 2-12 letters). |
| `privacy.html` | Privacy page. |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and install-to-home-screen. |
| `check.js` | Content check. Run `node check.js`. |

## Switching things on

Everything is set in `config.js`. With the file as shipped there are no ads and nothing is gated.

1. **Play data and ratings.** Create a free PostHog project (EU region) and paste its project key into `posthogKey`. The game then sends anonymous events, and asks players for a star rating after a finished daily puzzle (at most once a week, never again once rated).
2. **Banner ads.** Once AdSense approves the site, set `adsenseClient` to the publisher ID and `adsenseBannerSlot` to a display ad unit ID.
3. **Rewarded ads.** Once Google accepts the account into H5 Games Ads, set `rewardedAds` to `true`. Tidy up, practice, expert rounds and past puzzles then ask the player to watch an ad first. The daily puzzle never needs one.

Before ads go live, also:

- Turn on a consent message for UK and European visitors in AdSense (Privacy & messaging).
- Add an `ads.txt` file at the root of the site's domain, as AdSense instructs.

After changing any file, raise the `?v=` number on the script and style links in `index.html` and the cache name in `sw.js`, so returning players get the new version.

## Publishing

The site is served by GitHub Pages from the `main` branch. Pushing to `main` updates it within a minute or two.

## Play-data events

Every event carries: app version, touch device or not, installed to home screen or not, games played, current streak, and days since first play. Game events also carry the puzzle number, mode, type (numbers, words, pictures), rule id, difficulty and shortlist size.

| Event | When | Extra detail |
|---|---|---|
| `app_open` | The page loads | first visit or not |
| `puzzle_start` | A puzzle is opened for the first time | |
| `test` | A number, word or picture is tested | move number, fits or not |
| `tidy_up` | Tidy up is used | move number, rules crossed out |
| `wrong_guess` | The wrong rule is named | move number, rule guessed |
| `puzzle_end` | A puzzle is won or lost | result, score, tests, wrong guesses, tidied, seconds taken |
| `proof_failed` | Expert round: a proof is wrong | how many of six were wrong |
| `share` | Share result is tapped | |
| `rating_shown`, `rating`, `rating_dismissed` | The rating prompt | stars and comment |
| `help_opened`, `plus_viewed`, `colour_letters` | Those screens or switches | |

No identifier is stored on the device. Each visit has a random id held in memory, so "unique users" in PostHog means visits. Use `games_played` and `days_since_first_play` to see returning players.
