# HTML5 Icecast/Shoutcast Full Page Radiologik Player with PWA Support

This player includes a ready-to-use template for **Radiologik DJ** users. Radiologik can automatically generate playlist data that this player consumes to display current songs, history, and upcoming tracks.

- **Radiologik DJ integration** with ready-to-use template (`playlist.json.template`)

## Features

- Current song display with smart polling based on track duration (working on buffer time adjustment)
- History of played songs (3)
- Songs coming up (5 next tracks preview)
- Sleep timer (15/30/45/60 minute auto-pause)
- Intelligent stream error recovery and retry logic
- Enhanced audio controls with proper state management
- Responsive and clean design
- Progressive Web App (PWA)
- Optional password protection for private streams
- Service worker for caching

## Support for Most Hosting Types

## Quick Setup

### 1. **RECOMMENDED: Environment Variables (.env) - Secure & Easy**

Environment variables provide the perfect balance of security and simplicity:

```bash
# Run the environment setup script
./setup-env.sh
```

**Benefits:**

- ✅ **Secure**: Passwords stored outside of code
- ✅ **Git Safe**: .env automatically ignored
- ✅ **User Friendly**: Simple key=value format
- ✅ **Industry Standard**: Used by most web applications

### 2. **ALTERNATIVE: Interactive Setup Utility**

For a visual setup experience:

```bash
# Open setup.html in your browser
open setup.html
```

### 3. **Configuration Guide**

After choosing your setup method:

- ✅ Check configuration status
- 🔐 Generate secure password hash
- 📻 Configure your radio station settings
- 📁 Get your complete config.js file
- ✅ Test your player

### Alternative: Manual Setup

If you prefer manual configuration:

1. **Copy the config template:**

   ```bash
   cp config.example.js config.js
   ```

2. **Generate your password hash:**

   - Open browser Developer Tools (F12) → Console
   - Run: `await hashString("your-password-here")`
   - Copy the resulting hash

3. **Edit config.js with your settings:**

   ```javascript
   const CONFIG = {
     PASSWORD_HASH: "your-generated-hash-here",

     APP_CONFIG: {
       // PWA Settings
       scope: "/your-app-path/",
       background_color: "#your-color",
       theme_color: "#your-color",

       // Radio Station Settings
       station_name: "Your Radio Name",
       stream_url: "https://your-stream-url.com",
       app_url: "https://your-domain.com/app/",

       // Audio Settings
       default_volume: 100,
       dim_volume_sleep_timer: 50,
     },
   };
   ```

4. **Never commit config.js to Git** - it's already in .gitignore for security

### 2. Legacy Configuration (Optional)

If you don't use the CONFIG.APP_CONFIG, the player will fall back to `manifest.json` values:

- `"custom_radio_config"`: Radio station settings
- `"background_color"`: PWA background color
- `"theme_color"`: PWA theme color
- `"scope"`: PWA URL scope

**Note:** Using CONFIG.APP_CONFIG is recommended as it keeps your settings secure and separate from the repository.

### 3. Installation

1. Clone or download this repository
2. Follow the configuration setup above (use setup.html for easiest setup)
3. Configure your radio settings in config.js
4. Customize your graphics (see Graphics Customization below)
5. Upload to your web server

### 4. Graphics Customization

You can customize the visual appearance of your radio player by replacing the default graphics:

#### Required Images:

- **`img/app-icon.png`** - App icon used for:

  - PWA home screen icon
  - Browser tab favicon
  - App launcher icon on mobile devices
  - **Recommended size:** 512x512px (PNG format)

- **`img/cover.png`** - Station logo/cover image used for:
  - Main player display background
  - Media session artwork (lock screen, notifications)
  - Default album art when no track-specific art is available
  - **Recommended size:** 200x200px or larger (PNG/JPG format)

#### How to Customize:

1. **Replace the files** with your own graphics using the same filenames
2. **Keep the same file paths** (`img/app-icon.png` and `img/cover.png`)
3. **Maintain square aspect ratio** for best results across all platforms
4. **Use high resolution** images for crisp display on all devices

