# HTML5 Icecast/Shoutcast Full Page Radio Player with PWA Support based on Jailsons radiopl;ayer

# (https://github.com/jailsonsb2/RadioPlayer-All-Streams/blob/main/js/script.js)

- Current song
- History of played songs
- Songs coming up
- Responsive design
- Progressive Web App (PWA)

## Documentation.

Open The [Script.js] file and edit the lines Below.

// RADIO NAME
const RADIO_NAME = '...';

// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = '...';
// Playlist data json url
const PlayerData = "...";

## Change Logo.

Open The img folder and add your logo named "cover.png"

## Installation

Just put the files in your server

### Configuring Radio Name and Colors

To configure the name of your radio and the colors used in the Progressive Web App (PWA), you need to edit the `manifest.json` file:

1. Open the `manifest.json` file in your project.
2. Locate the `"name"` field and replace `'Your Radio Name'` with the name of your radio.
3. If desired, you can also customize the `"background_color"` and `"theme_color"` fields to match your radio's branding colors.

## Support for most Hosting Types
