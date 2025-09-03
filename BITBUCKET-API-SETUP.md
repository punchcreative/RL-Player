# 🔑 Bitbucket API Token Setup Guide

## Replace App Passwords with API Tokens (Required by Sept 9, 2025)

---

## 🎯 **Why Switch to API Tokens**

**App Password Deprecation Timeline:**

- ⚠️ **September 9, 2025**: Creation of new app passwords discontinued
- ⚠️ **June 9, 2026**: All existing app passwords become inactive
- ✅ **API Tokens**: Modern, more secure authentication method

---

## 🔧 **Step 1: Generate API Token in Bitbucket**

### **Create Your API Token:**

1. **Go to Bitbucket Settings**:

   - Visit: https://bitbucket.org/account/settings/
   - Or: Your Avatar → Personal settings

2. **Navigate to API Tokens**:

   - Left sidebar → **"App passwords"** → **"API tokens"**
   - Or direct link: https://bitbucket.org/account/settings/app-passwords/

3. **Create New Token**:

   - Click **"Create app password"** or **"Create API token"**
   - **Label**: `RL Player Development - $(date +%Y%m%d)`
   - **Permissions** (select these):
     - ✅ **Repositories**: Read, Write
     - ✅ **Pull requests**: Read, Write (if you use PRs)
     - ✅ **Issues**: Read, Write (optional)
     - ✅ **Pipelines**: Read (if you use CI/CD)

4. **Copy the Token**:
   - ⚠️ **IMPORTANT**: Copy the token immediately - you won't see it again!
   - Format: Usually looks like `ATBBxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔧 **Step 2: Update Git Configuration**

### **Method A: Update Git Credentials (Recommended)**

```bash
# Navigate to your project
cd "/Users/erik/Repos/RL player"

# Update the remote URL to use your username and token
git remote set-url origin https://YOUR_USERNAME:YOUR_API_TOKEN@bitbucket.org/punchcreative/rl-player.git

# Verify the change (token will be hidden in output)
git remote -v

# Test the new authentication
git fetch
```

### **Method B: Use Git Credential Helper (Secure)**

```bash
# Configure git to use credential helper
git config --global credential.helper osxkeychain

# Next time you push/pull, enter:
# Username: YOUR_BITBUCKET_USERNAME
# Password: YOUR_API_TOKEN (paste the token, not your password)
```

---

## 🔧 **Step 3: VS Code Integration**

### **Update VS Code Git Settings:**

1. **Open VS Code Settings** (Cmd+,)
2. **Search for**: `git.terminalAuthentication`
3. **Enable**: Terminal Authentication
4. **Search for**: `git.useIntegratedTerminal`
5. **Enable**: Use Integrated Terminal

### **Configure VS Code Git Credentials:**

```json
// Add to VS Code settings.json:
{
  "git.terminalAuthentication": true,
  "git.useIntegratedTerminal": true,
  "git.autofetch": true
}
```

---

## 🔧 **Step 4: SourceTree Configuration**

### **Update SourceTree Authentication:**

1. **Open SourceTree**
2. **Preferences** → **Accounts**
3. **Edit** your Bitbucket account
4. **Authentication Type**: Basic
5. **Username**: Your Bitbucket username
6. **Password**: Your new API token (paste the token)
7. **Test Connection** to verify

---

## 🧪 **Step 5: Test Your Setup**

### **Test Git Operations:**

```bash
cd "/Users/erik/Repos/RL player"

# Test fetch
git fetch
# Should work without password prompt

# Test push (make a small change first)
echo "# API Token Setup - $(date)" >> API-SETUP-TEST.md
git add API-SETUP-TEST.md
git commit -m "🔑 Test API token authentication"
git push origin dev
# Should push without password prompt

# Clean up test file
rm API-SETUP-TEST.md
git add API-SETUP-TEST.md
git commit -m "Clean up API test file"
git push origin dev
```

---

## 🛡️ **Security Best Practices**

### **Token Security:**

- ✅ **Never commit tokens** to repositories
- ✅ **Use descriptive labels** for tracking
- ✅ **Rotate tokens periodically** (annually recommended)
- ✅ **Revoke unused tokens** immediately
- ✅ **Store tokens securely** (password manager)

### **Permissions:**

- ✅ **Minimal permissions**: Only grant what you need
- ✅ **Repository-specific**: Limit scope when possible
- ✅ **Regular audit**: Review active tokens quarterly

---

## 🔄 **Migration Checklist**

### **Before Migration:**

- [ ] **Backup current setup**: Ensure working tree is clean
- [ ] **Note current remote URL**: `git remote -v`
- [ ] **Test local server**: Verify http://localhost:3000/ works

### **During Migration:**

- [ ] **Generate API token** in Bitbucket
- [ ] **Copy token safely** (save in password manager)
- [ ] **Update git remote** URL with token
- [ ] **Test git operations** (fetch, push)
- [ ] **Update SourceTree** account settings
- [ ] **Update VS Code** if needed

### **After Migration:**

- [ ] **Verify all operations work**
- [ ] **Document token location** (password manager)
- [ ] **Remove old app password** (if you want)
- [ ] **Test SourceTree operations**

---

## 🆘 **Troubleshooting**

### **Common Issues:**

**"Authentication failed":**

```bash
# Check your remote URL format:
git remote -v
# Should be: https://username:token@bitbucket.org/...

# Fix if needed:
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@bitbucket.org/punchcreative/rl-player.git
```

**"Permission denied":**

- Verify token has correct permissions (Repositories: Read, Write)
- Check token hasn't expired
- Ensure username in URL matches token owner

**"Invalid credentials":**

- Double-check token was copied correctly
- Verify username is exact (case-sensitive)
- Make sure you're using token, not password

### **Reset if Needed:**

```bash
# If something goes wrong, reset to app password temporarily:
git remote set-url origin https://bitbucket.org/punchcreative/rl-player.git
# Then re-enter credentials when prompted
```

---

## 🎯 **Quick Setup Commands**

### **Once you have your token, run these:**

```bash
# Replace YOUR_USERNAME and YOUR_TOKEN with actual values
cd "/Users/erik/Repos/RL player"

# Update remote URL (secure method)
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@bitbucket.org/punchcreative/rl-player.git

# Test authentication
git fetch

# Success! You're now using API tokens
echo "✅ API Token setup complete!"
```

---

## 📋 **Token Information Template**

**Save this information securely:**

```
Bitbucket API Token Details
==========================
Created: $(date)
Label: RL Player Development - $(date +%Y%m%d)
Username: YOUR_BITBUCKET_USERNAME
Token: ATBBxxxxxxxxxxxxxxxxxxxxxxxxx
Permissions: Repositories (Read, Write)
Expires: Never (unless manually revoked)
Used for: RL Player git operations
```

---

## 🚀 **Ready to Generate Your Token?**

**Steps Summary:**

1. **Generate token** in Bitbucket (with Repository permissions)
2. **Copy token** securely
3. **Update git remote** with username:token format
4. **Test operations** (fetch, push)
5. **Update SourceTree** account settings

**Let me know when you have your token and I'll help you implement it!**

---

## ⚡ **Benefits After Setup**

- ✅ **Future-proof**: No more deprecation warnings
- ✅ **More secure**: Fine-grained permissions
- ✅ **Better tracking**: Named tokens for audit trails
- ✅ **Revocable**: Can revoke specific tokens without affecting others
- ✅ **VS Code integration**: Seamless authentication
- ✅ **SourceTree compatibility**: Works with modern authentication
