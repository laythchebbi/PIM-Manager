// Enhanced Azure PIM Helper Background Script
// With Role Expiration Notifications - Multi-Tenant Version

console.log('Background script loading...');

// Helper function to get localized messages in background script
function getMessage(messageKey, substitutions = []) {
  return chrome.i18n.getMessage(messageKey, substitutions);
}

// Configuration - Updated for Multi-Tenant Support
const CONFIG = {
  CLIENT_ID: '91ed420f-07a9-4c4a-9b55-dc4468a9225b',
  // REMOVED: TENANT_ID - Now using 'common' endpoint for multi-tenant
  REDIRECT_URI: chrome.identity.getRedirectURL(),
  SCOPES: [
    'https://graph.microsoft.com/RoleManagement.ReadWrite.Directory',
    'https://graph.microsoft.com/PrivilegedAccess.ReadWrite.AzureResources', 
    'https://graph.microsoft.com/RoleAssignmentSchedule.ReadWrite.Directory',
    'https://graph.microsoft.com/Directory.Read.All',
    'https://graph.microsoft.com/Policy.Read.All',
    'https://graph.microsoft.com/RoleManagementPolicy.Read.Directory'
  ],
  GRAPH_BASE_URL: 'https://graph.microsoft.com/v1.0',
  TOKEN_ENDPOINT: 'https://login.microsoftonline.com/common' // Changed for multi-tenant
};

console.log('Multi-tenant configuration loaded:', { CLIENT_ID: CONFIG.CLIENT_ID, REDIRECT_URI: CONFIG.REDIRECT_URI });

// Notification Manager for Role Expiration Warnings
class NotificationManager {
  constructor() {
    this.activeNotifications = new Map();
    this.monitoringInterval = null;
    this.checkIntervalMinutes = 1; // Check every minute
    this.warningTimeMinutes = 15; // Warn 15 minutes before expiration
    
    console.log('NotificationManager initialized');
    this.setupNotificationPermissions();
  }

