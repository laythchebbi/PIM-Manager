# 🛡️ Azure PIM Helper

<div align="center">

![Azure PIM Helper Logo](https://img.shields.io/badge/Azure-PIM%20Helper-0078d4?style=for-the-badge&logo=microsoft-azure&logoColor=white)

**A beautiful, fast, and intuitive Chrome extension for managing Azure Privileged Identity Management roles**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285f4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Microsoft Graph](https://img.shields.io/badge/Microsoft-Graph%20API-00bcf2?style=for-the-badge&logo=microsoft&logoColor=white)](https://graph.microsoft.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

*Made with ❤️ from Tunisia by **Layth CHEBBI** 🇹🇳*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Screenshots](#-screenshots) • [Contributing](#-contributing)

---

</div>

## ✨ Features

### 🚀 **Lightning Fast Performance**
- **Parallel API calls** for instant role loading
- **Smart caching** with 1-hour role definition cache
- **Optimized rendering** with document fragments
- **Background service worker** for seamless experience

### 🎨 **Beautiful & Modern UI**
- **520px responsive design** for comfortable viewing
- **Dark/Light/System themes** with smooth transitions
- **Professional gradients** and modern styling
- **Intuitive tabbed interface** (Eligible • Active • Expiring)

### 🔐 **Advanced Security Features**
- **Azure AD integration** with PKCE authentication
- **Implicit OAuth flow** for maximum compatibility
- **Justification detection** for compliance requirements
- **Role-based access indicators** (Critical • High • Medium)

### ⚡ **Smart Role Management**
- **One-click activation** with automatic justification
- **Role extension** for active assignments
- **Expiration warnings** with countdown timers
- **Service categorization** (Azure • Entra ID • Microsoft 365)

### 🏷️ **Visual Role Indicators**
- **📝 Justification Required** tags for compliance roles
- **⚠️ Expiring Soon** alerts for time-sensitive roles
- **🔒 Critical Role** badges for high-privilege access
- **Real-time status updates** with live countdowns

---

## 🎯 Role Categories

<div align="center">

| Service | Badge | Examples |
|---------|-------|----------|
| **Azure** | ![Azure](https://img.shields.io/badge/-Azure-0078d4?style=flat&logo=microsoft-azure&logoColor=white) | Owner, Contributor, Key Vault Administrator |
| **Entra ID** | ![Entra ID](https://img.shields.io/badge/-Entra%20ID-00bcf2?style=flat&logo=microsoft&logoColor=white) | Global Administrator, Security Administrator |
| **Microsoft 365** | ![M365](https://img.shields.io/badge/-Microsoft%20365-d83b01?style=flat&logo=microsoft-office&logoColor=white) | Exchange Administrator, SharePoint Administrator |

</div>

---

## 📸 Screenshots

<div align="center">

### 🌟 Main Interface
*Elegant role management with modern design*

![Main Interface](https://via.placeholder.com/520x400/0078d4/ffffff?text=Main+Interface)

### 🔐 Role Activation
*One-click activation with justification support*

![Role Activation](https://via.placeholder.com/520x300/00bcf2/ffffff?text=Role+Activation)

### 🌙 Dark Theme
*Beautiful dark mode for low-light environments*

![Dark Theme](https://via.placeholder.com/520x400/1e293b/ffffff?text=Dark+Theme)

</div>

---

## 🚀 Installation

### Prerequisites
- Google Chrome or Chromium-based browser
- Azure AD account with PIM-eligible roles
- Azure AD application registration with appropriate permissions

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/laythchebbi/azure-pim-helper.git
   cd azure-pim-helper
   ```

2. **Configure Azure AD App**
   ```javascript
   // Update CLIENT_ID and TENANT_ID in background.js
   const CONFIG = {
     CLIENT_ID: 'your-client-id-here',
     TENANT_ID: 'your-tenant-id-here',
     // ...
   };
   ```

3. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

4. **Authenticate & Enjoy!** 🎉

---

## 🎮 Usage

### 📋 **View Eligible Roles**
Browse your PIM-eligible roles with detailed information including max duration, scope, and service categorization.

### ⚡ **Quick Activation**
Click the "Activate" button to instantly activate roles with appropriate justification handling.

### ⏰ **Monitor Active Roles**
Track your active role assignments with real-time expiration countdowns and extension options.

### 🚨 **Expiration Alerts**
Get notified when roles are expiring within 1 hour with clear visual warnings.

### 🎨 **Theme Customization**
Switch between Light, Dark, and System themes with the theme toggle button.

---

## 🛠️ Technical Architecture

### 📦 **Extension Structure**
```
azure-pim-helper/
├── 📄 manifest.json          # Extension configuration
├── 🎨 popup.html             # Main UI structure
├── 💅 popup.css              # Beautiful styling
├── ⚡ popup.js               # Frontend logic
├── 🔧 background.js          # Service worker & API calls
└── 🎯 icons/                 # Extension icons
```

### 🔗 **API Integration**
- **Microsoft Graph v1.0** for role management
- **OAuth 2.0 Implicit Flow** for authentication
- **Role Management APIs** for PIM operations
- **Beta endpoints** for advanced policy detection

### 🚀 **Performance Optimizations**
- **Parallel API calls** for concurrent data loading
- **Smart caching** with expiration management
- **Document fragments** for efficient DOM updates
- **Debounced operations** for smooth interactions

---

## 🎨 Customization

### 🎯 **Justification Configuration**
Customize which roles require justification by modifying the detection logic:

```javascript
const justificationConfig = {
  'Global Administrator': true,
  'Security Administrator': true,
  // Add your organization's requirements
};
```

### 🎨 **Theme Customization**
Modify CSS variables to match your organization's branding:

```css
:root {
  --accent-color: #your-brand-color;
  --bg-primary: #your-background;
  --text-primary: #your-text-color;
}
```

---

## 🔒 Security & Permissions

### Required Azure AD Permissions
- `RoleManagement.ReadWrite.Directory`
- `PrivilegedAccess.ReadWrite.AzureResources`
- `RoleAssignmentSchedule.ReadWrite.Directory`
- `Directory.Read.All`

### 🛡️ Security Features
- **PKCE authentication** for secure token exchange
- **Token caching** with automatic expiration
- **Minimal permissions** principle
- **Secure storage** of authentication data

---

## 🐛 Troubleshooting

### Common Issues

**Authentication Errors**
```bash
# Clear extension storage
chrome.storage.local.clear()
# Reload extension and re-authenticate
```

**Role Loading Issues**
- Verify Azure AD permissions
- Check service worker console for API errors
- Ensure proper tenant and client ID configuration

**Performance Issues**
- Check for browser extensions conflicts
- Verify network connectivity to Microsoft Graph
- Review console logs for detailed error information

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🚀 **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### 📝 **Contribution Guidelines**
- Follow existing code style and conventions
- Add comprehensive comments for complex logic
- Test all features across different role types
- Update documentation for new features

### 🎯 **Areas for Contribution**
- 🔍 Enhanced justification detection algorithms
- 🎨 Additional themes and customization options
- 🌍 Internationalization and localization
- 📊 Advanced analytics and reporting features
- 🔧 Performance optimizations

---

## 📈 Roadmap

### 🎯 **Upcoming Features**
- [ ] 📊 Role usage analytics and reporting
- [ ] 🔔 Browser notifications for expiring roles
- [ ] 📱 Mobile-responsive design improvements
- [ ] 🌍 Multi-language support
- [ ] 🔄 Bulk role operations
- [ ] 📋 Role assignment history
- [ ] 🎨 Custom theme builder
- [ ] 🔗 Integration with other Microsoft services

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Microsoft Graph Team** for excellent API documentation
- **Azure PIM Team** for the powerful role management platform
- **Chrome Extensions Team** for the robust extension platform
- **Open Source Community** for inspiration and best practices

---

## 🌟 Support

If you find this project helpful, please consider:

- ⭐ **Starring the repository** on GitHub
- 🐛 **Reporting bugs** and suggesting features
- 💡 **Contributing** to the codebase
- 📢 **Sharing** with your colleagues and community

---

<div align="center">

### 🇹🇳 Made with ❤️ from Tunisia by **Layth CHEBBI**

**Cybersecurity Engineer & Azure Specialist**  
*Building world-class security tools for the global Azure community*

[![GitHub](https://img.shields.io/badge/GitHub-LaythCHEBBI-181717?style=for-the-badge&logo=github)](https://github.com/laythchebbi)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Layth%20CHEBBI-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/laythchebbi)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:layth.chebbi@email.com)

[Report Bug](https://github.com/laythchebbi/azure-pim-helper/issues) • [Request Feature](https://github.com/laythchebbi/azure-pim-helper/issues) • [Documentation](https://github.com/laythchebbi/azure-pim-helper/wiki)

---

*Azure PIM Helper - Simplifying privileged access management, one role at a time.*

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=azure-pim-helper)
[![GitHub stars](https://img.shields.io/github/stars/laythchebbi/azure-pim-helper?style=social)](https://github.com/laythchebbi/azure-pim-helper/stargazers)

</div>