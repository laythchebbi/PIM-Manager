// Azure PIM Helper - Chrome Extension Popup
// Vanilla JavaScript implementation for Chrome Extension

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
    await this.loadRoles();
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

  // Chrome extension messaging
  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });
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

  // Role data conversion
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
      directoryScopeId: apiRole.directoryScopeId
    };

    if (type === 'eligible') {
      role.maxDuration = parseDuration(apiRole.scheduleInfo?.expiration?.duration);
    } else {
      role.activatedAt = apiRole.scheduleInfo?.startDateTime ? new Date(apiRole.scheduleInfo.startDateTime) : null;
      role.expiresAt = apiRole.scheduleInfo?.expiration?.endDateTime ? new Date(apiRole.scheduleInfo.expiration.endDateTime) : null;
    }

    return role;
  }

  // Load roles from background script
  async loadRoles() {
    try {
      this.setLoading(true);
      this.clearStatus();

      // Load eligible roles
      const eligibleResponse = await this.sendMessage({ action: 'listEligibleRoles' });
      if (!eligibleResponse.success) {
        throw new Error(eligibleResponse.error || 'Failed to load eligible roles');
      }

      // Load active roles
      const activeResponse = await this.sendMessage({ action: 'listActiveRoles' });
      if (!activeResponse.success) {
        throw new Error(activeResponse.error || 'Failed to load active roles');
      }

      // Convert and categorize roles
      const eligible = eligibleResponse.data.value.map(role => this.convertApiRole(role, 'eligible'));
      const active = activeResponse.data.value.map(role => this.convertApiRole(role, 'active'));
      
      // Separate expiring roles (less than 1 hour remaining)
      const now = new Date();
      const expiring = active.filter(role => {
        if (!role.expiresAt) return false;
        const diff = role.expiresAt - now;
        return diff <= 60 * 60 * 1000; // Less than 1 hour
      });

      this.eligibleRoles = eligible;
      this.activeRoles = active;
      this.expiringRoles = expiring;
      
      this.updateLastRefresh();
      this.renderRoles();
      this.updateTabCounts();

    } catch (error) {
      this.showStatus('error', `Failed to load roles: ${error.message}`);
    } finally {
      this.setLoading(false);
      this.refreshing = false;
    }
  }

  async handleRefresh() {
    this.refreshing = true;
    this.updateRefreshButton();
    await this.loadRoles();
    this.updateRefreshButton();
  }

  async handleActivateRole(roleId, roleName) {
    this.activatingRoles.add(roleId);
    this.updateRoleButton(roleId, 'activating');
    this.clearStatus();

    try {
      const role = this.eligibleRoles.find(r => r.id === roleId);
      if (!role) throw new Error('Role not found');

      const response = await this.sendMessage({
        action: 'activateRole',
        eligibility: {
          id: role.id,
          roleDefinitionId: role.roleDefinitionId,
          principalId: role.principalId,
          directoryScopeId: role.directoryScopeId
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Activation failed');
      }

      this.showStatus('success', `Successfully activated ${roleName}`);
      setTimeout(() => this.loadRoles(), 1000);

    } catch (error) {
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

      if (!response.success) {
        throw new Error(response.error || 'Extension failed');
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

  renderRoles() {
    this.renderEligibleRoles();
    this.renderActiveRoles();
    this.renderExpiringRoles();
  }

  renderEligibleRoles() {
    const container = document.getElementById('eligible-roles');
    if (this.eligibleRoles.length === 0) {
      container.innerHTML = this.getEmptyStateHTML('👑', 'No eligible roles available');
      return;
    }

    container.innerHTML = this.eligibleRoles.map(role => this.getRoleItemHTML(role, 'eligible')).join('');
  }

  renderActiveRoles() {
    const container = document.getElementById('active-roles');
    if (this.activeRoles.length === 0) {
      container.innerHTML = this.getEmptyStateHTML('✅', 'No active roles currently');
      return;
    }

    container.innerHTML = this.activeRoles.map(role => this.getRoleItemHTML(role, 'active')).join('');
  }

  renderExpiringRoles() {
    const container = document.getElementById('expiring-roles');
    if (this.expiringRoles.length === 0) {
      container.innerHTML = this.getEmptyStateHTML('🕐', 'No roles expiring soon');
      return;
    }

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
    container.innerHTML = html;
  }

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
            </div>
          </div>
          <p class="role-scope">${role.scope}</p>
          <p class="role-description">${role.description}</p>
          
          ${type === 'eligible' && role.maxDuration ? `
            <p class="role-duration">Max duration: ${role.maxDuration}</p>
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