  async setupNotificationPermissions() {
    try {
      // Check if we have notification permission
      const permission = await chrome.notifications.getPermissionLevel();
      console.log('Notification permission level:', permission);
      
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  }

  startMonitoring(graphClient) {
    console.log('🔔 Starting role expiration monitoring...');
    
    // Clear any existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkRoleExpirations(graphClient);
      } catch (error) {
        console.error('Error during role expiration check:', error);
      }
    }, this.checkIntervalMinutes * 60 * 1000);

    // Also check immediately
    this.checkRoleExpirations(graphClient);
  }

  stopMonitoring() {
    console.log('🔔 Stopping role expiration monitoring...');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.clearAllNotifications();
  }

  async checkRoleExpirations(graphClient) {
    try {
      console.log('🔍 Checking for role expirations...');
      
      // Get active roles
      const activeRolesResponse = await graphClient.listActiveRoles();
      const activeRoles = activeRolesResponse.value || [];
      
      const now = new Date();
      const warningThreshold = new Date(now.getTime() + (this.warningTimeMinutes * 60 * 1000));
      
      console.log(`📅 Current time: ${now.toISOString()}`);
      console.log(`⚠️ Warning threshold: ${warningThreshold.toISOString()}`);
      
      for (const role of activeRoles) {
        await this.checkSingleRoleExpiration(role, now, warningThreshold);
      }

      // Clean up notifications for roles that are no longer active
      this.cleanupInactiveNotifications(activeRoles);
      
    } catch (error) {
      console.error('Error checking role expirations:', error);
    }
  }

  async checkSingleRoleExpiration(role, now, warningThreshold) {
    const roleId = role.roleDefinitionId;
    const roleName = role.roleName || 'Unknown Role';
    
    // Get expiration time
    const expirationTime = this.getRoleExpirationTime(role);
    
    if (!expirationTime) {
      console.log(`⏰ No expiration time found for role: ${roleName}`);
      return;
    }

    const expirationDate = new Date(expirationTime);
    const timeUntilExpiration = expirationDate.getTime() - now.getTime();
    const minutesUntilExpiration = Math.floor(timeUntilExpiration / (1000 * 60));
    
    console.log(`⏰ Role "${roleName}" expires in ${minutesUntilExpiration} minutes (${expirationDate.toISOString()})`);

    // Check if role is expiring within warning threshold
    if (expirationDate <= warningThreshold && expirationDate > now) {
      await this.createExpirationWarning(role, expirationDate, minutesUntilExpiration);
    } else if (expirationDate <= now) {
      // Role has already expired
      await this.createExpiredNotification(role);
    } else {
      // Role is not close to expiring, clear any existing notification
      this.clearNotificationForRole(roleId);
    }
  }

  getRoleExpirationTime(role) {
    // Try different possible locations for expiration time
    if (role.scheduleInfo?.expiration?.endDateTime) {
      return role.scheduleInfo.expiration.endDateTime;
    }
    if (role.endDateTime) {
      return role.endDateTime;
    }
    if (role.expiration?.endDateTime) {
      return role.expiration.endDateTime;
    }
    return null;
  }

  async createExpirationWarning(role, expirationDate, minutesUntilExpiration) {
    const roleId = role.roleDefinitionId;
    const roleName = role.roleName || 'Unknown Role';
    const notificationId = `expiration_${roleId}`;
    
    // Don't create duplicate notifications
    if (this.activeNotifications.has(notificationId)) {
      console.log(`🔔 Notification already exists for role: ${roleName}`);
      return;
    }

    const timeText = minutesUntilExpiration === 1 ? '1 minute' : `${minutesUntilExpiration} minutes`;
    
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon-48.png', // Make sure you have this icon
      title: '⚠️ Azure Role Expiring Soon',
      message: `Your "${roleName}" role will expire in ${timeText}`,
      buttons: [
        { title: 'Extend Role' },
        { title: 'Dismiss' }
      ],
      requireInteraction: true, // Keep notification until user interacts
      priority: 2 // High priority
    };

    try {
      await chrome.notifications.create(notificationId, notificationOptions);
      
      // Store notification info
      this.activeNotifications.set(notificationId, {
        role: role,
        type: 'expiration_warning',
        createdAt: new Date(),
        expirationDate: expirationDate
      });
      
      console.log(`🔔 Created expiration warning for role: ${roleName}`);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async createExpiredNotification(role) {
    const roleId = role.roleDefinitionId;
    const roleName = role.roleName || 'Unknown Role';
    const notificationId = `expired_${roleId}`;
    
    // Don't create duplicate notifications
    if (this.activeNotifications.has(notificationId)) {
      return;
    }

    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: '🚨 Azure Role Expired',
      message: `Your "${roleName}" role has expired`,
      buttons: [
        { title: 'Reactivate' },
        { title: 'Dismiss' }
      ],
      requireInteraction: true,
      priority: 2
    };

    try {
      await chrome.notifications.create(notificationId, notificationOptions);
      
      this.activeNotifications.set(notificationId, {
        role: role,
        type: 'expired',
        createdAt: new Date()
      });
      
      console.log(`🔔 Created expired notification for role: ${roleName}`);
    } catch (error) {
      console.error('Error creating expired notification:', error);
    }
  }

  clearNotificationForRole(roleId) {
    const notificationIds = [`expiration_${roleId}`, `expired_${roleId}`];
    
    for (const notificationId of notificationIds) {
      if (this.activeNotifications.has(notificationId)) {
        chrome.notifications.clear(notificationId);
        this.activeNotifications.delete(notificationId);
        console.log(`🗑️ Cleared notification: ${notificationId}`);
      }
    }
  }

  cleanupInactiveNotifications(activeRoles) {
    const activeRoleIds = new Set(activeRoles.map(role => role.roleDefinitionId));
    
    for (const [notificationId, notificationInfo] of this.activeNotifications) {
      const roleId = notificationInfo.role.roleDefinitionId;
      
      if (!activeRoleIds.has(roleId)) {
        chrome.notifications.clear(notificationId);
        this.activeNotifications.delete(notificationId);
        console.log(`🗑️ Cleaned up notification for inactive role: ${notificationInfo.role.roleName}`);
      }
    }
  }

  clearAllNotifications() {
    for (const notificationId of this.activeNotifications.keys()) {
      chrome.notifications.clear(notificationId);
    }
    this.activeNotifications.clear();
    console.log('🗑️ Cleared all notifications');
  }

  // Handle notification button clicks
  handleNotificationClick(notificationId, buttonIndex, pimManager) {
    const notificationInfo = this.activeNotifications.get(notificationId);
    
    if (!notificationInfo) {
      console.log('Notification info not found for:', notificationId);
      return;
    }

    const role = notificationInfo.role;
    console.log(`🖱️ Notification button clicked: ${notificationId}, button: ${buttonIndex}`);

    if (buttonIndex === 0) {
      // First button clicked
      if (notificationInfo.type === 'expiration_warning') {
        // Extend role
        this.handleExtendRole(role, pimManager);
      } else if (notificationInfo.type === 'expired') {
        // Reactivate role
        this.handleReactivateRole(role, pimManager);
      }
    } else if (buttonIndex === 1) {
      // Dismiss button clicked
      this.clearNotificationForRole(role.roleDefinitionId);
    }
  }

  async handleExtendRole(role, pimManager) {
    try {
      console.log(`🔄 Extending role: ${role.roleName}`);
      
      const result = await pimManager.graphClient.extendRole(
        role,
        'PT2H', // Extend by 2 hours
        'Extension requested via notification'
      );
      
      // Show success notification
      await chrome.notifications.create(`extend_success_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: '✅ Role Extended',
        message: `Successfully extended "${role.roleName}" role`,
        priority: 1
      });
      
      // Clear the expiration warning
      this.clearNotificationForRole(role.roleDefinitionId);
      
    } catch (error) {
      console.error('Error extending role:', error);
      
      // Show error notification
      await chrome.notifications.create(`extend_error_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: '❌ Extension Failed',
        message: `Failed to extend "${role.roleName}": ${error.message}`,
        priority: 2
      });
    }
  }

  async handleReactivateRole(role, pimManager) {
    try {
      console.log(`🔄 Reactivating role: ${role.roleName}`);
      
      // Find the corresponding eligible role
      const eligibleRoles = await pimManager.graphClient.listEligibleRoles();
      const eligibleRole = eligibleRoles.value.find(er => er.roleDefinitionId === role.roleDefinitionId);
      
      if (!eligibleRole) {
        throw new Error('Eligible role not found');
      }
      
      const result = await pimManager.graphClient.activateRole(
        eligibleRole,
        'PT8H', // Activate for 8 hours
        'Reactivation requested via notification'
      );
      
      // Show success notification
      await chrome.notifications.create(`reactivate_success_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: '✅ Role Reactivated',
        message: `Successfully reactivated "${role.roleName}" role`,
        priority: 1
      });
      
      // Clear the expired notification
      this.clearNotificationForRole(role.roleDefinitionId);
      
    } catch (error) {
      console.error('Error reactivating role:', error);
      
      // Show error notification
      await chrome.notifications.create(`reactivate_error_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: '❌ Reactivation Failed',
        message: `Failed to reactivate "${role.roleName}": ${error.message}`,
        priority: 2
      });
    }
  }
}

