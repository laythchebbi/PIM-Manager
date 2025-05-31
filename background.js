// Enhanced Azure PIM Helper Background Script
// Fixed for Manifest V3 compatibility

console.log('Background script loading...');

// PKCE utilities for secure authentication
function randomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let s = '';
  for (let i = 0; i < length; i++) {
    s += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return s;
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(buffer));
  return new Uint8Array(digest);
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makePkcePair() {
  // Use a fixed length for better compatibility
  const codeVerifier = randomString(43); // RFC 7636 recommends 43-128 characters
  console.log('Generated code verifier:', codeVerifier);
  
  const challengeBytes = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(challengeBytes);
  
  console.log('Generated code challenge:', codeChallenge);
  
  return { codeVerifier, codeChallenge };
}

// Configuration
const CONFIG = {
  CLIENT_ID: '91ed420f-07a9-4c4a-9b55-dc4468a9225b',
  TENANT_ID: '950b7e19-2824-48c8-9403-c811f39aa336',
  REDIRECT_URI: chrome.identity.getRedirectURL(),
  SCOPES: [
    'openid',
    'profile',
    'RoleManagement.ReadWrite.Directory',
    'PrivilegedAccess.ReadWrite.AzureResources',
    'RoleAssignmentSchedule.ReadWrite.Directory'
  ],
  GRAPH_BASE_URL: 'https://graph.microsoft.com/v1.0',
  TOKEN_ENDPOINT: 'https://login.microsoftonline.com'
};

console.log('Configuration loaded:', { CLIENT_ID: CONFIG.CLIENT_ID, REDIRECT_URI: CONFIG.REDIRECT_URI });

// Token management
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
      console.log('Token expired, refreshing...');
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        console.log('No refresh token, authenticating...');
        await this.authenticate();
      }
    }
    return this.accessToken;
  }

  isTokenExpired() {
    if (!this.accessToken || !this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000; // Refresh 1 minute before expiry
  }

  async authenticate() {
    console.log('Starting authentication...');
    
    // Clear any existing auth data
    await chrome.storage.local.remove(['codeVerifier', 'accessToken', 'refreshToken', 'tokenExpiry']);
    
    const { codeVerifier, codeChallenge } = await makePkcePair();
    
    console.log('PKCE pair generated:', {
      codeVerifier_length: codeVerifier.length,
      codeChallenge_length: codeChallenge.length,
      codeVerifier_start: codeVerifier.substring(0, 10) + '...',
      codeChallenge: codeChallenge
    });
    
    // Store the code verifier
    await chrome.storage.local.set({ codeVerifier });
    
    // Verify storage
    const stored = await chrome.storage.local.get('codeVerifier');
    console.log('Code verifier stored successfully:', stored.codeVerifier === codeVerifier);

    const params = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: CONFIG.REDIRECT_URI,
      response_mode: 'query',
      scope: CONFIG.SCOPES.concat('offline_access').join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${CONFIG.TOKEN_ENDPOINT}/${CONFIG.TENANT_ID}/oauth2/v2.0/authorize?${params}`;
    console.log('Auth URL created:', authUrl);

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error('Auth flow error:', chrome.runtime.lastError);
          return reject(new Error(chrome.runtime.lastError?.message || 'Authentication failed'));
        }

        try {
          const url = new URL(redirectUrl);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            console.error('OAuth error:', error);
            throw new Error(`Auth error: ${url.searchParams.get('error_description') || error}`);
          }

          if (!code) {
            throw new Error('No authorization code returned');
          }

          await this.exchangeCodeForTokens(code);
          resolve();
        } catch (err) {
          console.error('Authentication error:', err);
          reject(err);
        }
      });
    });
  }

  async exchangeCodeForTokens(code) {
    console.log('Exchanging code for tokens...');
    const stored = await chrome.storage.local.get('codeVerifier');
    const codeVerifier = stored.codeVerifier;
    
    console.log('Code verifier retrieved:', codeVerifier ? 'Found' : 'Missing');
    
    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please try authentication again.');
    }
    
    const body = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: CONFIG.REDIRECT_URI,
      scope: CONFIG.SCOPES.concat('offline_access').join(' '),
      code_verifier: codeVerifier,
    });
    
    console.log('Token request parameters:', {
      client_id: CONFIG.CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: CONFIG.REDIRECT_URI,
      code_verifier_length: codeVerifier.length,
      code_length: code.length
    });

    const response = await fetch(`${CONFIG.TOKEN_ENDPOINT}/${CONFIG.TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const tokenData = await response.json();

    if (!response.ok) {
      console.error('Token exchange failed:', tokenData);
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

    // Store tokens securely
    await chrome.storage.local.set({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry
    });

    // Clear the code verifier
    await chrome.storage.local.remove('codeVerifier');
    console.log('Tokens stored successfully');
  }

  async refreshAccessToken() {
    console.log('Refreshing access token...');
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const body = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      scope: CONFIG.SCOPES.concat('offline_access').join(' ')
    });

    const response = await fetch(`${CONFIG.TOKEN_ENDPOINT}/${CONFIG.TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const tokenData = await response.json();

    if (!response.ok) {
      // If refresh fails, clear tokens and require re-authentication
      console.error('Token refresh failed:', tokenData);
      await this.clearTokens();
      throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    this.accessToken = tokenData.access_token;
    if (tokenData.refresh_token) {
      this.refreshToken = tokenData.refresh_token;
    }
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

    // Update stored tokens
    await chrome.storage.local.set({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry
    });
    console.log('Tokens refreshed successfully');
  }

  async loadStoredTokens() {
    console.log('Loading stored tokens...');
    const stored = await chrome.storage.local.get(['accessToken', 'refreshToken', 'tokenExpiry']);
    this.accessToken = stored.accessToken;
    this.refreshToken = stored.refreshToken;
    this.tokenExpiry = stored.tokenExpiry;
    console.log('Stored tokens loaded:', { hasAccessToken: !!this.accessToken, hasRefreshToken: !!this.refreshToken });
  }

  async clearTokens() {
    console.log('Clearing tokens...');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    await chrome.storage.local.remove(['accessToken', 'refreshToken', 'tokenExpiry']);
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

    const enrichedRoles = await this.enrichRolesWithNames(data.value);
    console.log(`Loaded ${enrichedRoles.length} eligible roles`);

    return { value: enrichedRoles };
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

  async activateRole(eligibility, duration = 'PT1H', justification = 'Temporary access required') {
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
          sendResponse({ success: true });
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