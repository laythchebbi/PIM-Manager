# 🛡️ Azure PIM Helper

<div align="center">

![Azure PIM Helper Logo](https://img.shields.io/badge/Azure-PIM%20Helper-0078d4?style=for-the-badge&logo=microsoft-azure&logoColor=white)

**A beautiful, fast, and intuitive Chrome extension for managing Azure Privileged Identity Management roles**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285f4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Microsoft Graph](https://img.shields.io/badge/Microsoft-Graph%20API-00bcf2?style=for-the-badge&logo=microsoft&logoColor=white)](https://graph.microsoft.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

*Made with ❤️ from Tunisia by **Layth CHEBBI** 🇹🇳 *

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

### 🌐 **Multi-Language Support** ⭐ *NEW!*
- **English/French language switcher** with flag icons 🇺🇸/🇫🇷
- **Real-time language switching** without page reload
- **Persistent language preferences** saved locally
- **Complete UI translation** including dynamic content
- **Browser language auto-detection** on first use

### 🔐 **Advanced Security Features**
- **Azure AD integration** with PKCE authentication
- **Implicit OAuth flow** for maximum compatibility
- **Real-time justification detection** from Azure PIM policies ⭐ *NEW!*
- **Role-based access indicators** (Critical • High • Medium)

### ⚡ **Smart Role Management**
- **One-click activation** with automatic justification
- **Role extension** for active assignments
- **Expiration warnings** with countdown timers
- **Service categorization** (Azure • Entra ID • Microsoft 365)

### 🎯 **Intelligent Justification Detection** ⭐ *NEW!*
- **Azure PIM Policy API integration** for accurate detection
- **Real-time policy analysis** of `EndUser/Assignment` rules
- **Automatic justification text** based on role requirements
- **Visual justification badges** only when actually required
- **No false positives** - reads your actual Azure configuration

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

## 🌐 Language Support

The extension supports both **English** and **French** with seamless switching:

### 🇺🇸 English Interface
- Native English UI with cybersecurity terminology
- Professional business language for enterprise use
- Complete feature coverage in English

### 🇫🇷 Interface Française
- Interface utilisateur complète en français
- Terminologie de cybersécurité appropriée
- Traduction professionnelle pour l'usage en entreprise

**Language Switching:**
- Click the 🌐 flag icon in the header to switch languages
- Your preference is automatically saved
- All UI elements update instantly, including:
  - Button labels and tooltips
  - Status messages and notifications
  - Role information and error messages
  - Time formats and dynamic content

---

## 📸 Screenshots

<div align="center">

### 🌟 Main Interface
*Elegant role management with modern design*

![Main Interface](https://via.placeholder.com/520x400/0078d4/ffffff?text=Main+Interface)

### 🌐 Multi-Language Support ⭐ *NEW!*
*Seamless language switching with flag icons*

![Language Support](https://via.placeholder.com/520x300/00bcf2/ffffff?text=🇺🇸+🇫🇷+Language+Support)

### 📝 Intelligent Justification Detection ⭐ *NEW!*
*Real-time Azure PIM policy analysis*

![Justification Detection](https://via.placeholder.com/520x300/6366f1/ffffff?text=📝+Smart+Justification+Detection)

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

3. **Create the localization structure** ⭐ *NEW!*
   ```
   your-extension/
   ├── _locales/
   │   ├── en/
   │   │   └── messages.json
   │   └── fr/
   │       └── messages.json
   ├── manifest.json
   ├── popup.html
   ├── popup.js
   └── background.js
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

5. **Authenticate & Enjoy!** 🎉

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

### 🌐 **Language Switching** ⭐ *NEW!*
Use the flag icon (🇺🇸/🇫🇷) in the header to instantly switch between English and French interfaces.

### 📝 **Smart Justification** ⭐ *NEW!*
The extension automatically detects which roles require justification by:
- Querying your actual Azure PIM policies via Microsoft Graph API
- Analyzing `EndUser/Assignment` enablement rules  
- Checking for "Justification" in the `enabledRules` array
- Displaying accurate justification badges only when needed

---

## 🛠️ Technical Architecture

### 📦 **Extension Structure**
```
azure-pim-helper/
├── 📄 manifest.json          # Extension configuration with i18n
├── 🎨 popup.html             # Main UI with localization attributes
├── 💅 popup.css              # Beautiful styling
├── ⚡ popup.js               # Frontend logic with embedded translations
├── 🔧 background.js          # Service worker & API calls
├── 🌐 _locales/              # Internationalization files ⭐ NEW!
│   ├── en/messages.json      # English translations
│   └── fr/messages.json      # French translations
└── 🎯 icons/                 # Extension icons
```

### 🔗 **API Integration**
- **Microsoft Graph v1.0** for role management
- **OAuth 2.0 Implicit Flow** for authentication
- **Role Management APIs** for PIM operations
- **Policy Management APIs** for justification detection ⭐ *NEW!*

### 🎯 **New Justification Detection System** ⭐
```javascript
// Real-time Azure PIM policy analysis
const policyEndpoint = `/policies/roleManagementPolicyAssignments?$filter=scopeId eq '/' and roleDefinitionId eq '${roleId}'`;
const policyData = await this.makeRequest(policyEndpoint);

// Analyze EndUser Assignment enablement rules
const enablementRule = policy.rules.find(rule => 
  rule['@odata.type'] === '#microsoft.graph.unifiedRoleManagementPolicyEnablementRule' &&
  rule.target?.caller === 'EndUser' && 
  rule.target?.level === 'Assignment'
);

const requiresJustification = enablementRule?.enabledRules?.includes('Justification');
```

### 🚀 **Performance Optimizations**
- **Parallel API calls** for concurrent data loading
- **Smart caching** with expiration management
- **Document fragments** for efficient DOM updates
- **Debounced operations** for smooth interactions
- **Embedded translations** for instant language switching ⭐ *NEW!*

---

## 🎨 Customization

### 🌐 **Adding New Languages** ⭐ *NEW!*
To add support for additional languages:

1. **Create new locale folder**
   ```bash
   mkdir _locales/es  # For Spanish
   ```

2. **Add messages.json**
   ```json
   {
     "extName": {
       "message": "Asistente Azure PIM",
       "description": "Nombre de la extensión"
     }
     // ... add all message translations
   }
   ```

3. **Update embedded translations**
   ```javascript
   // In popup.js getLanguageMessages()
   const messages = {
     en: { /* English messages */ },
     fr: { /* French messages */ },
     es: { /* Spanish messages */ }  // Add new language
   };
   ```

### 🎯 **Justification Configuration** ⭐ *UPDATED!*
The extension now automatically detects justification requirements from Azure PIM policies. No manual configuration needed!

```javascript
// Automatic detection via Azure PIM Policy API
const justificationRequired = await this.checkActualPIMJustificationSetting(
  roleDefinitionId, 
  scopeId
);
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
- `Policy.Read.All` or `RoleManagementPolicy.Read.Directory` ⭐ *NEW!*

### 🛡️ Security Features
- **PKCE authentication** for secure token exchange
- **Token caching** with automatic expiration
- **Minimal permissions** principle
- **Secure storage** of authentication data
- **Read-only policy access** for justification detection ⭐ *NEW!*

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

**Justification Detection Issues** ⭐ *NEW!*
- Verify `Policy.Read.All` or `RoleManagementPolicy.Read.Directory` permissions
- Check console logs for detailed policy API responses
- Ensure admin consent is granted for policy permissions

**Language Switching Issues** ⭐ *NEW!*
- Check browser console for translation errors
- Verify `_locales` folder structure is correct
- Clear extension storage if language preference is stuck

**Performance Issues**
- Check for browser extensions conflicts
- Verify network connectivity to Microsoft Graph
- Review console logs for detailed error information

---

## 🆕 What's New in v2.0

### 🌐 **Multi-Language Support**
- **Complete French translation** with professional cybersecurity terminology
- **Instant language switching** with flag icon buttons
- **Persistent language preferences** across browser sessions
- **Auto-detection** of browser language on first use

### 📝 **Intelligent Justification Detection**
- **Real-time Azure PIM policy analysis** via Microsoft Graph API
- **Accurate detection** of justification requirements per role
- **No more false positives** - reads your actual Azure configuration
- **Automatic justification text** based on role requirements

### 🎨 **Enhanced User Experience**
- **Improved error handling** with detailed console logging
- **Better performance** with optimized API calls
- **Visual enhancements** with updated badges and indicators
- **Responsive design** improvements

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
- Test language switching and translations ⭐ *NEW!*

### 🎯 **Areas for Contribution**
- 🌍 **Additional language support** (Spanish, German, etc.)
- 🔍 Enhanced justification detection algorithms
- 🎨 Additional themes and customization options
- 📊 Advanced analytics and reporting features
- 🔧 Performance optimizations
- 🔔 Browser notifications and alerts

---

## 📈 Roadmap

### 🎯 **Upcoming Features**
- [ ] 🌍 **Additional languages** (Spanish, German, Portuguese)
- [ ] 📊 Role usage analytics and reporting
- [ ] 🔔 Browser notifications for expiring roles
- [ ] 📱 Mobile-responsive design improvements
- [ ] 🔄 Bulk role operations
- [ ] 📋 Role assignment history
- [ ] 🎨 Custom theme builder
- [ ] 🔗 Integration with other Microsoft services
- [ ] 🤖 AI-powered role recommendations
- [ ] 📈 Advanced PIM policy analytics

### ✅ **Recently Completed**
- [x] 🌐 **Multi-language support** (English/French)
- [x] 📝 **Intelligent justification detection** from Azure PIM policies
- [x] 🎨 **Enhanced UI/UX** with better visual indicators
- [x] 🔧 **Improved error handling** and debugging capabilities

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Microsoft Graph Team** for excellent API documentation
- **Azure PIM Team** for the powerful role management platform
- **Chrome Extensions Team** for the robust extension platform
- **Open Source Community** for inspiration and best practices
- **International contributors** for translation and localization support ⭐ *NEW!*

---

## 🌟 Support

If you find this project helpful, please consider:

- ⭐ **Starring the repository** on GitHub
- 🐛 **Reporting bugs** and suggesting features
- 💡 **Contributing** to the codebase
- 📢 **Sharing** with your colleagues and community
- 🌍 **Contributing translations** for new languages ⭐ *NEW!*

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

*Azure PIM Helper v2.0 - Simplifying privileged access management, one role at a time.*  
*Now with intelligent multi-language support and real-time policy detection!*

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=azure-pim-helper)
[![GitHub stars](https://img.shields.io/github/stars/laythchebbi/azure-pim-helper?style=social)](https://github.com/laythchebbi/azure-pim-helper/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/laythchebbi/azure-pim-helper?style=social)](https://github.com/laythchebbi/azure-pim-helper/network)

</div>