// Token management - Updated for Multi-Tenant Support
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userTenant = null; // Added for tenant info storage
    console.log('TokenManager initialized for multi-tenant');
  }

  async getValidToken() {
    console.log('Getting valid token...');
    if (this.isTokenExpired()) {
      console.log('Token expired, authenticating...');
      await this.authenticate();
    }
    return this.accessToken;
  }

  isTokenExpired() {
    if (!this.accessToken || !this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000; // Refresh 1 minute before expiry
  }

  async authenticate() {
    console.log('Starting Chrome Identity API authentication for multi-tenant...');
    
    // Clear all storage
    await chrome.storage.local.clear();
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userTenant = null;

    // Use Chrome's built-in OAuth2 flow with common endpoint for multi-tenant
    const authUrl = `${CONFIG.TOKEN_ENDPOINT}/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        response_type: 'token', // Use implicit flow instead of authorization code
        redirect_uri: CONFIG.REDIRECT_URI,
        scope: CONFIG.SCOPES.join(' '),
        response_mode: 'fragment',
        state: Date.now().toString(),
        nonce: Date.now().toString()
      });

    console.log('Using multi-tenant implicit flow auth URL:', authUrl);

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, async (redirectUrl) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome identity error:', chrome.runtime.lastError);
          return reject(new Error(chrome.runtime.lastError.message));
        }

        if (!redirectUrl) {
          return reject(new Error('No redirect URL received'));
        }

        try {
          console.log('Auth redirect received');
          
          // Parse the fragment for tokens (implicit flow)
          const url = new URL(redirectUrl);
          const fragment = url.hash.substring(1); // Remove the #
          const params = new URLSearchParams(fragment);
          
          const accessToken = params.get('access_token');
          const error = params.get('error');
          const expiresIn = params.get('expires_in');
          
          console.log('Auth response params:', {
            hasToken: !!accessToken,
            error: error,
            expiresIn: expiresIn
          });

          if (error) {
            throw new Error(`OAuth error: ${params.get('error_description') || error}`);
          }

          if (!accessToken) {
            throw new Error('No access token received');
          }

          // Store the token
          this.accessToken = accessToken;
          this.tokenExpiry = Date.now() + (parseInt(expiresIn) * 1000);

          // Extract and store tenant information from the token
          try {
            const tokenPayload = JSON.parse(atob(this.accessToken.split('.')[1]));
            this.userTenant = {
              tenantId: tokenPayload.tid,
              tenantName: tokenPayload.iss,
              userPrincipalName: tokenPayload.upn || tokenPayload.preferred_username,
              userName: tokenPayload.name
            };
            
            await chrome.storage.local.set({
              accessToken: this.accessToken,
              tokenExpiry: this.tokenExpiry,
              userTenant: this.userTenant // Store tenant info
            });
            
            console.log('Token and tenant info stored successfully:', this.userTenant);
          } catch (parseError) {
            console.warn('Could not parse tenant info from token:', parseError);
            // Still store the token even if we can't parse tenant info
            await chrome.storage.local.set({
              accessToken: this.accessToken,
              tokenExpiry: this.tokenExpiry
            });
          }

          console.log('Multi-tenant token stored successfully via implicit flow');
          resolve();

        } catch (err) {
          console.error('Token parsing error:', err);
          reject(err);
        }
      });
    });
  }

  async loadStoredTokens() {
    console.log('Loading stored tokens...');
    const stored = await chrome.storage.local.get(['accessToken', 'tokenExpiry', 'userTenant']);
    this.accessToken = stored.accessToken;
    this.tokenExpiry = stored.tokenExpiry;
    this.userTenant = stored.userTenant;
    console.log('Stored tokens loaded:', { 
      hasAccessToken: !!this.accessToken, 
      tenant: this.userTenant?.tenantId || 'unknown'
    });
  }

  async clearTokens() {
    console.log('Clearing tokens...');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userTenant = null;
    await chrome.storage.local.clear();
  }
}

// API client for Microsoft Graph
class GraphAPIClient {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.roleDefinitionCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour cache
    this.lastCacheUpdate = 0;
    console.log('GraphAPIClient initialized');
  }

  async makeRequest(endpoint, options = {}) {
    console.log('Making API request:', endpoint);
    const token = await this.tokenManager.getValidToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.GRAPH_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.error_description || 'API request failed';
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error('API request failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('API request successful:', { endpoint, resultCount: data.value?.length || 'N/A' });
    return data;
  }

  async preloadRoleDefinitions() {
    const now = Date.now();
    
    if (this.roleDefinitionCache.size > 0 && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      return;
    }

    try {
      console.log('Preloading role definitions...');
      const data = await this.makeRequest('/roleManagement/directory/roleDefinitions?$select=id,displayName,description');
      
      this.roleDefinitionCache.clear();
      data.value.forEach(role => {
        this.roleDefinitionCache.set(role.id, {
          displayName: role.displayName,
          description: role.description
        });
      });
      
      this.lastCacheUpdate = now;
      console.log(`Preloaded ${data.value.length} role definitions`);
      
    } catch (error) {
      console.warn('Failed to preload role definitions:', error);
    }
  }

  async fetchRoleDefinition(roleDefinitionId) {
    if (this.roleDefinitionCache.has(roleDefinitionId)) {
      return this.roleDefinitionCache.get(roleDefinitionId).displayName;
    }

    try {
      const data = await this.makeRequest(`/roleManagement/directory/roleDefinitions/${roleDefinitionId}?$select=displayName`);
      
      this.roleDefinitionCache.set(roleDefinitionId, {
        displayName: data.displayName,
        description: data.description || ''
      });
      
      return data.displayName;
    } catch (error) {
      console.warn(`Failed to fetch role definition ${roleDefinitionId}:`, error);
      return roleDefinitionId;
    }
  }

  async enrichRolesWithNames(roles) {
    const uniqueRoleIds = [...new Set(roles.map(role => role.roleDefinitionId))];
    const missingRoleIds = uniqueRoleIds.filter(id => !this.roleDefinitionCache.has(id));
    
    if (missingRoleIds.length > 0) {
      console.log(`Fetching ${missingRoleIds.length} missing role definitions...`);
      
      const filterQuery = missingRoleIds.map(id => `id eq '${id}'`).join(' or ');
      
      try {
        const data = await this.makeRequest(
          `/roleManagement/directory/roleDefinitions?$filter=${encodeURIComponent(filterQuery)}&$select=id,displayName,description`
        );
        
        data.value.forEach(role => {
          this.roleDefinitionCache.set(role.id, {
            displayName: role.displayName,
            description: role.description
          });
        });
      } catch (error) {
        console.warn('Batch role definition fetch failed:', error);
      }
    }

    return roles.map(role => ({
      ...role,
      roleName: this.roleDefinitionCache.get(role.roleDefinitionId)?.displayName || role.roleDefinitionId
    }));
  }

  async listEligibleRoles() {
    console.log('Loading eligible roles...');
    await this.preloadRoleDefinitions();
    
    const data = await this.makeRequest(
      "/roleManagement/directory/roleEligibilityScheduleInstances/filterByCurrentUser(on='principal')"
    );

    console.log('🔍 Raw eligibility data:', data);

    // Enrich roles with names first
    const enrichedRoles = await this.enrichRolesWithNames(data.value);
    
    // Query actual PIM policies for justification requirements
    const rolesWithJustificationInfo = await Promise.all(
      enrichedRoles.map(async (role) => {
        console.log(`🔍 Querying PIM policy for "${role.roleName}" (${role.roleDefinitionId})`);
        
        const justificationRequired = await this.checkActualPIMJustificationSetting(
          role.roleDefinitionId, 
          role.directoryScopeId || '/'
        );
        
        console.log(`🎯 PIM Policy Result for "${role.roleName}": requiresJustification=${justificationRequired}`);
        
        return {
          ...role,
          requiresJustification: justificationRequired,
          detectionMethod: 'pim_policy_query'
        };
      })
    );

    const detectionSummary = rolesWithJustificationInfo.map(r => ({
      name: r.roleName,
      requiresJustification: r.requiresJustification
    }));
    
    console.log(`📊 PIM Policy Results:`, detectionSummary);
    console.log(`✅ Loaded ${rolesWithJustificationInfo.length} eligible roles with actual PIM policy justification settings`);
    
    return { value: rolesWithJustificationInfo };
  }

  // Query actual PIM policy to check "Require justification on activation" setting
  async checkActualPIMJustificationSetting(roleDefinitionId, scopeId) {
    console.log(`🔍 Starting PIM policy check for role: ${roleDefinitionId}, scope: ${scopeId}`);
    
    try {
      // Step 1: Try to get policy assignment
      console.log(`📡 Step 1: Getting policy assignment...`);
      const assignmentEndpoint = `/policies/roleManagementPolicyAssignments?$filter=scopeId eq '${scopeId}' and scopeType eq 'DirectoryRole' and roleDefinitionId eq '${roleDefinitionId}'`;
      
      console.log(`📡 Assignment URL: ${assignmentEndpoint}`);
      const assignmentResponse = await this.makeRequest(assignmentEndpoint);
      
      console.log(`📋 Assignment response:`, JSON.stringify(assignmentResponse, null, 2));
      
      if (!assignmentResponse.value || assignmentResponse.value.length === 0) {
        console.log(`❌ No policy assignment found, trying alternative approaches...`);
        return await this.tryAlternativePolicyMethods(roleDefinitionId, scopeId);
      }
      
      const policyId = assignmentResponse.value[0].policyId;
      console.log(`✅ Found policy ID: ${policyId}`);
      
      // Step 2: Get the actual policy with rules
      console.log(`📡 Step 2: Getting policy details...`);
      const policyEndpoint = `/policies/roleManagementPolicies/${policyId}?$expand=rules`;
      
      console.log(`📡 Policy URL: ${policyEndpoint}`);
      const policyResponse = await this.makeRequest(policyEndpoint);
      
      console.log(`📋 Policy response:`, JSON.stringify(policyResponse, null, 2));
      
      if (!policyResponse.rules) {
        console.log(`❌ No rules found in policy, trying alternatives...`);
        return await this.tryAlternativePolicyMethods(roleDefinitionId, scopeId);
      }
      
      console.log(`📋 Found ${policyResponse.rules.length} rules in policy`);
      
      // Step 3: Analyze rules for justification requirement
      return this.analyzeRulesForJustification(policyResponse.rules);
      
    } catch (error) {
      console.error(`💥 Error in main policy check:`, error);
      console.log(`🔄 Trying alternative methods due to error...`);
      return await this.tryAlternativePolicyMethods(roleDefinitionId, scopeId);
    }
  }

  // Alternative methods to try if main policy check fails
  async tryAlternativePolicyMethods(roleDefinitionId, scopeId) {
    console.log(`🔄 Trying alternative policy detection methods...`);
    
    // Method 1: Try direct policy query without assignment
    try {
      console.log(`📡 Method 1: Direct policy query...`);
      const directPolicyEndpoint = `/policies/roleManagementPolicies?$filter=roleDefinitionId eq '${roleDefinitionId}'&$expand=rules`;
      
      console.log(`📡 Direct policy URL: ${directPolicyEndpoint}`);
      const directPolicyResponse = await this.makeRequest(directPolicyEndpoint);
      
      console.log(`📋 Direct policy response:`, JSON.stringify(directPolicyResponse, null, 2));
      
      if (directPolicyResponse.value && directPolicyResponse.value.length > 0) {
        for (const policy of directPolicyResponse.value) {
          console.log(`📋 Checking policy: ${policy.displayName || policy.id}`);
          if (policy.rules) {
            const result = this.analyzeRulesForJustification(policy.rules);
            if (result !== null) {
              console.log(`✅ Method 1 succeeded: ${result}`);
              return result;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Method 1 failed:`, error);
    }

    // Final fallback: Conservative pattern matching
    console.log(`🔄 All methods failed, using conservative fallback...`);
    const roleName = this.roleDefinitionCache.get(roleDefinitionId)?.displayName || '';
    
    const criticalRoles = [
      'Global Administrator',
      'Privileged Role Administrator',
      'Security Administrator'
    ];
    
    const requiresJustification = criticalRoles.some(criticalRole => roleName.includes(criticalRole));
    console.log(`🔄 Fallback result for "${roleName}": ${requiresJustification}`);
    
    return requiresJustification;
  }

  // Analyze policy rules to find justification requirement
  analyzeRulesForJustification(rules) {
    console.log(`🔍 Analyzing ${rules.length} policy rules for justification requirement...`);
    
    // Look for EndUser Assignment rules (this is what controls role activation)
    let endUserAssignmentRule = null;
    let adminAssignmentRule = null;
    let approvalRule = null;
    
    // First pass: collect all relevant rules without early returns
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      console.log(`📋 Rule ${i + 1}: Type = ${rule['@odata.type']}, Target = ${rule.target?.caller}/${rule.target?.level}`);
      
      // Check enablement rules for EndUser Assignment (role activation)
      if (rule['@odata.type'] === '#microsoft.graph.unifiedRoleManagementPolicyEnablementRule') {
        if (rule.target?.caller === 'EndUser' && rule.target?.level === 'Assignment') {
          console.log(`📋 ✅ Found EndUser Assignment enablement rule (MAIN RULE FOR ACTIVATION)!`);
          console.log(`📋 EndUser enabled rules:`, rule.enabledRules);
          endUserAssignmentRule = rule;
        } else if (rule.target?.caller === 'Admin' && rule.target?.level === 'Assignment') {
          console.log(`📋 Found Admin Assignment enablement rule (fallback)!`);
          console.log(`📋 Admin enabled rules:`, rule.enabledRules);
          adminAssignmentRule = rule;
        } else {
          console.log(`📋 Skipping rule: ${rule.target?.caller}/${rule.target?.level} (not relevant for activation)`);
        }
      }
      
      // Collect approval rules for EndUser Assignment
      if (rule['@odata.type'] === '#microsoft.graph.unifiedRoleManagementPolicyApprovalRule') {
        if (rule.target?.caller === 'EndUser' && rule.target?.level === 'Assignment') {
          console.log(`📋 Found EndUser Assignment approval rule!`);
          console.log(`📋 Approval settings:`, rule.setting);
          approvalRule = rule;
        }
      }
    }
    
    // Analysis summary
    console.log(`📊 RULE ANALYSIS SUMMARY:`);
    console.log(`📊 EndUser Assignment Rule: ${endUserAssignmentRule ? 'Found' : 'Not Found'}`);
    console.log(`📊 Admin Assignment Rule: ${adminAssignmentRule ? 'Found' : 'Not Found'}`);
    console.log(`📊 Approval Rule: ${approvalRule ? 'Found' : 'Not Found'}`);
    
    // Priority 1: Check EndUser Assignment enablement rule (this is the PRIMARY control)
    if (endUserAssignmentRule) {
      if (endUserAssignmentRule.enabledRules && Array.isArray(endUserAssignmentRule.enabledRules)) {
        const hasJustification = endUserAssignmentRule.enabledRules.includes('Justification');
        const hasMFA = endUserAssignmentRule.enabledRules.includes('MultiFactorAuthentication');
        
        console.log(`🎯 PRIMARY RESULT (EndUser Assignment Enablement Rule):`);
        console.log(`🎯 - Justification Required: ${hasJustification ? 'YES' : 'NO'}`);
        console.log(`🎯 - MFA Required: ${hasMFA ? 'YES' : 'NO'}`);
        console.log(`🎯 - All Enabled Rules: [${endUserAssignmentRule.enabledRules.join(', ')}]`);
        
        // This is the authoritative answer - return it regardless of approval rule
        console.log(`✅ FINAL DECISION: ${hasJustification ? 'JUSTIFICATION REQUIRED' : 'NO JUSTIFICATION REQUIRED'} (based on enablement rule)`);
        return hasJustification;
      }
    }
    
    // Priority 2: Check approval rule only if no enablement rule was found
    if (approvalRule && approvalRule.setting) {
      const approvalRequired = approvalRule.setting.isApprovalRequired;
      const justificationRequired = approvalRule.setting.isRequestorJustificationRequired;
      
      console.log(`🎯 FALLBACK TO APPROVAL RULE ANALYSIS:`);
      console.log(`🎯 - Approval Required: ${approvalRequired ? 'YES' : 'NO'}`);
      console.log(`🎯 - Requestor Justification Required: ${justificationRequired ? 'YES' : 'NO'}`);
      
      if (approvalRequired || justificationRequired) {
        console.log(`✅ FINAL DECISION: JUSTIFICATION REQUIRED (based on approval rule)`);
        return true;
      }
    }
    
    // Priority 3: Check Admin Assignment rule as final fallback
    if (adminAssignmentRule) {
      if (adminAssignmentRule.enabledRules && Array.isArray(adminAssignmentRule.enabledRules)) {
        const hasJustification = adminAssignmentRule.enabledRules.includes('Justification');
        console.log(`✅ FINAL DECISION: ${hasJustification ? 'JUSTIFICATION REQUIRED' : 'NO JUSTIFICATION REQUIRED'} (based on admin rule - fallback)`);
        return hasJustification;
      }
    }
    
    console.log(`❌ NO RELEVANT RULES FOUND - FINAL DECISION: NO JUSTIFICATION REQUIRED`);
    return false;
  }

  async listActiveRoles() {
    console.log('Loading active roles...');
    await this.preloadRoleDefinitions();
    
    const data = await this.makeRequest(
      "/roleManagement/directory/roleAssignmentScheduleInstances/filterByCurrentUser(on='principal')"
    );

    const now = new Date();
    const activeAssignments = data.value.filter(assignment => {
      const startDate = assignment.startDateTime ? new Date(assignment.startDateTime) : null;
      const endDate = assignment.endDateTime ? new Date(assignment.endDateTime) : null;
      
      const hasStarted = !startDate || startDate <= now;
      const hasNotEnded = !endDate || endDate > now;
      
      return hasStarted && hasNotEnded;
    });

    const enrichedRoles = await this.enrichRolesWithNames(activeAssignments);
    
    const normalizedRoles = enrichedRoles.map(role => ({
      ...role,
      scheduleInfo: {
        startDateTime: role.startDateTime,
        expiration: {
          endDateTime: role.endDateTime
        }
      }
    }));

    console.log(`Loaded ${normalizedRoles.length} active roles`);
    return { value: normalizedRoles };
  }

  async activateRole(eligibility, duration = 'PT1H', justification = null) {
    console.log('Activating role with eligibility:', eligibility);
    
    // Use localized default justification if none provided
    const defaultJustification = justification || getMessage('defaultJustification') || 'Role activation requested';
    
    let principalId = eligibility.principalId;
    if (!principalId) {
      try {
        const userInfo = await this.makeRequest('/me');
        principalId = userInfo.id;
        console.log('Retrieved principal ID:', principalId);
      } catch (error) {
        console.error('Failed to get user info:', error);
        throw new Error('Could not retrieve user information for activation');
      }
    }

    const body = {
      action: 'selfActivate',
      principalId: principalId,
      roleDefinitionId: eligibility.roleDefinitionId,
      directoryScopeId: eligibility.directoryScopeId || '/',
      justification: defaultJustification,
      scheduleInfo: {
        startDateTime: new Date().toISOString(),
        expiration: {
          type: 'afterDuration',
          duration: duration
        }
      }
    };

    console.log('Activation request body:', JSON.stringify(body, null, 2));

    try {
      const response = await this.makeRequest('/roleManagement/directory/roleAssignmentScheduleRequests', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      console.log('Activation response:', response);
      return response;
    } catch (error) {
      console.error('Activation failed:', error);
      throw error;
    }
  }

  async extendRole(assignment, additionalDuration = 'PT2H', justification = null) {
    // Use localized default justification if none provided
    const defaultJustification = justification || getMessage('defaultJustification') || 'Role extension requested';
    
    const currentExpiry = new Date(assignment.scheduleInfo?.expiration?.endDateTime || Date.now());
    const newExpiry = new Date(currentExpiry.getTime() + (2 * 60 * 60 * 1000));

    const body = {
      principalId: assignment.principalId,
      roleDefinitionId: assignment.roleDefinitionId,
      directoryScopeId: assignment.directoryScopeId || '/',
      action: 'selfExtend',
      justification: defaultJustification,
      scheduleInfo: {
        startDateTime: new Date().toISOString(),
        expiration: {
          type: 'afterDateTime',
          endDateTime: newExpiry.toISOString()
        }
      }
    };

    return this.makeRequest('/roleManagement/directory/roleAssignmentScheduleRequests', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  clearCache() {
    this.roleDefinitionCache.clear();
    this.lastCacheUpdate = 0;
  }
}

// Main application class
class AzurePIMManager {
  constructor() {
    console.log('AzurePIMManager initializing...');
    this.tokenManager = new TokenManager();
    this.graphClient = new GraphAPIClient(this.tokenManager);
    this.notificationManager = new NotificationManager();
    this.init();
  }

  async init() {
    try {
      console.log('Loading stored tokens...');
      await this.tokenManager.loadStoredTokens();
      
      console.log('Setting up message listeners...');
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Received message:', message);
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      });

      // Set up notification listeners
      chrome.notifications.onClicked.addListener((notificationId) => {
        console.log('Notification clicked:', notificationId);
        this.notificationManager.clearNotificationForRole(notificationId.replace(/^(expiration_|expired_)/, ''));
      });

      chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        console.log('Notification button clicked:', notificationId, buttonIndex);
        this.notificationManager.handleNotificationClick(notificationId, buttonIndex, this);
      });

      // Start monitoring if we have a valid token
      if (!this.tokenManager.isTokenExpired()) {
        console.log('🔔 Auto-starting notification monitoring...');
        this.notificationManager.startMonitoring(this.graphClient);
      }

      console.log('Azure PIM Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Azure PIM Manager:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      console.log('Handling message:', message.action);
      
      switch (message.action) {
        case 'getAuthStatus':
          const isAuthenticated = !this.tokenManager.isTokenExpired();
          console.log('Auth status:', isAuthenticated);
          sendResponse({ success: true, authenticated: isAuthenticated });
          break;

        case 'getTenantInfo':
          const tenantInfo = this.tokenManager.userTenant || null;
          sendResponse({ success: true, tenantInfo: tenantInfo });
          break;

        case 'listEligibleRoles':
          const eligibleRoles = await this.graphClient.listEligibleRoles();
          sendResponse({ success: true, data: eligibleRoles });
          break;

        case 'listActiveRoles':
          const activeRoles = await this.graphClient.listActiveRoles();
          sendResponse({ success: true, data: activeRoles });
          break;

        case 'activateRole':
          const activationResult = await this.graphClient.activateRole(
            message.eligibility,
            message.duration,
            message.justification
          );
          // Restart monitoring after role activation
          this.notificationManager.startMonitoring(this.graphClient);
          sendResponse({ success: true, result: activationResult });
          break;

        case 'extendRole':
          const extensionResult = await this.graphClient.extendRole(
            message.assignment,
            message.additionalDuration,
            message.justification
          );
          // Restart monitoring after role extension
          this.notificationManager.startMonitoring(this.graphClient);
          sendResponse({ success: true, result: extensionResult });
          break;

        case 'clearAuth':
          await this.tokenManager.clearTokens();
          await chrome.storage.local.clear(); // Clear everything
          this.graphClient.clearCache(); // Clear API cache too
          this.notificationManager.stopMonitoring(); // Stop notifications
          sendResponse({ success: true });
          break;

        case 'forceReauth':
          await this.tokenManager.clearTokens();
          await chrome.storage.local.clear();
          this.graphClient.clearCache();
          this.notificationManager.stopMonitoring();
          try {
            await this.tokenManager.authenticate();
            this.notificationManager.startMonitoring(this.graphClient);
            sendResponse({ success: true, message: getMessage('authenticationRequired') || 'Authentication successful' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'startNotifications':
          console.log('🔔 Starting notifications via message...');
          this.notificationManager.startMonitoring(this.graphClient);
          sendResponse({ success: true, message: 'Notification monitoring started' });
          break;

        case 'stopNotifications':
          console.log('🔔 Stopping notifications via message...');
          this.notificationManager.stopMonitoring();
          sendResponse({ success: true, message: 'Notification monitoring stopped' });
          break;

        case 'getNotificationStatus':
          const isMonitoring = this.notificationManager.monitoringInterval !== null;
          const activeNotificationCount = this.notificationManager.activeNotifications.size;
          sendResponse({ 
            success: true, 
            monitoring: isMonitoring, 
            activeNotifications: activeNotificationCount 
          });
          break;

        default:
          console.warn('Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        needsAuth: error.message.includes('authentication') || error.message.includes('token')
      });
    }
  }
}

// Extension lifecycle management
chrome.runtime.onInstalled.addListener(() => {
  console.log('Azure PIM Helper extension installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Azure PIM Helper extension starting up');
});

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // This listener ensures the service worker stays active
  return true;
});

// Initialize the PIM manager
console.log('Initializing PIM Manager...');
const pimManager = new AzurePIMManager();

console.log('Background script loaded successfully with multi-tenant notification support');