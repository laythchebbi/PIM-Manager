# 🛡️ Azure PIM Helper

<div align="center">

![Azure PIM Helper Logo](https://img.shields.io/badge/Azure-PIM%20Helper-0078d4?style=for-the-badge&logo=microsoft-azure&logoColor=white)

**A beautiful, fast, and intuitive Chrome extension for managing Azure Privileged Identity Management roles with proactive expiration notifications and multi-tenant support**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285f4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Microsoft Graph](https://img.shields.io/badge/Microsoft-Graph%20API-00bcf2?style=for-the-badge&logo=microsoft&logoColor=white)](https://graph.microsoft.com)
[![Multi-Tenant](https://img.shields.io/badge/Multi-Tenant-Supported-success?style=for-the-badge)](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-convert-app-to-be-multi-tenant)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

*Made with ❤️ from Tunisia by **Layth CHEBBI** 🇹🇳*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Screenshots](#-screenshots) • [Contributing](#-contributing)

---

</div>

## ✨ Features

### 🌍 **Multi-Tenant Support** ⭐ *NEW!*
- **Works across any Microsoft Entra ID tenant** - No configuration needed per tenant
- **Automatic tenant detection** and context switching
- **Universal deployment** - Single extension for all your organizations
- **Seamless cross-tenant experience** with unified authentication
- **Enterprise-ready** for organizations with multiple Entra ID tenants

### 🚀 **Lightning Fast Performance**
- **Parallel API calls** for instant role loading
- **Smart caching** with 1-hour role definition cache
- **Optimized rendering** with document fragments
- **Background service worker** for seamless experience

### 🔔 **Proactive Expiration Notifications** ⭐ *NEW!*
- **15-minute browser notifications** before role expiration
- **Real-time monitoring** of active role lifecycles
- **One-click role extension** directly from notifications
- **Smart notification management** with automatic cleanup
- **Emergency extension options** for critical situations

### 🎨 **Beautiful & Modern UI**
- **520px responsive design** for comfortable viewing
- **Dark/Light/System themes** with smooth transitions
- **Professional gradients** and modern styling
- **Enhanced tabbed interface** (Eligible • Active • Expiring • Settings)
- **Toast notifications** for non-intrusive feedback

### 🌐 **Multi-Language Support**
- **English/French language switcher** with flag icons 🇺🇸/🇫🇷
- **Real-time language switching** without page reload
- **Persistent language preferences** saved locally
- **Complete UI translation** including dynamic content
- **Browser language auto-detection** on first use

### 🔐 **Advanced Security Features**
- **Microsoft Entra ID integration** with PKCE authentication
- **Multi-tenant OAuth flow** for universal compatibility
- **Real-time justification detection** from Azure PIM policies
- **Role-based access indicators** (Critical • High • Medium)

### ⚡ **Smart Role Management**
- **One-click activation** with automatic justification
- **Role extension** for active assignments
- **Bulk operations** for multiple roles ⭐ *NEW!*
- **Emergency extensions** with confirmation dialogs ⭐ *NEW!*
- **Service categorization** (Azure • Entra ID • Microsoft 365)

### 🎯 **Intelligent Justification Detection**
- **Azure PIM Policy API integration** for accurate detection
- **Real-time policy analysis** of `EndUser/Assignment` rules
- **Automatic justification text** based on role requirements
- **Visual justification badges** only when actually required
- **No false positives** - reads your actual Azure configuration

### ⚙️ **Comprehensive Settings** ⭐ *NEW!*
- **Notification preferences** with customizable warning times
- **Authentication management** with re-auth and sign-out options
- **Tenant information display** showing current organization
- **Sound notification controls** and persistence settings
- **About section** with version and feature information

### 🏷️ **Enhanced Visual Indicators**
- **📝 Justification Required** tags for compliance roles
- **⚠️ Expiring Soon** alerts for time-sensitive roles
- **🔒 Critical Role** badges for high-privilege access
- **Real-time status updates** with live countdowns
- **🔔 Notification status** indicators throughout the interface
- **🏢 Tenant context** showing current organization

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

## 🌍 Multi-Tenant Architecture

### 🏢 **Universal Compatibility**
- **Single extension installation** works across all your Entra ID tenants
- **No per-tenant configuration** required - works out of the box
- **Automatic tenant discovery** from user authentication
- **Seamless context switching** between organizations

### 🔐 **Secure Multi-Tenant Authentication**
- **Microsoft common endpoint** (`login.microsoftonline.com/common`)
- **Dynamic tenant resolution** based on user credentials
- **Isolated tenant contexts** for security and compliance
- **Admin consent flow support** for enterprise deployments

### 🎯 **Enterprise Deployment Ready**
- **Chrome Web Store distribution** for easy organization-wide deployment
- **Works with guest accounts** across multiple tenants
- **Conditional Access policy compliance** with MFA support
- **Enterprise application catalog compatible**

---

## 🔔 Notification System

The extension features a comprehensive notification system to prevent unexpected role expiration:

### 📱 **Browser Notifications**
- **15-minute warnings** before role expiration
- **Interactive buttons** for quick actions (Extend/Dismiss)
- **Automatic reactivation** for expired roles
- **Visual and audio alerts** (configurable)

### 🎛️ **Notification Controls**
- **Toggle switch** to enable/disable monitoring
- **Real-time status indicators** showing active/inactive state
- **Active notification counter** displaying current alerts
- **Customizable warning time** (1-60 minutes)

### 🚨 **Emergency Actions**
- **Quick Extend All** - 30-minute extension for expiring roles
- **Emergency Extend** - 4-hour extension for all active roles
- **Bulk operations** with confirmation dialogs
- **One-click role management** from notifications

---

## 🌐 Language Support

The extension supports both **English** and **French** with seamless switching:

### 🇺🇸 English Interface
- Native English UI with cybersecurity terminology
- Professional business language for enterprise use
- Complete feature coverage including notifications

### 🇫🇷 Interface Française
- Interface utilisateur complète en français
- Terminologie de cybersécurité appropriée
- Support complet des notifications d'expiration

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

### 🌟 Main Interface with Multi-Tenant Support
*Elegant role management with tenant context awareness*

![Main Interface](images/img2.png)

### 🔔 Notification Settings Panel ⭐ *NEW!*
*Comprehensive notification control and preferences*

![Notification Settings](images/img6.png)

### 🌍 Multi-Tenant Organization Display
*Shows current tenant and organization context*

![Multi-Tenant Support](images/img3.png)

### 📝 Intelligent Justification Detection
*Real-time Azure PIM policy analysis across tenants*

![Justification Detection](images/img1.png)

### ⚙️ Enhanced Settings with Tenant Info ⭐ *NEW!*
*Complete control over authentication and tenant context*

![Settings Tab](images/img7.png)

### 🌙 Dark Theme with Multi-Tenant Support
*Beautiful dark mode with tenant-aware notifications*

![Dark Theme](images/img1.png)

</div>

---

## 🚀 Installation

### Prerequisites
- Google Chrome or Chromium-based browser (version 88+)
- Microsoft Entra ID account with PIM-eligible roles
- ⭐ **No configuration required** - Extension is pre-configured for multi-tenant support!

### 🎯 **Option 1: Chrome Web Store (Recommended)** ⭐ *NEW!*

**🔗 [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/azure-pim-helper/[extension-id])**

1. **One-Click Installation**
   - Click the link above or search "Azure PIM Helper" in Chrome Web Store
   - Click **"Add to Chrome"**
   - Confirm installation when prompted

2. **Grant Permissions**
   - Allow browser notifications when prompted
   - Grant identity permissions for Microsoft Entra ID authentication

3. **Start Using Immediately** 🚀
   - Click the extension icon in your Chrome toolbar
   - Sign in with your Microsoft Entra ID account
   - **Works with any tenant** - No additional configuration needed!

4. **Configure Notifications** (Optional)
   - Enable notification monitoring in the Settings tab
   - Customize warning times and preferences
   - Set up emergency extension options

**🎉 That's it! The extension is ready to use with any Microsoft Entra ID tenant.**

---

### 🏢 **Option 2: Enterprise Deployment**

For IT administrators deploying organization-wide:

#### **🔐 Admin Consent (Recommended for Enterprises)**
```
https://login.microsoftonline.com/common/adminconsent?client_id=91ed420f-07a9-4c4a-9b55-dc4468a9225b
```
- Visit the URL above as a Global Administrator
- Grant consent for your organization
- Users can then install from Chrome Web Store without individual consent

#### **📋 Chrome Enterprise Policies**
```json
{
  "ExtensionInstallForcelist": [
    "azure-pim-helper-extension-id;https://clients2.google.com/service/update2/crx"
  ],
  "ExtensionSettings": {
    "azure-pim-helper-extension-id": {
      "installation_mode": "force_installed",
      "update_url": "https://clients2.google.com/service/update2/crx"
    }
  }
}
```

#### **🎯 Microsoft Intune Deployment**
- Add Chrome Web Store app to Intune
- Configure automatic installation for managed devices
- Set up conditional access policies if required

---

### 🛠️ **Option 3: Developer Installation**

For developers and advanced users:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/laythchebbi/azure-pim-helper.git
   cd azure-pim-helper
   ```

2. **Load as Unpacked Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the project folder

3. **Enable Notifications**
   - Allow browser notifications when prompted
   - Test notification functionality in Settings tab

4. **Ready for Development** 🚀
   - Extension works immediately with any Entra ID tenant
   - No additional Azure app registration needed
   - Modify source code as needed for customization

---

### 🌍 **Multi-Tenant Benefits**

✅ **Universal Compatibility** - Works with any Microsoft Entra ID tenant  
✅ **Zero Configuration** - No per-tenant setup required  
✅ **Instant Deployment** - Install once, use everywhere  
✅ **Enterprise Ready** - Admin consent and policy support  
✅ **Guest Account Support** - Works with B2B scenarios  
✅ **Automatic Updates** - Chrome Web Store handles updates  

---

### 🚨 **Important Notes**

📢 **For Individual Users**: Simply install from Chrome Web Store - no additional setup needed!

📢 **For Enterprise IT**: Consider using admin consent for seamless user experience.

📢 **For Developers**: The extension is pre-configured with a multi-tenant Azure app registration.

📢 **Security**: All authentication is handled securely through Microsoft's OAuth 2.0 flow.

---

## 🎮 Usage

### 🌍 **Multi-Tenant Experience**
- **Automatic tenant detection** - Extension works with your current Entra ID context
- **Tenant switching** - Sign out and sign in with different tenant accounts
- **Cross-tenant role management** - Manage roles across multiple organizations
- **Guest account support** - Works seamlessly with B2B guest access

### 📋 **View Eligible Roles**
Browse your PIM-eligible roles with detailed information including max duration, scope, and service categorization across any tenant.

### ⚡ **Quick Activation**
Click the "Activate" button to instantly activate roles with appropriate justification handling, regardless of your tenant.

### ⏰ **Monitor Active Roles**
Track your active role assignments with real-time expiration countdowns and extension options across all your tenants.

### 🔔 **Proactive Notifications** ⭐ *NEW!*
- **Enable notifications** via the toggle in the notification panel
- **Receive browser alerts** 15 minutes before role expiration
- **Take action directly** from notifications (Extend/Dismiss)
- **Monitor multiple roles** simultaneously across tenants

### 🚨 **Emergency Management** ⭐ *NEW!*
- **Quick Extend All** - Extend expiring roles by 30 minutes
- **Emergency Extend** - Extend all active roles by 4 hours
- **Bulk Activate** - Activate multiple eligible roles at once
- **Bulk Extend** - Extend multiple active roles simultaneously

### ⚙️ **Settings Management** ⭐ *NEW!*
- **Authentication control** - Re-authenticate or sign out
- **Tenant information** - View current organization and user context
- **Notification preferences** - Customize warning times and sounds
- **About information** - View version and feature details

### 🌐 **Language Switching**
Use the flag icon (🇺🇸/🇫🇷) in the header to instantly switch between English and French interfaces across all tenants.

### 📝 **Smart Justification**
The extension automatically detects which roles require justification by:
- Querying your actual Azure PIM policies via Microsoft Graph API
- Analyzing `EndUser/Assignment` enablement rules  
- Checking for "Justification" in the `enabledRules` array
- Displaying accurate justification badges only when needed
- **Works across all tenants** with proper policy detection

---

## 🛠️ Technical Architecture

### 📦 **Multi-Tenant Extension Structure**
```
azure-pim-helper/
├── 📄 manifest.json          # Multi-tenant configuration
├── 🎨 popup.html             # Enhanced UI with tenant context
├── 💅 popup.css              # Beautiful styling with tenant themes
├── ⚡ popup.js               # Frontend logic with tenant controls
├── 🔧 background.js          # Service worker with multi-tenant auth
├── 🌐 _locales/              # Internationalization files
│   ├── en/messages.json      # English translations (enhanced)
│   └── fr/messages.json      # French translations (enhanced)
└── 🎯 icons/                 # Extension icons (48px for notifications)
```

### 🌍 **Multi-Tenant Authentication Flow** ⭐ *NEW!*
```javascript
// Multi-tenant authentication configuration
const CONFIG = {
  CLIENT_ID: '91ed420f-07a9-4c4a-9b55-dc4468a9225b',
  TOKEN_ENDPOINT: 'https://login.microsoftonline.com/common', // Common endpoint
  REDIRECT_URI: chrome.identity.getRedirectURL(),
  SCOPES: [...] // Same scopes work across all tenants
};

// Automatic tenant extraction from token
const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
const userTenant = {
  tenantId: tokenPayload.tid,
  tenantName: tokenPayload.iss,
  userPrincipalName: tokenPayload.upn,
  userName: tokenPayload.name
};
```

### 🔔 **Notification System Architecture** ⭐ *NEW!*
```javascript
// Real-time role expiration monitoring across tenants
class NotificationManager {
  startMonitoring(graphClient) {
    // Check every minute for role expirations
    this.monitoringInterval = setInterval(() => {
      this.checkRoleExpirations(graphClient);
    }, 60000);
  }

  async createExpirationWarning(role, expirationDate, minutesUntilExpiration) {
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: '⚠️ Azure Role Expiring Soon',
      message: `Your "${roleName}" role will expire in ${timeText}`,
      buttons: [
        { title: 'Extend Role' },
        { title: 'Dismiss' }
      ],
      requireInteraction: true,
      priority: 2
    });
  }
}
```

### 🔗 **API Integration**
- **Microsoft Graph v1.0** for role management
- **Multi-tenant OAuth 2.0 Implicit Flow** for authentication
- **Role Management APIs** for PIM operations across tenants
- **Policy Management APIs** for justification detection
- **Chrome Notifications API** for browser alerts ⭐ *NEW!*
- **Automatic tenant context** handling via Graph API

### 🎯 **Enhanced Justification Detection System**
```javascript
// Real-time Azure PIM policy analysis across any tenant
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
- **Embedded translations** for instant language switching
- **Efficient notification management** with cleanup and deduplication ⭐ *NEW!*
- **Tenant-aware caching** for multi-organization support

---

## 🎨 Customization

### 🌍 **Multi-Tenant Configuration** ⭐ *NEW!*
```javascript
// Extension is pre-configured for multi-tenant support
// No additional configuration needed per tenant!

// Tenant information is automatically detected and stored
const tenantInfo = {
  tenantId: 'auto-detected',
  tenantName: 'auto-detected',
  userPrincipalName: 'auto-detected'
};
```

### 🔔 **Notification Configuration** ⭐ *NEW!*
```javascript
// Customize notification behavior in NotificationManager
const CONFIG = {
  checkIntervalMinutes: 1,    // Check frequency (1-60 minutes)
  warningTimeMinutes: 15,     // Warning time (1-60 minutes)
  requireInteraction: true,   // Keep notifications until dismissed
  priority: 2                 // High priority notifications
};
```

### 🌐 **Adding New Languages**
To add support for additional languages:

1. **Create new locale folder**
   ```bash
   mkdir _locales/es  # For Spanish
   ```

2. **Add complete messages.json** (including notification and tenant messages)
   ```json
   {
     "extName": {
       "message": "Asistente Azure PIM",
       "description": "Nombre de la extensión"
     },
     "multiTenantSupport": {
       "message": "Soporte multi-tenant",
       "description": "Etiqueta de soporte multi-tenant"
     },
     "currentTenant": {
       "message": "Inquilino actual",
       "description": "Etiqueta del inquilino actual"
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

---

## 🔒 Security & Permissions

### Required Microsoft Entra ID Permissions
- `RoleManagement.ReadWrite.Directory`
- `PrivilegedAccess.ReadWrite.AzureResources`
- `RoleAssignmentSchedule.ReadWrite.Directory`
- `Directory.Read.All`
- `Policy.Read.All` or `RoleManagementPolicy.Read.Directory`

### Required Chrome Permissions ⭐ *NEW!*
- `notifications` - For browser notification alerts
- `alarms` - For precise timing of notification checks
- `storage` - For saving notification and tenant preferences
- `activeTab` - For popup interaction
- `identity` - For multi-tenant OAuth authentication

### 🌍 **Multi-Tenant Security Features** ⭐ *NEW!*
- **Isolated tenant contexts** - Each tenant's data is kept separate
- **Secure credential handling** - Tokens are tenant-specific
- **Admin consent flow support** - Enterprise deployment ready
- **Cross-tenant policy compliance** - Respects each tenant's PIM policies
- **Guest account security** - Proper handling of B2B scenarios

### 🛡️ Security Features
- **Multi-tenant PKCE authentication** for secure token exchange
- **Tenant-aware token caching** with automatic expiration
- **Minimal permissions** principle across all tenants
- **Secure storage** of authentication data with tenant isolation
- **Read-only policy access** for justification detection
- **Safe notification handling** with proper cleanup ⭐ *NEW!*

---

## 🐛 Troubleshooting

### Common Issues

**Multi-Tenant Authentication Errors** ⭐ *NEW!*
```bash
# Clear extension storage and re-authenticate
chrome.storage.local.clear()
# Sign out and sign in with correct tenant account
# Verify admin consent is granted for your organization
```

**Tenant Context Issues** ⭐ *NEW!*
```bash
# Check current tenant info in Settings tab
# Re-authenticate if tenant information is missing
# Verify user has proper permissions in the target tenant
```

**Authentication Errors**
```bash
# Clear extension storage
chrome.storage.local.clear()
# Reload extension and re-authenticate
# Check admin consent status for your tenant
```

**Cross-Tenant Role Access Issues** ⭐ *NEW!*
- Verify you have PIM roles in the target tenant
- Check if you're a guest user with proper access
- Ensure your account is not blocked by Conditional Access policies
- Verify the tenant allows external applications

**Notification Issues** ⭐ *NEW!*
```bash
# Check notification permissions
chrome.notifications.getPermissionLevel()
# Verify notification toggle in extension popup
# Check browser notification settings
# Test with roles from different tenants
```

**Role Loading Issues**
- Verify Microsoft Entra ID permissions in target tenant
- Check service worker console for API errors
- Ensure proper client ID configuration for multi-tenant app
- Test with different tenant contexts

**Admin Consent Issues** ⭐ *NEW!*
- Contact your IT administrator for enterprise consent
- Use the admin consent URL provided in installation section
- Verify the application is approved in your tenant
- Check Azure AD audit logs for consent decisions

---

## 🆕 What's New in v2.1

### 🌍 **Multi-Tenant Support** ⭐ *MAJOR UPDATE!*
- **Universal compatibility** with any Microsoft Entra ID tenant
- **Automatic tenant detection** and context management
- **No per-tenant configuration** required - works out of the box
- **Enterprise deployment ready** with admin consent flow support
- **Guest account support** for B2B scenarios
- **Tenant information display** in Settings tab

### 🔔 **Proactive Notification System**
- **15-minute browser notifications** before role expiration
- **Interactive notification buttons** for quick role extension
- **Real-time monitoring** with automatic cleanup
- **Emergency extension options** for critical situations
- **Customizable notification preferences** in Settings tab
- **Multi-tenant notification support**

### ⚙️ **Enhanced Settings Management**
- **Complete Settings tab** with authentication controls
- **Tenant context display** showing current organization
- **Notification preferences** with sound and persistence options
- **Re-authentication** and sign-out functionality
- **About section** with version and feature information

### 🚀 **Bulk Operations & Quick Actions**
- **Bulk Activate** - Activate multiple eligible roles (max 5)
- **Bulk Extend** - Extend multiple active roles simultaneously
- **Quick Extend All** - 30-minute emergency extension
- **Emergency Extend** - 4-hour extension for all active roles
- **Cross-tenant operation support**

### 🎨 **UI/UX Improvements**
- **Toast notification system** for non-intrusive feedback
- **Dynamic button visibility** based on available actions
- **Enhanced status indicators** throughout the interface
- **Improved error handling** with specific recovery options
- **Tenant-aware visual indicators**

### 🌐 **Expanded Multi-Language Support**
- **Enhanced French translations** for all new features
- **Complete notification localization** in both languages
- **Settings and bulk action translations** added
- **Multi-tenant terminology** in all supported languages
- **Improved language switching** performance

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🚀 **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (including multi-tenant scenarios) ⭐ *NEW!*
5. Submit a pull request

### 📝 **Contribution Guidelines**
- Follow existing code style and conventions
- Add comprehensive comments for complex logic
- Test all features across different role types and tenants ⭐ *NEW!*
- Update documentation for new features
- Test language switching and translations
- Test notification system across multiple tenants ⭐ *NEW!*
- Verify multi-tenant compatibility ⭐ *NEW!*

### 🎯 **Areas for Contribution**
- 🌍 **Additional language support** (Spanish, German, etc.)
- 🏢 **Enhanced multi-tenant features** (tenant switching, organization branding)
- 🔔 **Advanced notification features** (custom sounds, rich notifications)
- 🔍 **Advanced justification detection** algorithms
- 🎨 **Additional themes** and customization options
- 📊 **Analytics and reporting** features across tenants
- 🔧 **Performance optimizations** for multi-tenant scenarios
- 📱 **Mobile support** improvements

---

## 📈 Roadmap

### 🎯 **Upcoming Features**
- [ ] 🏢 **Tenant switching UI** within the extension
- [ ] 🎨 **Organization branding** support per tenant
- [ ] 🌍 **Additional languages** (Spanish, German, Portuguese)
- [ ] 📊 **Cross-tenant role analytics** and reporting dashboard
- [ ] 🔔 **Rich notifications** with custom sounds and images
- [ ] 📱 **Mobile-responsive design** improvements
- [ ] 🔄 **Advanced bulk operations** with filtering across tenants
- [ ] 📋 **Role assignment history** and audit logs per tenant
- [ ] 🔗 **Integration with Microsoft Teams** and other services
- [ ] 🤖 **AI-powered role recommendations** based on usage patterns
- [ ] 📈 **Advanced PIM policy analytics** across multiple tenants

### ✅ **Recently Completed (v2.1)**
- [x] 🌍 **Multi-tenant support** with automatic tenant detection
- [x] 🔔 **Proactive notification system** with 15-minute warnings
- [x] ⚙️ **Enhanced Settings tab** with tenant information display
- [x] 🚀 **Bulk operations** for efficient role management
- [x] 🎨 **Toast notification system** for better UX
- [x] 🌐 **Expanded multi-language support** with multi-tenant terminology

### ✅ **Previously Completed (v2.0)**
- [x] 🌐 **Multi-language support** (English/French)
- [x] 📝 **Intelligent justification detection** from Azure PIM policies
- [x] 🎨 **Enhanced UI/UX** with better visual indicators
- [x] 🔧 **Improved error handling** and debugging capabilities

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Microsoft Graph Team** for excellent API documentation and multi-tenant support
- **Azure PIM Team** for the powerful role management platform
- **Microsoft Entra ID Team** for robust multi-tenant authentication capabilities
- **Chrome Extensions Team** for the robust extension platform and notification APIs
- **Open Source Community** for inspiration and best practices
- **International contributors** for translation and localization support
- **Security professionals** who provided feedback on multi-tenant security
- **Enterprise customers** who requested and tested multi-tenant functionality

---

## 🌟 Support

If you find this project helpful, please consider:

- ⭐ **Starring the repository** on GitHub
- 🐛 **Reporting bugs** and suggesting features
- 💡 **Contributing** to the codebase
- 📢 **Sharing** with your colleagues and community
- 🌍 **Contributing translations** for new languages
- 🔔 **Testing the notification system** across different tenants
- 🏢 **Testing multi-tenant scenarios** in your organization

---

<div align="center">

### 🇹🇳 Made with ❤️ from Tunisia by **Layth CHEBBI**

**Cybersecurity Engineer & Azure Specialist**  
*Building world-class security tools for the global Microsoft Entra ID community*

[![GitHub](https://img.shields.io/badge/GitHub-LaythCHEBBI-181717?style=for-the-badge&logo=github)](https://github.com/laythchebbi)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Layth%20CHEBBI-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/laythchebbi)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:layth.chebbi@email.com)

[Report Bug](https://github.com/laythchebbi/azure-pim-helper/issues) • [Request Feature](https://github.com/laythchebbi/azure-pim-helper/issues) • [Documentation](https://github.com/laythchebbi/azure-pim-helper/wiki)

---

*Azure PIM Helper v2.1 - Simplifying privileged access management across any Microsoft Entra ID tenant.*  
*Now with intelligent multi-language support, real-time policy detection, proactive expiration notifications, and universal multi-tenant compatibility!*

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=azure-pim-helper)
[![GitHub stars](https://img.shields.io/github/stars/laythchebbi/azure-pim-helper?style=social)](https://github.com/laythchebbi/azure-pim-helper/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/laythchebbi/azure-pim-helper?style=social)](https://github.com/laythchebbi/azure-pim-helper/network)

</div>