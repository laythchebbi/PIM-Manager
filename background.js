// Enhanced Azure PIM Helper Background Script
// Optimized for integration with React frontend

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
  const codeVerifier = randomString(128);
  const challengeBytes = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(challengeBytes);
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

// Token management
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  async getValidToken() {
    if (this.isTokenExpired()) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
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
    const { codeVerifier, codeChallenge } = await makePkcePair();
    await chrome.storage.local.set({ codeVerifier });

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

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          return reject(new Error(chrome.runtime.lastError?.message || 'Authentication failed'));
        }

        try {
          const url = new URL(redirectUrl);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            throw new Error(`Auth error: ${url.searchParams.get('error_description') || error}`);
          }

          if (!code) {
            throw new Error('No authorization code returned');
          }

          await this.exchangeCodeForTokens(code);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async exchangeCodeForTokens(code) {
    const { codeVerifier } = await chrome.storage.local.get('codeVerifier');
    
    const body = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: CONFIG.REDIRECT_URI,
      scope: CONFIG.SCOPES.concat('offline_access').join(' '),
      code_verifier: codeVerifier,
    });

    const response = await fetch(`${CONFIG.TOKEN_ENDPOINT}/${CONFIG.TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const tokenData = await response.json();

    if (!response.ok) {
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
  }

  async refreshAccessToken() {
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
  }

  async loadStoredTokens() {
    const stored = await chrome.storage.local.get(['accessToken', 'refreshToken', 'tokenExpiry']);
    this.accessToken = stored.accessToken;
    this.refreshToken = stored.refreshToken;
    this.tokenExpiry = stored.tokenExpiry;
  }

  async clearTokens() {
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
  }

  async makeRequest(endpoint, options = {}) {
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
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async fetchRoleDefinition(roleDefinitionId) {
    try {
      const data = await this.makeRequest(`/roleManagement/directory/roleDefinitions/${roleDefinitionId}`);
      return data.displayName;
    } catch (error) {
      console.warn(`Failed to fetch role definition ${roleDefinitionId}:`, error);
      return roleDefinitionId; // Fallback to ID
    }
  }

  async listEligibleRoles() {
    const data = await this.makeRequest(
      "/roleManagement/directory/roleEligibilityScheduleRequests/filterByCurrentUser(on='principal')"
    );

    // Enrich with role names
    const enrichedRoles = await Promise.all(
      data.value.map(async (role) => ({
        ...role,
        roleName: await this.fetchRoleDefinition(role.roleDefinitionId)
      }))
    );

    return { value: enrichedRoles };
  }

async listActiveRoles() {
  // Use the roleAssignmentScheduleInstances endpoint instead of requests
  // This endpoint shows currently active role assignments, not historical requests
  const data = await this.makeRequest(
    "/roleManagement/directory/roleAssignmentScheduleInstances/filterByCurrentUser(on='principal')"
  );

  // Filter for truly active assignments only
  const now = new Date();
  const activeAssignments = data.value.filter(assignment => {
    // Check if the assignment is currently active
    const startDate = assignment.startDateTime ? new Date(assignment.startDateTime) : null;
    const endDate = assignment.endDateTime ? new Date(assignment.endDateTime) : null;  // Fixed typo here
    
    // Assignment must have started and not yet ended
    const hasStarted = !startDate || startDate <= now;
    const hasNotEnded = !endDate || endDate > now;
    
    return hasStarted && hasNotEnded;
  });

  // Enrich with role names
  const enrichedRoles = await Promise.all(
    activeAssignments.map(async (role) => ({
      ...role,
      roleName: await this.fetchRoleDefinition(role.roleDefinitionId),
      // Normalize the structure to match what your frontend expects
      scheduleInfo: {
        startDateTime: role.startDateTime,
        expiration: {
          endDateTime: role.endDateTime
        }
      }
    }))
  );

  return { value: enrichedRoles };
}
async activateRole(eligibility, duration = 'PT1H', justification = 'Temporary access required') {
  console.log('Activating role with eligibility:', eligibility);
  
  // First, get the current user's principal ID if not provided
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

  // Construct the activation request body according to Microsoft Graph API spec
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
async getEligibleRoleDetails(roleDefinitionId, principalId) {
  try {
    // Get the specific eligible role assignment
    const eligibleRoles = await this.makeRequest(
      "/roleManagement/directory/roleEligibilityScheduleInstances/filterByCurrentUser(on='principal')"
    );
    
    const eligibleRole = eligibleRoles.value.find(role => 
      role.roleDefinitionId === roleDefinitionId
    );
    
    if (!eligibleRole) {
      throw new Error('Eligible role not found');
    }
    
    return eligibleRole;
  } catch (error) {
    console.error('Failed to get eligible role details:', error);
    throw error;
  }
}


  async extendRole(assignment, additionalDuration = 'PT2H', justification = 'Extension required') {
    // For extending, we create a new activation request with extended duration
    const currentExpiry = new Date(assignment.scheduleInfo?.expiration?.endDateTime || Date.now());
    const newExpiry = new Date(currentExpiry.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours

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
}

// Main application class
class AzurePIMManager {
  constructor() {
    this.tokenManager = new TokenManager();
    this.graphClient = new GraphAPIClient(this.tokenManager);
    this.init();
  }

  async init() {
    // Load any stored tokens on startup
    await this.tokenManager.loadStoredTokens();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    console.log('Azure PIM Manager initialized');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
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

        case 'getAuthStatus':
          const isAuthenticated = !this.tokenManager.isTokenExpired();
          sendResponse({ success: true, authenticated: isAuthenticated });
          break;

        default:
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

// Initialize the PIM manager
const pimManager = new AzurePIMManager();

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AzurePIMManager, TokenManager, GraphAPIClient };
}