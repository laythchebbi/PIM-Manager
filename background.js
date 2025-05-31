// Enhanced Azure PIM Helper Background Script
// Simplified version using implicit flow to avoid PKCE issues - with i18n support

console.log('Background script loading...');

// Helper function to get localized messages in background script
function getMessage(messageKey, substitutions = []) {
  return chrome.i18n.getMessage(messageKey, substitutions);
}

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
    
    // Check justification requirements using PIM policies
    const rolesWithJustificationInfo = await Promise.all(
      enrichedRoles.map(async (role) => {
        let requiresJustification = false;
        let detectionMethod = 'policy_check';
        
        console.log(`🔍 Checking justification requirement for "${role.roleName}"`);
        
        try {
          // Try to get the role management policy for this role
          const policyResponse = await this.checkRoleJustificationRequirement(
            role.roleDefinitionId, 
            role.directoryScopeId
          );
          
          if (policyResponse.success) {
            requiresJustification = policyResponse.requiresJustification;
            detectionMethod = 'policy_api';
            console.log(`📋 Policy check for "${role.roleName}": requiresJustification=${requiresJustification}`);
          } else {
            // Fallback to pattern-based detection if policy check fails
            requiresJustification = this.detectJustificationByPattern(role.roleName);
            detectionMethod = 'pattern_fallback';
            console.log(`🔍 Pattern fallback for "${role.roleName}": requiresJustification=${requiresJustification}`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Error checking policy for "${role.roleName}":`, error);
          // Fallback to pattern-based detection
          requiresJustification = this.detectJustificationByPattern(role.roleName);
          detectionMethod = 'pattern_fallback';
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
    console.log(`✅ Loaded ${rolesWithJustificationInfo.length} eligible roles with policy-based justification detection`);
    
    return { value: rolesWithJustificationInfo };
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

    // Method 2: Try querying all policies and find matching ones
    try {
      console.log(`📡 Method 2: Querying all policies...`);
      const allPoliciesEndpoint = `/policies/roleManagementPolicies?$expand=rules&$top=100`;
      
      console.log(`📡 All policies URL: ${allPoliciesEndpoint}`);
      const allPoliciesResponse = await this.makeRequest(allPoliciesEndpoint);
      
      console.log(`📋 All policies response: Found ${allPoliciesResponse.value?.length || 0} policies`);
      
      if (allPoliciesResponse.value && allPoliciesResponse.value.length > 0) {
        for (const policy of allPoliciesResponse.value) {
          if (policy.roleDefinitionId === roleDefinitionId) {
            console.log(`📋 Found matching policy: ${policy.displayName || policy.id}`);
            if (policy.rules) {
              const result = this.analyzeRulesForJustification(policy.rules);
              if (result !== null) {
                console.log(`✅ Method 2 succeeded: ${result}`);
                return result;
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Method 2 failed:`, error);
    }

    // Method 3: Check if we have the necessary permissions
    try {
      console.log(`📡 Method 3: Testing API permissions...`);
      const testEndpoint = `/policies/roleManagementPolicies?$top=1`;
      
      const testResponse = await this.makeRequest(testEndpoint);
      console.log(`📋 Permission test result:`, testResponse);
      
      if (testResponse.error) {
        console.log(`❌ Permission issue detected: ${testResponse.error.message}`);
        console.log(`🔧 Required permissions: Policy.Read.All or RoleManagementPolicy.Read.Directory`);
      }
    } catch (error) {
      console.warn(`⚠️ Permission test failed:`, error);
      console.log(`🔧 This might be a permissions issue. Required: Policy.Read.All or RoleManagementPolicy.Read.Directory`);
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

  // Method 1: Check role management policy assignments
  async checkRoleManagementPolicies(roleDefinitionId, directoryScopeId) {
    try {
      console.log(`🔍 Method 1: Checking policy assignments for role ${roleDefinitionId}`);
      
      // Try the policy assignments endpoint
      const policyEndpoint = `/policies/roleManagementPolicyAssignments?$filter=scopeId eq '${directoryScopeId || '/'}' and scopeType eq 'DirectoryRole' and roleDefinitionId eq '${roleDefinitionId}'&$expand=policy($expand=rules)`;
      
      console.log(`📡 Calling: ${policyEndpoint}`);
      const policyData = await this.makeRequest(policyEndpoint);
      
      if (policyData.value && policyData.value.length > 0) {
        const assignment = policyData.value[0];
        console.log(`📋 Found policy assignment:`, assignment.id);
        
        if (assignment.policy && assignment.policy.rules) {
          const requiresJustification = this.analyzeRules(assignment.policy.rules);
          console.log(`✅ Policy analysis complete: requiresJustification=${requiresJustification}`);
          return { success: true, requiresJustification };
        }
      }
      
      return { success: false, requiresJustification: false };
    } catch (error) {
      console.warn(`⚠️ Method 1 failed:`, error.message);
      return { success: false, requiresJustification: false };
    }
  }

  // Method 2: Try alternative policy endpoint
  async checkAlternativePolicyEndpoint(roleDefinitionId) {
    try {
      console.log(`🔍 Method 2: Checking alternative policy endpoint for role ${roleDefinitionId}`);
      
      const policyEndpoint = `/policies/roleManagementPolicies?$filter=roleDefinitionId eq '${roleDefinitionId}'&$expand=rules`;
      
      console.log(`📡 Calling: ${policyEndpoint}`);
      const policyData = await this.makeRequest(policyEndpoint);
      
      if (policyData.value && policyData.value.length > 0) {
        for (const policy of policyData.value) {
          console.log(`📋 Found policy:`, policy.displayName);
          
          if (policy.rules) {
            const requiresJustification = this.analyzeRules(policy.rules);
            if (requiresJustification) {
              console.log(`✅ Alternative policy analysis: requiresJustification=true`);
              return { success: true, requiresJustification: true };
            }
          }
        }
        
        console.log(`❌ Alternative policy analysis: requiresJustification=false`);
        return { success: true, requiresJustification: false };
      }
      
      return { success: false, requiresJustification: false };
    } catch (error) {
      console.warn(`⚠️ Method 2 failed:`, error.message);
      return { success: false, requiresJustification: false };
    }
  }

  // Method 3: Check role definition properties
  async checkRoleDefinitionProperties(roleDefinitionId) {
    try {
      console.log(`🔍 Method 3: Checking role definition properties for ${roleDefinitionId}`);
      
      const roleDefEndpoint = `/roleManagement/directory/roleDefinitions/${roleDefinitionId}`;
      
      console.log(`📡 Calling: ${roleDefEndpoint}`);
      const roleData = await this.makeRequest(roleDefEndpoint);
      
      if (roleData) {
        console.log(`📋 Role definition found:`, roleData.displayName);
        
        // Check if role has high-risk permissions that typically require justification
        const hasHighRiskPermissions = this.checkHighRiskPermissions(roleData);
        
        console.log(`🔒 High risk permissions check: ${hasHighRiskPermissions}`);
        return { success: true, requiresJustification: hasHighRiskPermissions };
      }
      
      return { success: false, requiresJustification: false };
    } catch (error) {
      console.warn(`⚠️ Method 3 failed:`, error.message);
      return { success: false, requiresJustification: false };
    }
  }

  // Analyze policy rules for justification requirements
  analyzeRules(rules) {
    console.log(`🔍 Analyzing ${rules.length} policy rules`);
    
    for (const rule of rules) {
      console.log(`📋 Checking rule type: ${rule['@odata.type']}`);
      
      // Check enablement rules
      if (rule['@odata.type'] === '#microsoft.graph.unifiedRoleManagementPolicyEnablementRule') {
        console.log(`📋 Enablement rule found, enabled rules:`, rule.enabledRules);
        if (rule.enabledRules && rule.enabledRules.includes('Justification')) {
          console.log(`✅ Justification requirement found in enablement rule!`);
          return true;
        }
      }
      
      // Check approval rules
      if (rule['@odata.type'] === '#microsoft.graph.unifiedRoleManagementPolicyApprovalRule') {
        console.log(`📋 Approval rule found:`, rule.setting);
        if (rule.setting && rule.setting.isApprovalRequired) {
          console.log(`✅ Approval requirement found!`);
          return true;
        }
      }
      
      // Check authentication context rules
      if (rule['@odata.type'] === '#microsoft.graph.unifiedRoleManagementPolicyAuthenticationContextRule') {
        console.log(`📋 Authentication context rule found`);
        if (rule.isEnabled) {
          console.log(`✅ Authentication context required!`);
          return true;
        }
      }
    }
    
    console.log(`❌ No justification requirements found in rules`);
    return false;
  }

  // Check if role has high-risk permissions
  checkHighRiskPermissions(roleDefinition) {
    if (!roleDefinition.rolePermissions || !roleDefinition.rolePermissions[0]) {
      return false;
    }
    
    const permissions = roleDefinition.rolePermissions[0];
    const allowedActions = permissions.allowedResourceActions || [];
    
    // High-risk actions that typically require justification
    const highRiskActions = [
      'microsoft.directory/users/delete',
      'microsoft.directory/groups/delete',
      'microsoft.directory/applications/delete',
      'microsoft.directory/servicePrincipals/delete',
      'microsoft.directory/roleDefinitions/allProperties/allTasks',
      'microsoft.directory/roleAssignments/allProperties/allTasks',
      'microsoft.directory/policies/allProperties/allTasks',
      'microsoft.directory/conditionalAccessPolicies/allProperties/allTasks',
      'microsoft.directory/privilegedIdentityManagement/allProperties/allTasks'
    ];
    
    const hasHighRisk = allowedActions.some(action => 
      highRiskActions.some(riskAction => action.includes(riskAction))
    );
    
    console.log(`🔒 High risk permissions analysis: ${hasHighRisk}`);
    return hasHighRisk;
  }

  // Enhanced pattern-based detection with more roles
  detectJustificationByEnhancedPattern(roleName) {
    // Tier 1: Always require justification (highest privilege)
    const tier1Roles = [
      'Global Administrator',
      'Privileged Role Administrator',
      'Security Administrator',
      'Privileged Authentication Administrator'
    ];
    
    // Tier 2: Usually require justification (high privilege)
    const tier2Roles = [
      'Application Administrator',
      'Authentication Administrator',
      'Azure AD Joined Device Local Administrator',
      'Cloud Application Administrator',
      'Conditional Access Administrator',
      'Exchange Administrator',
      'User Administrator',
      'Groups Administrator',
      'Intune Administrator',
      'SharePoint Administrator',
      'Teams Administrator',
      'Compliance Administrator',
      'Privileged Access Administrator',
      'Identity Governance Administrator',
      'Partner Tier2 Support',
      'Directory Synchronization Accounts',
      'External Identity Provider Administrator',
      'Hybrid Identity Administrator'
    ];
    
    // Tier 3: Sometimes require justification (medium privilege)
    const tier3Roles = [
      'Security Reader',
      'Reports Reader',
      'Message Center Reader',
      'Directory Readers',
      'Guest Inviter',
      'License Administrator',
      'Password Administrator',
      'Helpdesk Administrator',
      'Service Support Administrator',
      'Billing Administrator'
    ];
    
    // Check tiers
    if (tier1Roles.some(role => roleName.includes(role))) {
      console.log(`🔴 Tier 1 role detected: ${roleName} - REQUIRES justification`);
      return true;
    }
    
    if (tier2Roles.some(role => roleName.includes(role))) {
      console.log(`🟡 Tier 2 role detected: ${roleName} - LIKELY requires justification`);
      return true;
    }
    
    if (tier3Roles.some(role => roleName.includes(role))) {
      console.log(`🟢 Tier 3 role detected: ${roleName} - MAY require justification`);
      return false; // Conservative: assume no justification for lower privilege roles
    }
    
    console.log(`⚪ Unknown role: ${roleName} - assuming no justification required`);
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
    const defaultJustification = justification || getMessage('defaultJustification');
    
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
    const defaultJustification = justification || getMessage('defaultJustification');
    
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
            sendResponse({ success: true, message: getMessage('authenticationRequired') });
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