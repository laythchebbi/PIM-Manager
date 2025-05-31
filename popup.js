// Azure PIM Helper - Chrome Extension Popup
// Final optimized version with justification support and i18n with language switcher

class AzurePIMHelper {
  constructor() {
    this.eligibleRoles = [];
    this.activeRoles = [];
    this.expiringRoles = [];
    this.loading = true;
    this.refreshing = false;
    this.activatingRoles = new Set();
    this.extendingRoles = new Set();
    this.currentTab = 'eligible';
    this.theme = 'light';
    this.currentLanguage = 'en'; // Default language
    
    this.init();
  }

  async init() {
    // Load saved language preference first
    await this.loadLanguagePreference();
    
    // Initialize i18n
    this.initI18n();
    this.setupEventListeners();
    this.applyTheme('light');
    
    // Wait a moment for background script to initialize
    await this.ensureBackgroundScript();
    await this.loadRoles();
  }

  // Load saved language preference
  async loadLanguagePreference() {
    try {
      const result = await chrome.storage.local.get(['userLanguage']);
      if (result.userLanguage) {
        this.currentLanguage = result.userLanguage;
      } else {
        // Detect browser language and set default
        const browserLang = navigator.language.substr(0, 2);
        this.currentLanguage = ['en', 'fr'].includes(browserLang) ? browserLang : 'en';
        await this.saveLanguagePreference();
      }
      console.log('Loaded language preference:', this.currentLanguage);
    } catch (error) {
      console.warn('Failed to load language preference:', error);
      this.currentLanguage = 'en';
    }
  }

  // Save language preference
  async saveLanguagePreference() {
    try {
      await chrome.storage.local.set({ userLanguage: this.currentLanguage });
      console.log('Saved language preference:', this.currentLanguage);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }

  // Toggle between languages
  async toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'fr' : 'en';
    await this.saveLanguagePreference();
    
    // Re-initialize UI with new language
    this.initI18n();
    
    // Re-render roles to update any role-specific text
    this.renderRoles();
    
    // Update last refresh time
    this.updateLastRefresh();
    
    // Show a brief notification
    this.showStatus('success', this.getMessage('languageChanged'));
  }

  // Update language button icon
  updateLanguageIcon() {
    const icon = document.getElementById('language-icon');
    const icons = {
      en: '🇺🇸',
      fr: '🇫🇷'
    };
    icon.textContent = icons[this.currentLanguage] || '🌐';
  }

