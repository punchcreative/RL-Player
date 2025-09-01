# HTML5 Icecast/Shoutcast Full Page Radiologik Player with PWA Support

Based on Jailsons radioplayer, but simplified in layout
(https://github.com/jailsonsb2/RadioPlayer-All-Streams/blob/main/js/script.js)

## Features

- Current song display
- History of played songs
- Songs coming up
- Responsive design
- Progressive Web App (PWA)
- Password protection for secure access
- Service worker for offline functionality

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
4. Replace `img/cover.png` with your radio logo
5. Upload to your web server

## Configuration Features

- **🔐 Security**: SHA-256 password protection with external config
- **📻 Customization**: Station name, stream URL, colors, and audio settings
- **🔄 Fallback**: Graceful fallback to manifest.json if config missing
- **🚫 Git Safe**: Sensitive data automatically excluded from repository
- **🛠️ User Friendly**: Interactive setup utility with validation
- **⚡ Dynamic**: Runtime configuration override system

## Security Features

- **Password Protection**: Secure access with SHA-256 hashed passwords
- **Config File Separation**: All sensitive data kept outside repository
- **No Hardcoded Secrets**: Zero sensitive information in source code
- **Git Security**: config.js automatically ignored by Git
- **Validation**: Built-in checks for proper configuration

## Support for Most Hosting Types
