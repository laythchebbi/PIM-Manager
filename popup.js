document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('eligList');
    const statusEl = document.getElementById('status');
  
    // 1) Ask background.js for eligibilities
    chrome.runtime.sendMessage({ action: 'listEligibleRoles' }, resp => {
      if (!resp.success) {
        statusEl.textContent = `Error: ${resp.error}`;
        return;
      }
      const items = resp.data.value;
      if (items.length === 0) {
        listEl.innerHTML = '<li>No eligible roles found.</li>';
        return;
      }
  
      // 2) Build list entries
// …inside your DOMContentLoaded handler…

items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.roleName;          // ← show displayName
    const btn = document.createElement('button');
    btn.textContent = 'Activate';
    btn.onclick = () => {
      statusEl.textContent = 'Activating…';
      chrome.runtime.sendMessage(
        { action: 'activateRole', eligibility: item },
        activateResp => {
          statusEl.textContent = activateResp.success
            ? 'Activated successfully!'
            : `Error: ${activateResp.error}`;
        }
      );
    };
    li.appendChild(btn);
    listEl.appendChild(li);
  });
  
    });
  });
  