  // Initialize internationalization
  initI18n() {
    // Update all elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n');
      const message = this.getMessage(messageKey);
      if (message) {
        element.textContent = message;
      }
    });

    // Update title attributes (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n-title');
      const message = this.getMessage(messageKey);
      if (message) {
        element.setAttribute('title', message);
      }
    });

    // Update document title
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
      const messageKey = titleElement.getAttribute('data-i18n');
      const message = this.getMessage(messageKey);
      if (message) {
        document.title = message;
      }
    }

    // Update language button
    this.updateLanguageIcon();
  }

  // Get localized message with placeholders - now uses custom language loading
  getMessage(messageKey, substitutions = []) {
    // Use our custom language loading instead of chrome.i18n
    return this.getCustomMessage(messageKey, substitutions);
  }

  // Custom message loading that respects user language choice
  getCustomMessage(messageKey, substitutions = []) {
    // Get the message from the appropriate language
    const message = this.getMessageFromLanguage(messageKey, this.currentLanguage);
    
    if (!message) {
      // Fallback to English if message not found
      return this.getMessageFromLanguage(messageKey, 'en') || messageKey;
    }

    // Handle substitutions
    if (substitutions.length === 0) {
      return message;
    }

    let result = message;
    substitutions.forEach((substitution, index) => {
      const placeholder = `$${index + 1}$`;
      // Use a simpler replacement that handles the exact pattern
      result = result.split(placeholder).join(substitution);
    });

    return result;
  }

  // Get message from specific language - this will use our embedded messages
  getMessageFromLanguage(messageKey, language) {
    const messages = this.getLanguageMessages(language);
    return messages[messageKey]?.message || null;
  }

  // Embedded message definitions (to avoid chrome.i18n dependency issues)
  getLanguageMessages(language) {
    const messages = {
      en: {
        // Header and Navigation
        headerTitle: { message: "Azure PIM Helper" },
        headerSubtitle: { message: "Manage your privileged role lifecycle" },
        refreshTooltip: { message: "Refresh roles" },
        themeTooltip: { message: "Toggle theme" },
        languageTooltip: { message: "Switch language" },
        defaultTitle: { message: "Azure PIM Helper" },
        
        // Loading and Status
        loadingRoles: { message: "Loading role data..." },
        connectingService: { message: "Connecting to extension service..." },
        fetchingRoles: { message: "Fetching roles from Azure..." },
        processingRoles: { message: "Processing role data..." },
        updatingInterface: { message: "Updating interface..." },
        
        // Tab Labels
        tabEligible: { message: "Eligible" },
        tabActive: { message: "Active" },
        tabExpiring: { message: "Expiring" },
        
        // Empty States
        noEligibleRoles: { message: "No eligible roles available" },
        noActiveRoles: { message: "No active roles currently" },
        noExpiringRoles: { message: "No roles expiring soon" },
        
        // Role Actions
        activateButton: { message: "Activate" },
        activatingButton: { message: "Activating" },
        extendButton: { message: "Extend" },
        extendingButton: { message: "Extending" },
        
        // Role Information
        maxDuration: { message: "Max duration: $1$" },
        activatedAt: { message: "Activated $1$" },
        expiresIn: { message: "Expires in $1$" },
        lastUpdated: { message: "Last updated: $1$" },
        
        // Justification
        justificationRequired: { message: "Justification Required" },
        justificationNote: { message: "This role requires business justification for activation" },
        defaultJustification: { message: "Role activation requested via PIM Helper extension" },
        adminJustification: { message: "Administrative task requiring elevated privileges - Role activation via PIM Helper extension" },
        
        // Alerts and Messages
        rolesExpiringAlert: { message: "$1$ role$2$ expiring within 1 hour" },
        activationSuccess: { message: "Successfully activated $1$" },
        extensionSuccess: { message: "Extended $1$ for additional time" },
        activationFailed: { message: "Failed to activate $1$: $2$" },
        extensionFailed: { message: "Failed to extend $1$: $2$" },
        rolesLoaded: { message: "Loaded $1$ roles in $2$ms" },
        languageChanged: { message: "Language changed successfully" },
        
        // Error Messages
        serviceNotResponding: { message: "Extension service not responding. Try reloading the extension." },
        authenticationRequired: { message: "Authentication required. Click refresh to sign in." },
        serviceNotAvailable: { message: "Extension service is not available" },
        roleNotFound: { message: "Role not found" },
        loadRolesFailed: { message: "Failed to load roles: $1$" },
        refreshFailed: { message: "Refresh failed: $1$" },
        
        // Role Types and Services
        roleCritical: { message: "Critical" },
        roleHigh: { message: "High" },
        roleMedium: { message: "Medium" },
        serviceAzure: { message: "Azure" },
        serviceEntraId: { message: "Entra ID" },
        serviceMicrosoft365: { message: "Microsoft 365" },
        directoryScope: { message: "Directory" },
        
        // Time Formats
        hoursFormat: { message: "$1$ hour$2$" },
        timeFormatHoursMinutes: { message: "$1$h $2$m" },
        timeFormatMinutes: { message: "$1$m" }
      },
      fr: {
        // En-tête et Navigation
        headerTitle: { message: "Assistant Azure PIM" },
        headerSubtitle: { message: "Gérez le cycle de vie de vos rôles privilégiés" },
        refreshTooltip: { message: "Actualiser les rôles" },
        themeTooltip: { message: "Basculer le thème" },
        languageTooltip: { message: "Changer de langue" },
        defaultTitle: { message: "Assistant Azure PIM" },
        
        // Chargement et Statut
        loadingRoles: { message: "Chargement des données de rôles..." },
        connectingService: { message: "Connexion au service d'extension..." },
        fetchingRoles: { message: "Récupération des rôles depuis Azure..." },
        processingRoles: { message: "Traitement des données de rôles..." },
        updatingInterface: { message: "Mise à jour de l'interface..." },
        
        // Libellés des Onglets
        tabEligible: { message: "Éligibles" },
        tabActive: { message: "Actifs" },
        tabExpiring: { message: "Expirant" },
        
        // États Vides
        noEligibleRoles: { message: "Aucun rôle éligible disponible" },
        noActiveRoles: { message: "Aucun rôle actif actuellement" },
        noExpiringRoles: { message: "Aucun rôle expirant bientôt" },
        
        // Actions des Rôles
        activateButton: { message: "Activer" },
        activatingButton: { message: "Activation" },
        extendButton: { message: "Prolonger" },
        extendingButton: { message: "Prolongation" },
        
        // Informations sur les Rôles
        maxDuration: { message: "Durée maximale : $1$" },
        activatedAt: { message: "Activé à $1$" },
        expiresIn: { message: "Expire dans $1$" },
        lastUpdated: { message: "Dernière mise à jour : $1$" },
        
        // Justification
        justificationRequired: { message: "Justification Requise" },
        justificationNote: { message: "Ce rôle nécessite une justification métier pour l'activation" },
        defaultJustification: { message: "Activation de rôle demandée via l'extension Assistant PIM" },
        adminJustification: { message: "Tâche administrative nécessitant des privilèges élevés - Activation de rôle via l'extension Assistant PIM" },
        
        // Alertes et Messages
        rolesExpiringAlert: { message: "$1$ rôle$2$ expirant dans 1 heure" },
        activationSuccess: { message: "$1$ activé avec succès" },
        extensionSuccess: { message: "$1$ prolongé pour une durée supplémentaire" },
        activationFailed: { message: "Échec de l'activation de $1$ : $2$" },
        extensionFailed: { message: "Échec de la prolongation de $1$ : $2$" },
        rolesLoaded: { message: "$1$ rôles chargés en $2$ms" },
        languageChanged: { message: "Langue changée avec succès" },
        
        // Messages d'Erreur
        serviceNotResponding: { message: "Le service d'extension ne répond pas. Essayez de recharger l'extension." },
        authenticationRequired: { message: "Authentification requise. Cliquez sur actualiser pour vous connecter." },
        serviceNotAvailable: { message: "Le service d'extension n'est pas disponible" },
        roleNotFound: { message: "Rôle introuvable" },
        loadRolesFailed: { message: "Échec du chargement des rôles : $1$" },
        refreshFailed: { message: "Échec de l'actualisation : $1$" },
        
        // Types de Rôles et Services
        roleCritical: { message: "Critique" },
        roleHigh: { message: "Élevé" },
        roleMedium: { message: "Moyen" },
        serviceAzure: { message: "Azure" },
        serviceEntraId: { message: "Entra ID" },
        serviceMicrosoft365: { message: "Microsoft 365" },
        directoryScope: { message: "Répertoire" },
        
        // Formats de Temps
        hoursFormat: { message: "$1$ heure$2$" },
        timeFormatHoursMinutes: { message: "$1$h $2$m" },
        timeFormatMinutes: { message: "$1$m" }
      }
    };

    return messages[language] || messages.en;
  }

  // Ensure background script is running
  async ensureBackgroundScript() {
    try {
      console.log('Checking background script...');
      const response = await this.sendMessage({ action: 'getAuthStatus' }, 5000);
      if (response && response.success !== undefined) {
        console.log('Background script is running');
        return true;
      }
    } catch (error) {
      console.warn('Background script not responding, attempting to wake up...');
    }

    // Try to wake up the background script
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await this.sendMessage({ action: 'getAuthStatus' }, 10000);
      if (response && response.success !== undefined) {
        console.log('Background script is now running');
        return true;
      }
    } catch (error) {
      console.error('Failed to establish connection with background script');
      this.showStatus('error', this.getMessage('serviceNotResponding'));
      return false;
    }
  }

  setupEventListeners() {
    // Language toggle
    document.getElementById('language-toggle').addEventListener('click', () => {
      this.toggleLanguage();
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.cycleTheme();
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.handleRefresh();
    });

    // Tab switching
    document.querySelectorAll('.tab-trigger').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Role action buttons (delegated event handling)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('activate-btn')) {
        const roleId = e.target.dataset.roleId;
        const roleName = e.target.dataset.roleName;
        this.handleActivateRole(roleId, roleName);
      }
      
      if (e.target.classList.contains('extend-btn')) {
        const roleId = e.target.dataset.roleId;
        const roleName = e.target.dataset.roleName;
        this.handleExtendRole(roleId, roleName);
      }
    });
  }

  // Enhanced Chrome extension messaging with retry logic and better error handling
  async sendMessage(message, timeout = 15000, retries = 2) {
    console.log('Sending message to background:', message);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'));
          }, timeout);
          
          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });

        console.log('Received response from background:', response);
        return response || { success: false, error: 'Empty response' };

      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === retries) {
          // Last attempt failed
          if (error.message.includes('Could not establish connection') || 
              error.message.includes('Receiving end does not exist')) {
            throw new Error(this.getMessage('serviceNotResponding'));
          }
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // Theme management
  applyTheme(theme) {
    const root = document.documentElement;
    root.classList.remove('dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      }
    }
    
    this.updateThemeIcon(theme);
  }

  cycleTheme() {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    this.theme = nextTheme;
    this.applyTheme(nextTheme);
  }

  updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    const icons = {
      light: '☀️',
      dark: '🌙',
      system: '💻'
    };
    icon.textContent = icons[theme] || '☀️';
  }

  // Role data conversion with justification support
  convertApiRole(apiRole, type = 'eligible') {
    console.log(`convertApiRole called for "${apiRole.roleName}" with requiresJustification: ${apiRole.requiresJustification}`);
    
    const getServiceFromRole = (roleName) => {
      const azureRoles = ['Owner', 'Contributor', 'Reader', 'Key Vault', 'Storage'];
      const entraRoles = ['Global Administrator', 'Security Administrator', 'User Administrator', 'Privileged Role Administrator'];
      const m365Roles = ['Exchange Administrator', 'SharePoint Administrator', 'Teams Administrator'];
      
      if (azureRoles.some(role => roleName.includes(role))) return this.getMessage('serviceAzure');
      if (entraRoles.some(role => roleName.includes(role))) return this.getMessage('serviceEntraId');
      if (m365Roles.some(role => roleName.includes(role))) return this.getMessage('serviceMicrosoft365');
      return this.getMessage('serviceEntraId');
    };

    const getRoleType = (roleName) => {
      const criticalRoles = ['Global Administrator', 'Privileged Role Administrator', 'Owner'];
      const highRoles = ['Security Administrator', 'Contributor', 'Key Vault Administrator'];
      
      if (criticalRoles.some(role => roleName.includes(role))) return this.getMessage('roleCritical');
      if (highRoles.some(role => roleName.includes(role))) return this.getMessage('roleHigh');
      return this.getMessage('roleMedium');
    };

    const parseDuration = (duration) => {
      if (!duration) return this.getMessage('hoursFormat', ['1', '']);
      const match = duration.match(/PT(\d+)H/);
      const hours = match ? match[1] : '1';
      const plural = hours !== '1' ? 's' : '';
      return this.getMessage('hoursFormat', [hours, plural]);
    };

    const role = {
      id: apiRole.id,
      name: apiRole.roleName,
      scope: apiRole.directoryScopeId === '/' ? this.getMessage('directoryScope') : apiRole.directoryScopeId,
      type: getRoleType(apiRole.roleName),
      service: getServiceFromRole(apiRole.roleName),
      description: `Manage ${apiRole.roleName.replace(' Administrator', '').toLowerCase()} settings and permissions`,
      roleDefinitionId: apiRole.roleDefinitionId,
      principalId: apiRole.principalId,
      directoryScopeId: apiRole.directoryScopeId,
      // Use the actual Azure PIM policy setting
      requiresJustification: apiRole.requiresJustification || false
    };

    console.log(`Final role object for "${role.name}": requiresJustification = ${role.requiresJustification} (from Azure PIM policy)`);

    if (type === 'eligible') {
      role.maxDuration = parseDuration(apiRole.scheduleInfo?.expiration?.duration);
    } else {
      role.activatedAt = apiRole.scheduleInfo?.startDateTime ? new Date(apiRole.scheduleInfo.startDateTime) : null;
      role.expiresAt = apiRole.scheduleInfo?.expiration?.endDateTime ? new Date(apiRole.scheduleInfo.expiration.endDateTime) : null;
    }

    return role;
  }

  // Optimized role loading with proper error handling
  async loadRoles() {
    try {
      this.setLoadingWithProgress(this.getMessage('connectingService'));
      this.clearStatus();
      console.log('Starting role loading...');
      const overallStartTime = performance.now();

      // Ensure background script is responsive
      const backgroundReady = await this.ensureBackgroundScript();
      if (!backgroundReady) {
        throw new Error(this.getMessage('serviceNotAvailable'));
      }

      // Load both eligible and active roles in parallel for faster loading
      this.setLoadingWithProgress(this.getMessage('fetchingRoles'));
      const [eligibleResponse, activeResponse] = await Promise.all([
        this.sendMessage({ action: 'listEligibleRoles' }),
        this.sendMessage({ action: 'listActiveRoles' })
      ]);

      // Check for errors
      if (!eligibleResponse || !eligibleResponse.success) {
        throw new Error(eligibleResponse?.error || 'Failed to load eligible roles');
      }

      if (!activeResponse || !activeResponse.success) {
        throw new Error(activeResponse?.error || 'Failed to load active roles');
      }

      // Convert and categorize roles
      this.setLoadingWithProgress(this.getMessage('processingRoles'));
      console.log('Converting role data...');
      const convertStartTime = performance.now();
      
      console.log('Raw eligible roles data:', eligibleResponse.data?.value);
      console.log('Raw active roles data:', activeResponse.data?.value);
      
      const eligible = (eligibleResponse.data?.value || []).map(role => {
        const convertedRole = this.convertApiRole(role, 'eligible');
        console.log(`Converting role "${convertedRole.name}": original requiresJustification = ${role.requiresJustification}, converted = ${convertedRole.requiresJustification}`);
        return convertedRole;
      });
      const active = (activeResponse.data?.value || []).map(role => this.convertApiRole(role, 'active'));
      
      console.log('Converted eligible roles:', eligible.map(r => ({ name: r.name, requiresJustification: r.requiresJustification })));
      
      const convertEndTime = performance.now();
      console.log(`Role conversion took ${(convertEndTime - convertStartTime).toFixed(2)}ms`);
      
      // Separate expiring roles (less than 1 hour remaining)
      const now = new Date();
      const expiring = active.filter(role => {
        if (!role.expiresAt) return false;
        const diff = role.expiresAt - now;
        return diff <= 60 * 60 * 1000; // Less than 1 hour
      });

      // Update state
      this.eligibleRoles = eligible;
      this.activeRoles = active;
      this.expiringRoles = expiring;
      
      const overallEndTime = performance.now();
      console.log(`Total loading time: ${(overallEndTime - overallStartTime).toFixed(2)}ms`);
      
      // Update UI
      this.setLoadingWithProgress(this.getMessage('updatingInterface'));
      this.updateLastRefresh();
      this.renderRoles();
      this.updateTabCounts();

      // Show performance info in success message
      const loadTime = Math.round(overallEndTime - overallStartTime);
      this.showStatus('success', this.getMessage('rolesLoaded', [
        (eligible.length + active.length).toString(),
        loadTime.toString()
      ]));

    } catch (error) {
      console.error('Role loading error:', error);
      
      // Show specific error messages for common issues
      if (error.message.includes('service worker') || error.message.includes('extension service')) {
        this.showStatus('error', this.getMessage('serviceNotResponding'));
      } else if (error.message.includes('authentication') || error.message.includes('token')) {
        this.showStatus('error', this.getMessage('authenticationRequired'));
      } else {
        this.showStatus('error', this.getMessage('loadRolesFailed', [error.message]));
      }
    } finally {
      this.setLoading(false);
      this.refreshing = false;
    }
  }

  async handleRefresh() {
    this.refreshing = true;
    this.updateRefreshButton();
    
    try {
      await this.loadRoles();
    } catch (error) {
      console.error('Refresh error:', error);
      this.showStatus('error', this.getMessage('refreshFailed', [error.message]));
    } finally {
      this.updateRefreshButton();
    }
  }

  // Simplified role activation without modal
  async handleActivateRole(roleId, roleName) {
    const role = this.eligibleRoles.find(r => r.id === roleId);
    if (!role) {
      this.showStatus('error', this.getMessage('roleNotFound'));
      return;
    }

    this.activatingRoles.add(roleId);
    this.updateRoleButton(roleId, 'activating');
    this.clearStatus();

    try {
      console.log('Activating role:', role);

      const eligibilityData = {
        roleDefinitionId: role.roleDefinitionId,
        principalId: role.principalId,
        directoryScopeId: role.directoryScopeId || '/',
        requiresJustification: role.requiresJustification
      };

      console.log('Eligibility data:', eligibilityData);

      // Use appropriate justification based on role requirements
      const justification = role.requiresJustification 
        ? this.getMessage('adminJustification')
        : this.getMessage('defaultJustification');

      const response = await this.sendMessage({
        action: 'activateRole',
        eligibility: eligibilityData,
        duration: 'PT1H',
        justification: justification
      });

      console.log('Activation response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Activation failed');
      }

      this.showStatus('success', this.getMessage('activationSuccess', [roleName]));
      setTimeout(() => this.loadRoles(), 3000);

    } catch (error) {
      console.error('Activation error:', error);
      this.showStatus('error', this.getMessage('activationFailed', [roleName, error.message]));
    } finally {
      this.activatingRoles.delete(roleId);
      this.updateRoleButton(roleId, 'normal');
    }
  }

  async handleExtendRole(roleId, roleName) {
    this.extendingRoles.add(roleId);
    this.updateRoleButton(roleId, 'extending');
    this.clearStatus();

    try {
      const role = [...this.activeRoles, ...this.expiringRoles].find(r => r.id === roleId);
      if (!role) throw new Error(this.getMessage('roleNotFound'));

      const response = await this.sendMessage({
        action: 'extendRole',
        assignment: {
          id: role.id,
          roleDefinitionId: role.roleDefinitionId,
          principalId: role.principalId,
          directoryScopeId: role.directoryScopeId
        }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Extension failed');
      }

      this.showStatus('success', this.getMessage('extensionSuccess', [roleName]));
      setTimeout(() => this.loadRoles(), 1000);

    } catch (error) {
      this.showStatus('error', this.getMessage('extensionFailed', [roleName, error.message]));
    } finally {
      this.extendingRoles.delete(roleId);
      this.updateRoleButton(roleId, 'normal');
    }
  }

  // UI Helper functions
  setLoading(loading) {
    this.loading = loading;
    document.getElementById('loading-screen').style.display = loading ? 'flex' : 'none';
    document.getElementById('main-content').style.display = loading ? 'none' : 'block';
  }

  setLoadingWithProgress(message = null) {
    this.loading = true;
    const loadingScreen = document.getElementById('loading-screen');
    const loadingContent = loadingScreen.querySelector('.loading-content p');
    
    loadingScreen.style.display = 'flex';
    loadingContent.textContent = message || this.getMessage('loadingRoles');
    document.getElementById('main-content').style.display = 'none';
  }

  updateRefreshButton() {
    const btn = document.getElementById('refresh-btn');
    const icon = btn.querySelector('.refresh-icon');
    if (this.refreshing) {
      icon.classList.add('spinning');
      btn.disabled = true;
    } else {
      icon.classList.remove('spinning');
      btn.disabled = false;
    }
  }

  updateLastRefresh() {
    const element = document.getElementById('last-refresh');
    element.textContent = this.getMessage('lastUpdated', [new Date().toLocaleTimeString()]);
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-trigger').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById(`${tabName}-content`).style.display = 'block';
  }

  updateTabCounts() {
    document.getElementById('eligible-count').textContent = this.eligibleRoles.length;
    document.getElementById('active-count').textContent = this.activeRoles.length;
    document.getElementById('expiring-count').textContent = this.expiringRoles.length;
    
    // Show warning for expiring roles
    const expiringTab = document.querySelector('[data-tab="expiring"]');
    const warningIcon = expiringTab.querySelector('.warning-icon');
    if (this.expiringRoles.length > 0) {
      warningIcon.style.display = 'inline';
    } else {
      warningIcon.style.display = 'none';
    }
  }

  // Optimized rendering methods
  renderRoles() {
    const renderStartTime = performance.now();
    
    this.renderEligibleRolesOptimized();
    this.renderActiveRolesOptimized();
    this.renderExpiringRolesOptimized();
    
    const renderEndTime = performance.now();
    console.log(`Role rendering took ${(renderEndTime - renderStartTime).toFixed(2)}ms`);
  }

  renderEligibleRolesOptimized() {
    const container = document.getElementById('eligible-roles');
    if (this.eligibleRoles.length === 0) {
      container.innerHTML = this.getEmptyStateHTML('👑', this.getMessage('noEligibleRoles'));
      return;
    }

    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    const roleHTML = this.eligibleRoles.map(role => this.getRoleItemHTML(role, 'eligible')).join('');
    tempDiv.innerHTML = roleHTML;
    
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  renderActiveRolesOptimized() {
    const container = document.getElementById('active-roles');
    if (this.activeRoles.length === 0) {
      container.innerHTML = this.getEmptyStateHTML('✅', this.getMessage('noActiveRoles'));
      return;
    }

    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    const roleHTML = this.activeRoles.map(role => this.getRoleItemHTML(role, 'active')).join('');
    tempDiv.innerHTML = roleHTML;
    
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  renderExpiringRolesOptimized() {
    const container = document.getElementById('expiring-roles');
    if (this.expiringRoles.length === 0) {
      container.innerHTML = this.getEmptyStateHTML('🕐', this.getMessage('noExpiringRoles'));
      return;
    }

    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    let html = '';
    if (this.expiringRoles.length > 0) {
      const plural = this.expiringRoles.length !== 1 ? 's' : '';
      html += `
        <div class="alert alert-destructive">
          <span class="alert-icon">⚠️</span>
          <span>${this.getMessage('rolesExpiringAlert', [this.expiringRoles.length.toString(), plural])}</span>
        </div>
      `;
    }
    
    html += this.expiringRoles.map(role => this.getRoleItemHTML(role, 'expiring')).join('');
    tempDiv.innerHTML = html;
    
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  // Role item HTML with justification indicators
  getRoleItemHTML(role, type) {
    const isActivating = this.activatingRoles.has(role.id);
    const isExtending = this.extendingRoles.has(role.id);
    
    // Debug logging for justification
    console.log(`Rendering role "${role.name}": requiresJustification = ${role.requiresJustification}`);
    
    return `
      <div class="role-item">
        <div class="role-info">
          <div class="role-header">
            <h4 class="role-name">${role.name}</h4>
            <div class="role-badges">
              <span class="badge badge-${role.type.toLowerCase().replace(/\s+/g, '')}">${role.type}</span>
              <span class="service-tag service-${role.service.replace(/\s+/g, '').toLowerCase()}">${role.service}</span>
              ${role.requiresJustification ? `<span class="justification-tag">📝 ${this.getMessage('justificationRequired')}</span>` : ''}
            </div>
          </div>
          <p class="role-scope">${role.scope}</p>
          <p class="role-description">${role.description}</p>
          
          ${type === 'eligible' && role.maxDuration ? `
            <p class="role-duration">${this.getMessage('maxDuration', [role.maxDuration])}</p>
          ` : ''}
          
          ${role.requiresJustification && type === 'eligible' ? `
            <p class="justification-note">⚠️ ${this.getMessage('justificationNote')}</p>
          ` : ''}
          
          ${(type === 'active' || type === 'expiring') && role.activatedAt ? `
            <p class="role-activated">${this.getMessage('activatedAt', [role.activatedAt.toLocaleTimeString()])}</p>
          ` : ''}
          
          ${(type === 'active' || type === 'expiring') && role.expiresAt ? `
            <p class="role-expires ${this.isExpiringSoon(role.expiresAt) ? 'expires-soon' : ''}">
              🕐 ${this.getMessage('expiresIn', [this.formatTimeRemaining(role.expiresAt)])}
            </p>
          ` : ''}
        </div>
        
        <div class="role-actions">
          ${type === 'eligible' ? `
            <button class="btn btn-primary activate-btn" 
                    data-role-id="${role.id}" 
                    data-role-name="${role.name}"
                    data-requires-justification="${role.requiresJustification || false}"
                    ${isActivating ? 'disabled' : ''}>
              ${isActivating ? `⏳ ${this.getMessage('activatingButton')}` : this.getMessage('activateButton')}
            </button>
          ` : ''}
          
          ${(type === 'active' || type === 'expiring') ? `
            <button class="btn btn-outline extend-btn" 
                    data-role-id="${role.id}" 
                    data-role-name="${role.name}"
                    ${isExtending ? 'disabled' : ''}>
              ${isExtending ? `⏳ ${this.getMessage('extendingButton')}` : this.getMessage('extendButton')}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getEmptyStateHTML(icon, message) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <p class="empty-message">${message}</p>
      </div>
    `;
  }

  updateRoleButton(roleId, state) {
    const button = document.querySelector(`[data-role-id="${roleId}"]`);
    if (!button) return;

    switch (state) {
      case 'activating':
        button.disabled = true;
        button.textContent = `⏳ ${this.getMessage('activatingButton')}`;
        break;
      case 'extending':
        button.disabled = true;
        button.textContent = `⏳ ${this.getMessage('extendingButton')}`;
        break;
      case 'normal':
        button.disabled = false;
        if (button.classList.contains('activate-btn')) {
          button.textContent = this.getMessage('activateButton');
        } else if (button.classList.contains('extend-btn')) {
          button.textContent = this.getMessage('extendButton');
        }
        break;
    }
  }

  // Utility functions
  formatTimeRemaining(expiresAt) {
    const now = new Date();
    const diff = expiresAt - now;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return this.getMessage('timeFormatHoursMinutes', [hours.toString(), (minutes % 60).toString()]);
    }
    return this.getMessage('timeFormatMinutes', [minutes.toString()]);
  }

  isExpiringSoon(expiresAt) {
    const now = new Date();
    const diff = expiresAt - now;
    return diff <= 60 * 60 * 1000; // Less than 1 hour
  }

  showStatus(type, message) {
    const statusElement = document.getElementById('status-message');
    statusElement.className = `status-message status-${type}`;
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => this.clearStatus(), 5000);
    }
  }

  clearStatus() {
    const statusElement = document.getElementById('status-message');
    statusElement.style.display = 'none';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AzurePIMHelper();
});