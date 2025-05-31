// Enhanced Azure PIM Helper Background Script
// Simplified version using implicit flow to avoid PKCE issues

console.log('Background script loading...');

// Configuration
// Configuration
const CONFIG = {
  CLIENT_ID: '91ed420f-07a9-4c4a-9b55-dc4468a9225b',
  TENANT_ID: '950b7e19-2824-48c8-9403-c811f39aa336',
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
  TOKEN_ENDPOINT: 'https://login.microsoftonline.com'
};

console.log('Configuration loaded:', { CLIENT_ID: CONFIG.CLIENT_ID, REDIRECT_URI: CONFIG.REDIRECT_URI });

// Token management - Simplified approach using Chrome Identity API
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    console.log('TokenManager initialized');
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
    console.log('Starting Chrome Identity API authentication...');
    
    // Clear all storage
    await chrome.storage.local.clear();
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    // Use Chrome's built-in OAuth2 flow which handles PKCE automatically
    const authUrl = `${CONFIG.TOKEN_ENDPOINT}/${CONFIG.TENANT_ID}/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        response_type: 'token', // Use implicit flow instead of authorization code
        redirect_uri: CONFIG.REDIRECT_URI,
        scope: CONFIG.SCOPES.join(' '),
        response_mode: 'fragment',
        state: Date.now().toString(),
        nonce: Date.now().toString()
      });

    console.log('Using implicit flow auth URL:', authUrl);

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

          await chrome.storage.local.set({
            accessToken: this.accessToken,
            tokenExpiry: this.tokenExpiry
          });

          console.log('Token stored successfully via implicit flow');
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
    const stored = await chrome.storage.local.get(['accessToken', 'tokenExpiry']);
    this.accessToken = stored.accessToken;
    this.tokenExpiry = stored.tokenExpiry;
    console.log('Stored tokens loaded:', { hasAccessToken: !!this.accessToken });
  }

  async clearTokens() {
    console.log('Clearing tokens...');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
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
    
    // Use a practical approach: test what error messages we get when trying to activate without justification
    const rolesWithJustificationInfo = await Promise.all(
      enrichedRoles.map(async (role) => {
        let requiresJustification = false;
        let detectionMethod = 'none';
        
        console.log(`🔍 Testing justification requirement for "${role.roleName}"`);
        
        try {
          // Get current user principal ID
          let principalId = role.principalId;
          if (!principalId) {
            try {
              const userInfo = await this.makeRequest('/me');
              principalId = userInfo.id;
            } catch (error) {
              console.warn(`Could not get user ID for ${role.roleName}`);
              return { ...role, requiresJustification: false };
            }
          }
          
          // Create a test activation request with minimal justification
          const testActivationBody = {
            action: 'selfActivate',
            principalId: principalId,
            roleDefinitionId: role.roleDefinitionId,
            directoryScopeId: role.directoryScopeId || '/',
            justification: 'test', // Very minimal justification
            scheduleInfo: {
              startDateTime: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
              expiration: {
                type: 'afterDuration',
                duration: 'PT5M' // Only 5 minutes duration
              }
            }
          };
          
          console.log(`🧪 Testing activation validation for "${role.roleName}"`);
          
          // First test: Try with minimal justification to see if it's accepted
          const testResponse = await fetch(`${CONFIG.GRAPH_BASE_URL}/roleManagement/directory/roleAssignmentScheduleRequests`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await this.tokenManager.getValidToken()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(testActivationBody)
          });
          
          const responseData = await testResponse.json();
          console.log(`📊 Test activation response for "${role.roleName}":`, { 
            status: testResponse.status, 
            ok: testResponse.ok,
            data: responseData 
          });
          
          if (testResponse.ok) {
            // Activation succeeded - this role doesn't require justification (or accepts minimal justification)
            console.log(`✅ Role "${role.roleName}" activated successfully - minimal/no justification requirement`);
            detectionMethod = 'successful_test';
            
            // Immediately cancel this test activation
            try {
              if (responseData.id) {
                const cancelBody = {
                  action: 'adminRemove',
                  justification: 'Cancelling test activation'
                };
                
                await fetch(`${CONFIG.GRAPH_BASE_URL}/roleManagement/directory/roleAssignmentScheduleRequests/${responseData.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${await this.tokenManager.getValidToken()}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log(`🗑️ Cancelled test activation for "${role.roleName}"`);
              }
            } catch (cancelError) {
              console.warn(`⚠️ Could not cancel test activation for "${role.roleName}":`, cancelError);
            }
            
          } else {
            // Activation failed - check the error message
            console.log(`❌ Test activation failed for "${role.roleName}": ${testResponse.status}`);
            
            if (responseData.error) {
              const errorMessage = responseData.error.message?.toLowerCase() || '';
              const errorCode = responseData.error.code?.toLowerCase() || '';
              
              console.log(`🔍 Error analysis for "${role.roleName}": message="${errorMessage}", code="${errorCode}"`);
              
              // Check if the error indicates justification is required
              if (errorMessage.includes('justification') || 
                  errorMessage.includes('reason') ||
                  errorMessage.includes('business') ||
                  errorCode.includes('justification') ||
                  errorMessage.includes('required') && errorMessage.includes('activat')) {
                requiresJustification = true;
                detectionMethod = 'error_analysis';
                console.log(`✅ "${role.roleName}" requires justification (detected from error message)`);
              } else {
                console.log(`❓ "${role.roleName}" failed for other reasons (not justification): ${errorMessage}`);
              }
            }
          }
          
        } catch (error) {
          console.error(`💥 Error testing justification for "${role.roleName}":`, error);
        }
        
        // Fallback: If we couldn't detect via testing, use role name patterns
        if (detectionMethod === 'none') {
          const highPrivilegeRoles = [
            'Global Administrator',
            'Privileged Role Administrator',
            'Security Administrator',
            'Privileged Authentication Administrator'
          ];
          
          if (highPrivilegeRoles.includes(role.roleName)) {
            console.log(`🔒 "${role.roleName}" is high-privilege role - likely requires justification (fallback)`);
            // Note: Not setting to true automatically, just informational
          }
        }
        
        console.log(`🎯 Final result for "${role.roleName}": requiresJustification=${requiresJustification}, method=${detectionMethod}`);
        
        return {
          ...role,
          requiresJustification,
          detectionMethod
        };
      })
    );

    const detectionSummary = rolesWithJustificationInfo.map(r => ({
      name: r.roleName,
      requiresJustification: r.requiresJustification,
      method: r.detectionMethod
    }));
    
    console.log(`📊 Justification detection summary:`, detectionSummary);
    console.log(`✅ Loaded ${rolesWithJustificationInfo.length} eligible roles with test-based justification detection`);
    
    return { value: rolesWithJustificationInfo };
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

  async activateRole(eligibility, duration = 'PT1H', justification = 'Role activation requested via PIM Helper extension') {
    console.log('Activating role with eligibility:', eligibility);
    
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
      justification: justification,
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

  async extendRole(assignment, additionalDuration = 'PT2H', justification = 'Extension required') {
    const currentExpiry = new Date(assignment.scheduleInfo?.expiration?.endDateTime || Date.now());
    const newExpiry = new Date(currentExpiry.getTime() + (2 * 60 * 60 * 1000));

    const body = {
      principalId: assignment.principalId,
      roleDefinitionId: assignment.roleDefinitionId,
      directoryScopeId: assignment.directoryScopeId || '/',
      action: 'selfExtend',
      justification,
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
          sendResponse({ success: true, result: activationResult });
          break;

        case 'extendRole':
          const extensionResult = await this.graphClient.extendRole(
            message.assignment,
            message.additionalDuration,
            message.justification
          );
          sendResponse({ success: true, result: extensionResult });
          break;

        case 'clearAuth':
          await this.tokenManager.clearTokens();
          await chrome.storage.local.clear(); // Clear everything
          this.graphClient.clearCache(); // Clear API cache too
          sendResponse({ success: true });
          break;

        case 'forceReauth':
          await this.tokenManager.clearTokens();
          await chrome.storage.local.clear();
          this.graphClient.clearCache();
          try {
            await this.tokenManager.authenticate();
            sendResponse({ success: true, message: 'Re-authentication successful' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
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

console.log('Background script loaded successfully');