# 🧪 RL Player Setup Process Testing Guide

## Test Date: September 2, 2025

## Version: v1.4.9

---

## 🎯 **Testing Objectives**

✅ Verify password protection can be enabled/disabled  
✅ Confirm setup.html generates correct .env configurations  
✅ Test debug logging functionality  
✅ Validate clean console output in production mode  
✅ Ensure app works with both security modes

---

## 📋 **Test Scenario 1: No Password Protection**

### Step 1: Setup Configuration

1. Open: `http://localhost:3000/setup.html`
2. Check **Step 1**: Should show config status
3. In **Step 2**: Select **"No Password Protection"**
4. Verify: Password input section should be hidden
5. **Step 3**: Fill in test values:
   - Station Name: `Test Radio - No Auth`
   - Stream URL: `https://test-stream.example.com`
   - App URL: `http://localhost:3000/`
   - Theme Color: `#FF6B35` (orange)
   - Volume: `75`

### Step 2: Generate Configuration

1. Click **"Generate Complete Config"**
2. Verify output contains:
   ```
   VITE_ENABLE_PASSWORD_PROTECTION=false
   ```
3. Verify NO password hash is included
4. Copy the generated .env content

### Step 3: Test No-Password App

1. Save generated config as `.env`
2. Open: `http://localhost:3000/`
3. **Expected**: App should load directly WITHOUT password prompt
4. **Expected**: App should show "Test Radio - No Auth" in title
5. **Expected**: Theme should be orange (#FF6B35)

---

## 📋 **Test Scenario 2: With Password Protection**

### Step 1: Setup Configuration

1. Refresh: `http://localhost:3000/setup.html`
2. In **Step 2**: Select **"Enable Password Protection"**
3. Verify: Password input section appears
4. Enter test password: `test123`
5. Click **"Generate Hash"**
6. Verify: Hash appears in result area
7. **Step 3**: Fill in test values:
   - Station Name: `Test Radio - Secured`
   - Stream URL: `https://secure-stream.example.com`
   - App URL: `http://localhost:3000/`
   - Theme Color: `#2196F3` (blue)
   - Volume: `85`

### Step 2: Generate Configuration

1. Click **"Generate Complete Config"**
2. Verify output contains:
   ```
   VITE_ENABLE_PASSWORD_PROTECTION=true
   VITE_PASSWORD_HASH=[generated-hash]
   ```
3. Copy the generated .env content

### Step 3: Test Password-Protected App

1. Save generated config as `.env`
2. Open: `http://localhost:3000/`
3. **Expected**: Password modal should appear immediately
4. Enter wrong password: `wrong123`
5. **Expected**: Should show error message
6. Enter correct password: `test123`
7. **Expected**: Should access app successfully
8. **Expected**: App should show "Test Radio - Secured"
9. **Expected**: Theme should be blue (#2196F3)

---

## 📋 **Test Scenario 3: Debug Logging**

### Test Debug Mode ON

1. In `.env`, set: `VITE_DEBUG_MODE=true`
2. Refresh: `http://localhost:3000/`
3. Open browser developer tools (F12)
4. Check Console tab
5. **Expected**: Should see debug messages like:
   ```
   🔧 Loading app configuration...
   ✅ Using .env configuration
   🔓 Password protection disabled, starting player...
   (or password prompts if enabled)
   ```

### Test Debug Mode OFF

1. In `.env`, set: `VITE_DEBUG_MODE=false`
2. Refresh: `http://localhost:3000/`
3. Check Console tab
4. **Expected**: Console should be clean with minimal output
5. **Expected**: Only errors (if any) should appear

---

## 📋 **Test Scenario 4: Configuration Validation**

### Test Missing Configuration

1. Rename `.env` to `.env.hidden`
2. Refresh: `http://localhost:3000/`
3. **Expected**: Should fall back to default values
4. **Expected**: May show configuration warnings

### Test Invalid Configuration

1. Create `.env` with invalid values:
   ```
   VITE_STATION_NAME=
   VITE_STREAM_URL=invalid-url
   ```
2. Refresh app
3. **Expected**: Should handle gracefully with defaults

---

## ✅ **Expected Results Summary**

| Test              | Expected Behavior                            |
| ----------------- | -------------------------------------------- |
| No Password Setup | Generates .env without password hash         |
| Password Setup    | Generates .env with hash and protection flag |
| No Password App   | Loads directly, no auth prompt               |
| Password App      | Shows password modal first                   |
| Debug ON          | Detailed console logging                     |
| Debug OFF         | Clean console output                         |
| Invalid Config    | Graceful fallback to defaults                |

---

## 🚨 **What to Look For (Potential Issues)**

- ❌ Password protection toggle not working
- ❌ Generated .env missing required variables
- ❌ Console errors when CONFIG is undefined
- ❌ Password modal not appearing when protection enabled
- ❌ Debug mode not controlling console output
- ❌ App not loading with invalid configurations

---

## 🔧 **Test Environment**

- **Local Server**: `http://localhost:3000`
- **Setup Page**: `/setup.html`
- **Main App**: `/index.html`
- **Current Version**: v1.4.9
- **Debug Features**: ✅ Enabled
- **Password Options**: ✅ Configurable

---

**🎉 Ready to test! Follow each scenario and verify the expected behaviors.**