**Tip:** The app-icon.png should work well at small sizes since it will be used as a favicon and app icon.

## Configuration Features

- **🔐 Security**: SHA-256 password protection with external config
- **📻 Customization**: Station name, stream URL, colors, and audio settings
- **🔄 Fallback**: Graceful fallback to manifest.json if config missing
- **🚫 Git Safe**: Sensitive data automatically excluded from repository
- **🛠️ User Friendly**: Interactive setup utility with validation
- **⚡ Dynamic**: Runtime configuration override system

## Security Features

- **Optional Password Protection**: Enable/disable secure access with `VITE_ENABLE_PASSWORD_PROTECTION`
- **SHA-256 Password Hashing**: Secure password storage when protection is enabled
- **Config File Separation**: All sensitive data kept outside repository
- **No Hardcoded Secrets**: Zero sensitive information in source code
- **Git Security**: config.js automatically ignored by Git
- **Validation**: Built-in checks for proper configuration

### Setup Instructions for Radiologik Users

1. **Locate the template file**: `playlist.json.template` in this repository

2. **Copy to Radiologik Templates folder**:

   ```
   /Music/Radiologik/Web/Templates/playlist.json.template
   ```

   remove .template from the filename!

3. **Configure Radiologik for web publishing**:

   - Open Radiologik DJ
   - Go to **Preferences** → **Web** (or consult Radiologik help documentation)
   - Enable web publishing features
   - Configure the template to generate `playlist.json` output
   - Set the web server directory where the JSON file should be published

4. **Template Features**:
   - **Current Song**: Shows currently playing track with artist, title, duration, and start time
   - **History**: Displays last 3 played songs with full metadata
   - **Next Tracks**: Shows upcoming 5 songs in queue
   - **Accurate Timing**: Includes start times for precise countdown and smart polling

### Template Variables Used

The template uses Radiologik's built-in variables:

- `<rl-artist>`, `<rl-title>`, `<rl-duration>` - Current track info
- `<rl-artist-01>`, `<rl-title-01>` - Previous tracks (01, 02, 03...)
- `<rl-artist+01>`, `<rl-title+01>` - Next tracks (+01, +02, +03...)
- `<rl-starttime>`, `<rl-starttime+01>` - Track start times for accurate timing

### Benefits of Radiologik Integration

- **Real-time Updates**: Automatic playlist synchronization as songs change
- **Professional Features**: Accurate timing, track history, and upcoming songs preview
- **Zero Manual Work**: Completely automated once configured
- **Smart Polling**: Player adjusts refresh rate based on current song duration
- **Accurate Countdowns**: Uses actual start times rather than estimates

For detailed configuration instructions, please refer to the **Radiologik DJ Help Documentation** on web publishing and template configuration.

## Technical Improvements

- **Smart Polling**: Automatically adjusts data refresh rate based on current song duration (buffer time, working on that)
- **Stream Reliability**: Enhanced error detection that distinguishes between real errors and normal loading events
- **Recovery Logic**: Intelligent retry system with progressive timeouts (10s delays, max 3 attempts)
- **Sleep Timer**: Built-in audio dimming and auto-pause functionality
- **State Management**: Improved play/pause button handling and user action detection

## Quick Reference

### For Radiologik DJ Users

- Copy `playlist.json.template` → `/Music/Radiologik/Web/Templates/`
- Rename the file by removing .template from it
- Configure web publishing in Radiologik preferences
- Consult Radiologik help docs for detailed setup instructions

### For Manual Setup

- Run `./setup-env.sh` for guided configuration
- Or use `setup.html` for interactive browser setup
- Or manually edit `.env` file with your settings

### Files to Customize

- **Graphics**: Replace `img/app-icon.png` and `img/cover.png`
- **Configuration**: Use `.env` file or `config.js` (secure)
- **Playlist Source**: Configure `VITE_PLAYLIST_ENDPOINT` in `.env`
