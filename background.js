// utils to generate code_verifier & code_challenge
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
    // standard base64 without padding, URL‐safe
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  async function makePkcePair() {
    const codeVerifier = randomString(128);
    const challengeBytes = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(challengeBytes);
    return { codeVerifier, codeChallenge };
  }
const CLIENT_ID = '4deb44bb-effe-44a1-b5e4-475ce2708d75';
const TENANT_ID = '950b7e19-2824-48c8-9403-c811f39aa336';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = [
  'openid',
  'profile',
  'RoleManagement.ReadWrite.Directory',
  'PrivilegedAccess.ReadWrite.AzureResources'
];

let accessToken = null;
let refreshToken = null;

async function authenticate() {
    // 1) Build PKCE pair
    const { codeVerifier, codeChallenge } = await makePkcePair();
  
    // 2) Save verifier for token exchange
    chrome.storage.local.set({ codeVerifier });
  
    // 3) Build auth URL
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      response_mode: 'query',
      scope: SCOPES.concat('offline_access').join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
  
    // 4) Launch interactive login
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          return reject(chrome.runtime.lastError);
        }
  
        const url = new URL(redirectUrl);
        const code = url.searchParams.get('code');
        if (!code) {
          return reject(new Error('No code returned'));
        }
  
        // 5) Exchange code for tokens, including stored verifier
        const { codeVerifier: savedVerifier } = await chrome.storage.local.get('codeVerifier');
        const body = new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          scope: SCOPES.concat('offline_access').join(' '),
          code_verifier: savedVerifier,
        });
  
        const tokenResponse = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        const tokenData = await tokenResponse.json();
  
        // 6) Check for errors
        if (!tokenResponse.ok) {
          return reject(new Error(`Token error: ${tokenData.error_description || tokenData.error}`));
        }
  
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;  // you’ll need this for refresh grants
        resolve();
      });
    });
  }

  async function refreshAccessToken() {
    if (!refreshToken) throw new Error('No refresh token available');
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: SCOPES.concat('offline_access').join(' ')
    });
    const r = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.error);
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
  }
    

  async function getAccessToken() {
    if (!accessToken) {
      await authenticate();
    }
    // (Optional) check expiry, then:
    // await refreshAccessToken();
    return accessToken;
  }
  
async function fetchRoleName(roleDefinitionId) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions/${roleDefinitionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    console.warn(`Failed to fetch roleDefinition ${roleDefinitionId}`);
    return roleDefinitionId; // fallback
  }
  const { displayName } = await res.json();
  return displayName;
}

async function listEligibleRoles() {
    const token = await getAccessToken();
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests' + "/filterByCurrentUser(on='principal')",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'List failed');
  
    // Enrich each item with a human‑readable name
    const enriched = await Promise.all(
      data.value.map(async item => {
        item.roleName = await fetchRoleName(item.roleDefinitionId);
        return item;
      })
    );
  
    // Return the same shape, but with roleName on each object
    return { value: enriched };
  }
  

async function activateRole(eligibility) {
    const token = await getAccessToken();
  
    const body = {
      principalId:      eligibility.principalId,
      roleDefinitionId: eligibility.roleDefinitionId,
      directoryScopeId: eligibility.directoryScopeId || '/',
      action:           'selfActivate',
      scheduleInfo: {
        startDateTime: new Date().toISOString(),
        expiration: {
          type:     'afterDuration',
          duration: 'PT1H'
        },
        recurrence: null
      }
    };
  
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests',
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error.message);
    }
    return data;
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        if (message.action === 'listEligibleRoles') {
          const data = await listEligibleRoles();
          sendResponse({ success: true, data });
        }
        else if (message.action === 'activateRole') {
          const result = await activateRole(message.eligibility);
          sendResponse({ success: true, result });
        }
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  });
  