// Azure PIM Helper - Chrome Extension Popup
// Final optimized version with justification support

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
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.applyTheme('light');
    
    // Wait a moment for background script to initialize
    await this.ensureBackgroundScript();
    await this.loadRoles();
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
      this.showStatus('error', 'Extension service is not responding. Please reload the extension.');
      return false;
    }
  }

  setupEventListeners() {
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
            throw new Error('Extension service worker is not responding. Please reload the extension.');
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
    const getServiceFromRole = (roleName) => {
      const azureRoles = ['Owner', 'Contributor', 'Reader', 'Key Vault', 'Storage'];
      const entraRoles = ['Global Administrator', 'Security Administrator', 'User Administrator', 'Privileged Role Administrator'];
      const m365Roles = ['Exchange Administrator', 'SharePoint Administrator', 'Teams Administrator'];
      
      if (azureRoles.some(role => roleName.includes(role))) return 'Azure';
      if (entraRoles.some(role => roleName.includes(role))) return 'Entra ID';
      if (m365Roles.some(role => roleName.includes(role))) return 'Microsoft 365';
      return 'Entra ID';
    };

    const getRoleType = (roleName) => {
      const criticalRoles = ['Global Administrator', 'Privileged Role Administrator', 'Owner'];
      const highRoles = ['Security Administrator', 'Contributor', 'Key Vault Administrator'];
      
      if (criticalRoles.some(role => roleName.includes(role))) return 'Critical';
      if (highRoles.some(role => roleName.includes(role))) return 'High';
      return 'Medium';
    };

    const parseDuration = (duration) => {
      if (!duration) return '1 hour';
      const match = duration.match(/PT(\d+)H/);
      return match ? `${match[1]} hour${match[1] !== '1' ? 's' : ''}` : '1 hour';
    };

    const role = {
      id: apiRole.id,
      name: apiRole.roleName,
      scope: apiRole.directoryScopeId === '/' ? 'Directory' : apiRole.directoryScopeId,
      type: getRoleType(apiRole.roleName),
      service: getServiceFromRole(apiRole.roleName),
      description: `Manage ${apiRole.roleName.replace(' Administrator', '').toLowerCase()} settings and permissions`,
      roleDefinitionId: apiRole.roleDefinitionId,
      principalId: apiRole.principalId,
      directoryScopeId: apiRole.directoryScopeId,
      requiresJustification: apiRole.requiresJustification || false
    };

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
      this.setLoadingWithProgress('Connecting to extension service...');
      this.clearStatus();
      console.log('Starting role loading...');
      const overallStartTime = performance.now();

      // Ensure background script is responsive
      const backgroundReady = await this.ensureBackgroundScript();
      if (!backgroundReady) {
        throw new Error('Extension service is not available');
      }

      // Load both eligible and active roles in parallel for faster loading
      this.setLoadingWithProgress('Fetching roles from Azure...');
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
      this.setLoadingWithProgress('Processing role data...');
      console.log('Converting role data...');
      const convertStartTime = performance.now();
      
      const eligible = (eligibleResponse.data?.value || []).map(role => this.convertApiRole(role, 'eligible'));
      const active = (activeResponse.data?.value || []).map(role => this.convertApiRole(role, 'active'));
      
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
      this.setLoadingWithProgress('Updating interface...');
      this.updateLastRefresh();
      this.renderRoles();
      this.updateTabCounts();

      // Show performance info in success message
      const loadTime = Math.round(overallEndTime - overallStartTime);
      this.showStatus('success', `Loaded ${eligible.length + active.length} roles in ${loadTime}ms`);

    } catch (error) {
      console.error('Role loading error:', error);
      
      // Show specific error messages for common issues
      if (error.message.includes('service worker') || error.message.includes('extension service')) {
        this.showStatus('error', 'Extension service not responding. Try reloading the extension.');
      } else if (error.message.includes('authentication') || error.message.includes('token')) {
        this.showStatus('error', 'Authentication required. Click refresh to sign in.');
      } else {
        this.showStatus('error', `Failed to load roles: ${error.message}`);
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
      this.showStatus('error', `Refresh failed: ${error.message}`);
    } finally {
      this.updateRefreshButton();
    }
  }

  // Simplified role activation without modal
  async handleActivateRole(roleId, roleName) {
    const role = this.eligibleRoles.find(r => r.id === roleId);
    if (!role) {
      this.showStatus('error', 'Role not found');
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
        ? 'Administrative task requiring elevated privileges - Role activation via PIM Helper extension'
        : 'Role activation requested via PIM Helper extension';

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

      this.showStatus('success', `Successfully activated ${roleName}`);
      setTimeout(() => this.loadRoles(), 3000);

    } catch (error) {
      console.error('Activation error:', error);
      this.showStatus('error', `Failed to activate ${roleName}: ${error.message}`);
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
      if (!role) throw new Error('Role not found');

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

      this.showStatus('success', `Extended ${roleName} for additional time`);
      setTimeout(() => this.loadRoles(), 1000);

    } catch (error) {
      this.showStatus('error', `Failed to extend ${roleName}: ${error.message}`);
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

  setLoadingWithProgress(message = 'Loading role data...') {
    this.loading = true;
    const loadingScreen = document.getElementById('loading-screen');
    const loadingContent = loadingScreen.querySelector('.loading-content p');
    
    loadingScreen.style.display = 'flex';
    loadingContent.textContent = message;
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
    element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
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
      container.innerHTML = this.getEmptyStateHTML('👑', 'No eligible roles available');
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
      container.innerHTML = this.getEmptyStateHTML('✅', 'No active roles currently');
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
      container.innerHTML = this.getEmptyStateHTML('🕐', 'No roles expiring soon');
      return;
    }

    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    let html = '';
    if (this.expiringRoles.length > 0) {
      html += `
        <div class="alert alert-destructive">
          <span class="alert-icon">⚠️</span>
          <span>${this.expiringRoles.length} role${this.expiringRoles.length !== 1 ? 's' : ''} expiring within 1 hour</span>
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
    
    return `
      <div class="role-item">
        <div class="role-info">
          <div class="role-header">
            <h4 class="role-name">${role.name}</h4>
            <div class="role-badges">
              <span class="badge badge-${role.type.toLowerCase()}">${role.type}</span>
              <span class="service-tag service-${role.service.replace(' ', '').toLowerCase()}">${role.service}</span>
              ${role.requiresJustification ? '<span class="justification-tag">📝 Justification Required</span>' : ''}
            </div>
          </div>
          <p class="role-scope">${role.scope}</p>
          <p class="role-description">${role.description}</p>
          
          ${type === 'eligible' && role.maxDuration ? `
            <p class="role-duration">Max duration: ${role.maxDuration}</p>
          ` : ''}
          
          ${role.requiresJustification && type === 'eligible' ? `
            <p class="justification-note">⚠️ This role requires business justification for activation</p>
          ` : ''}
          
          ${(type === 'active' || type === 'expiring') && role.activatedAt ? `
            <p class="role-activated">Activated ${role.activatedAt.toLocaleTimeString()}</p>
          ` : ''}
          
          ${(type === 'active' || type === 'expiring') && role.expiresAt ? `
            <p class="role-expires ${this.isExpiringSoon(role.expiresAt) ? 'expires-soon' : ''}">
              🕐 Expires in ${this.formatTimeRemaining(role.expiresAt)}
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
              ${isActivating ? '⏳ Activating' : 'Activate'}
            </button>
          ` : ''}
          
          ${(type === 'active' || type === 'expiring') ? `
            <button class="btn btn-outline extend-btn" 
                    data-role-id="${role.id}" 
                    data-role-name="${role.name}"
                    ${isExtending ? 'disabled' : ''}>
              ${isExtending ? '⏳ Extending' : 'Extend'}
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
        button.textContent = '⏳ Activating';
        break;
      case 'extending':
        button.disabled = true;
        button.textContent = '⏳ Extending';
        break;
      case 'normal':
        button.disabled = false;
        if (button.classList.contains('activate-btn')) {
          button.textContent = 'Activate';
        } else if (button.classList.contains('extend-btn')) {
          button.textContent = 'Extend';
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
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
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