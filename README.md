# Email Sender Pro

A professional desktop application for sending bulk emails with advanced features including license management, auto-updates, and comprehensive email capabilities.

## Features

- **Bulk Email Sending**: Send emails to thousands of recipients efficiently
- **Multiple Email Providers**: Support for Gmail, Outlook, Yahoo, and more
- **File Attachments**: Attach multiple files to your emails
- **Excel/CSV Import**: Import recipient lists from Excel or CSV files
- **Credential Management**: Save and manage multiple email accounts
- **License System**: Built-in trial and license activation system
- **Auto-Updates**: Automatic updates via GitHub releases
- **Professional UI**: Modern, responsive interface

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YoussefBenhassine/Email-Sender.git
cd Email-Sender
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

## Building for Production

### Local Build

1. Build the application:
```bash
npm run build
```

2. Create Windows installer:
```bash
npm run dist:win
```

### Automated Build with GitHub Actions

The application is configured to automatically build and release when you push a new tag:

1. Update version in `package.json`
2. Create and push a new tag:
```bash
git tag v1.0.1
git push origin v1.0.1
```

3. GitHub Actions will automatically:
   - Build the application
   - Create Windows installers (NSIS and Inno Setup)
   - Publish a new GitHub release
   - Upload the installer files

## Auto-Update System

The application includes a comprehensive auto-update system:

### How it Works

1. **Automatic Checks**: The app checks for updates when it starts
2. **User Notifications**: Users are notified when updates are available
3. **Download & Install**: Users can download and install updates with one click
4. **Manual Check**: Users can manually check for updates using the update button

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

1. **Check for Updates**: App queries GitHub releases API
2. **Compare Versions**: Compares current version with latest release
3. **Download Update**: Downloads the new version in the background
4. **Install Update**: Installs the update and restarts the application

## License System

### Trial Mode

- 2-day free trial
- Full functionality during trial period
- Automatic trial start on first launch

### License Activation

1. Purchase a license from your license server
2. Enter the license key in the application
3. License is validated with the online server
4. Application is permanently activated

### License Server

The application connects to a license server for validation:
- URL: `https://email-sender-license-server.onrender.com`
- Endpoints: `/api/validate-license`, `/api/activate-license`
- Machine tracking for license management

## File Structure

```
email-sender/
├── src/
│   ├── components/
│   │   ├── EmailSender.jsx      # Main application component
│   │   └── UpdateNotification.jsx # Auto-update UI component
│   ├── main.js                  # Main Electron process
│   ├── preload.js              # Preload script for IPC
│   └── renderer.jsx            # Renderer entry point
├── assets/
│   ├── logo.ico               # Application icon
│   └── logo.png               # Logo image
├── build/
│   └── installer.nsi          # Inno Setup script
├── .github/
│   └── workflows/
│       └── release.yml        # GitHub Actions workflow
├── package.json               # Application configuration
└── forge.config.js           # Electron Forge configuration
```

## Build Configuration

### Package.json Build Settings

```json
{
  "build": {
    "appId": "com.emailsender.pro",
    "productName": "Email Sender Pro",
    "directories": {
      "output": "dist"
    },
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

### Installer Options

#### NSIS Installer
- One-click installation
- Desktop and Start Menu shortcuts
- Uninstaller included
- Custom installation directory

#### Inno Setup Installer
- Professional installation wizard
- Custom branding and icons
- Advanced installation options
- Better user experience

## Deployment

### GitHub Releases

1. **Automatic**: Push a new tag to trigger GitHub Actions
2. **Manual**: Use GitHub web interface to create releases
3. **Assets**: Installer files are automatically uploaded

### Distribution

- **Direct Download**: Users can download from GitHub releases
- **Auto-Updates**: Application automatically checks for updates
- **Version Management**: Semantic versioning for releases

## Troubleshooting

### Build Issues

1. **Node Version**: Ensure you're using Node.js 18+
2. **Dependencies**: Run `npm ci` to clean install
3. **Permissions**: Run as administrator if needed
4. **Antivirus**: Temporarily disable antivirus during build

### Auto-Update Issues

1. **Network**: Check internet connection
2. **GitHub API**: Verify repository access
3. **Version Format**: Ensure version follows semantic versioning
4. **Logs**: Check application logs for errors

### License Issues

1. **Server**: Verify license server is running
2. **Network**: Check internet connection
3. **Key Format**: Ensure license key is correct
4. **Machine ID**: Check machine registration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

## Version History

- **v1.0.0**: Initial release with basic email functionality
- **v1.0.1**: Added auto-update system and license management
- **v1.0.2**: Enhanced UI and performance improvements

---

**Note**: This application is designed for professional use and includes comprehensive licensing and update systems. Ensure compliance with email service provider terms of service when sending bulk emails. 