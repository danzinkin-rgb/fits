/* Fits — launch settings. Edit this file to switch things on; nothing else needs to change.
   With every value empty there are no ads, no play data is sent, and the rating prompt stays hidden. */
window.FITS_CONFIG = {
  /* PostHog project API key (starts with 'phc_'). Switches on anonymous play data and the star-rating prompt.
     Create a free project at posthog.com, choose the EU region, and copy the key from Project settings. */
  posthogKey: '',

  /* Change to 'https://us.i.posthog.com' only if the PostHog project is in the US region. */
  posthogHost: 'https://eu.i.posthog.com',

  /* Google AdSense publisher ID, for example 'ca-pub-1234567890123456'. Leave empty until AdSense has approved the site. */
  adsenseClient: '',

  /* Ad unit ID of a display ad created in AdSense (a number). Shown as a banner under the result card. */
  adsenseBannerSlot: '',

  /* Set to true only after Google has accepted the account into H5 Games Ads.
     Tidy up, practice, expert rounds and past puzzles then ask the player to watch a short ad first. */
  rewardedAds: false,
};
