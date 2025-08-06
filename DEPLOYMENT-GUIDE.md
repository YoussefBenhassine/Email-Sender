# Email Sender Pro - Deployment Guide

This guide provides step-by-step instructions for building, packaging, and releasing your Electron application with auto-updates.

## 🚀 Quick Start

### 1. Initial Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Test Development Build**
   ```bash
   npm start
   ```

### 2. Build for Production

#### Local Build (Development)
```bash
# Build the application
npm run build

# Create Windows installer (development)
npm run dist:win-dev
```

#### Production Release
```bash
# Automated deployment (recommended)
npm run deploy:patch    # For bug fixes
npm run deploy:minor    # For new features
npm run deploy:major    # For breaking changes
```

## 📦 Build Configuration

### Package.json Build Settings

The application is configured with the following build settings:

```json
{
  "build": {
    "appId": "com.emailsender.pro",
    "productName": "Email Sender Pro",
    "directories": {
      "output": "dist"
    },
    "files": [
      ".vite/build/**/*",
      "assets/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "inno",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/logo.ico"
    },
    "publish": {
      "provider": "github",
      "owner": "YoussefBenhassine",
      "repo": "Email-Sender",
      "private": false,
      "releaseType": "release"
    }
  }
}
```

### Installer Types

1. **NSIS Installer** (`nsis`)
   - One-click installation
   - Desktop and Start Menu shortcuts
   - Uninstaller included
   - Custom installation directory

2. **Inno Setup Installer** (`inno`)
   - Professional installation wizard
   - Custom branding and icons
   - Advanced installation options
   - Better user experience

## 🔄 Auto-Update System

### How It Works

1. **Automatic Checks**: App checks for updates on startup
2. **GitHub Integration**: Uses GitHub releases for update distribution
3. **User Notifications**: Notifies users when updates are available
4. **Download & Install**: Downloads and installs updates automatically

### Configuration

The auto-update system is configured in `src/main.js`:

```javascript
autoUpdater.setFeedURL({
  provider: "github",
  owner: "YoussefBenhassine",
  repo: "Email-Sender",
  private: false,
  releaseType: "release",
  updateProvider: "github",
});
```

### Update Process

1. **Version Check**: Compares current version with GitHub releases
2. **Download**: Downloads new version in background
3. **Install**: Installs update and restarts application
4. **User Control**: Users can manually check for updates

## 🏷️ Version Management

### Semantic Versioning

- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Patch** (1.0.1): Bug fixes, backward compatible

### Automated Versioning

The deployment script automatically:
1. Bumps version in `package.json`
2. Creates git tag
3. Commits changes
4. Pushes to remote

```bash
# Examples
npm run deploy:patch    # 1.0.0 → 1.0.1
npm run deploy:minor    # 1.0.0 → 1.1.0
npm run deploy:major    # 1.0.0 → 2.0.0
```

## 🚀 GitHub Actions Workflow

### Automatic Build Process

When you push a new tag, GitHub Actions automatically:

1. **Builds** the application
2. **Creates** Windows installers
3. **Publishes** a new GitHub release
4. **Uploads** installer files

### Workflow File

Located at `.github/workflows/release.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    
    steps:
    - name: Check out Git repository
      uses: actions/checkout@v4

    - name: Install Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Build/Release Electron app
      uses: samuelmeuli/action-electron-builder@v1
      with:
        github_token: ${{ secrets.github_token }}
        release: ${{ startsWith(github.ref, 'refs/tags/v') }}
        windows:
          - target: nsis
            arch: x64
          - target: inno
            arch: x64
```

## 📋 Release Checklist

### Before Release

- [ ] Test the application thoroughly
- [ ] Update version in `package.json` (if manual)
- [ ] Ensure all changes are committed
- [ ] Check that license server is running
- [ ] Verify auto-update configuration

### Release Process

1. **Choose Version Type**
   ```bash
   npm run deploy:patch    # Bug fixes
   npm run deploy:minor    # New features
   npm run deploy:major    # Breaking changes
   ```

2. **Monitor Build Process**
   - Check GitHub Actions tab
   - Verify build completion
   - Review generated artifacts

3. **Verify Release**
   - Check GitHub releases page
   - Download and test installer
   - Verify auto-update functionality

### Post-Release

- [ ] Test auto-update on existing installations
- [ ] Monitor for any issues
- [ ] Update documentation if needed
- [ ] Announce release to users

## 🔧 Troubleshooting

### Build Issues

**Problem**: Build fails with dependency errors
```bash
# Solution
npm ci
rm -rf node_modules
npm install
```

**Problem**: Electron Builder not found
```bash
# Solution
npm install electron-builder --save-dev
```

**Problem**: Icon not found
```bash
# Solution
# Ensure assets/logo.ico exists
# Check file path in package.json
```

### Auto-Update Issues

**Problem**: Updates not checking
```bash
# Check configuration in src/main.js
# Verify GitHub repository settings
# Check network connectivity
```

**Problem**: Update download fails
```bash
# Check GitHub release assets
# Verify file permissions
# Check antivirus settings
```

### GitHub Actions Issues

**Problem**: Workflow not triggering
```bash
# Ensure tag format is correct (v1.0.0)
# Check workflow file syntax
# Verify repository permissions
```

**Problem**: Build fails in CI
```bash
# Check Node.js version
# Verify all dependencies are in package.json
# Check for platform-specific code
```

## 📁 File Structure

```
email-sender/
├── src/
│   ├── components/
│   │   ├── EmailSender.jsx          # Main app component
│   │   └── UpdateNotification.jsx   # Auto-update UI
│   ├── main.js                      # Main process
│   ├── preload.js                   # IPC bridge
│   └── renderer.jsx                 # Renderer entry
├── assets/
│   ├── logo.ico                     # App icon
│   └── logo.png                     # Logo
├── build/
│   └── installer.nsi                # Inno Setup script
├── scripts/
│   ├── deploy.js                    # Deployment script
│   └── notarize.js                  # Code signing
├── .github/
│   └── workflows/
│       └── release.yml              # CI/CD workflow
├── package.json                     # App config
└── forge.config.js                  # Forge config
```

## 🔐 Code Signing (Future)

For production releases, consider code signing:

1. **Windows**: Purchase a code signing certificate
2. **macOS**: Use Apple Developer account for notarization
3. **Linux**: Use GPG signing

### Notarization Setup

```javascript
// scripts/notarize.js
const { notarize } = require('@electron/notarize');

module.exports = async function notarizing(context) {
  // macOS notarization configuration
};
```

## 📞 Support

For issues and questions:

1. **Check logs**: Application logs in `%APPDATA%/Email Sender Pro/logs/`
2. **GitHub Issues**: Create an issue on the repository
3. **Documentation**: Refer to README.md and this guide
4. **Community**: Check Electron and electron-builder documentation

## 🎯 Best Practices

### Development

- Always test builds locally before releasing
- Use semantic versioning consistently
- Keep dependencies updated
- Test auto-update functionality

### Release Management

- Create release notes for each version
- Test installers on clean systems
- Monitor auto-update success rates
- Maintain backward compatibility

### Security

- Keep dependencies updated
- Use HTTPS for all network requests
- Validate user inputs
- Follow Electron security guidelines

---

**Note**: This deployment system is designed for professional use. Ensure compliance with all applicable laws and regulations when distributing software. 