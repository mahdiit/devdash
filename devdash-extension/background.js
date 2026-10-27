// Toolbar icon -> open (or focus) the dashboard tab.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('dashboard.html');
  const [tab] = await chrome.tabs.query({ url });
  if (tab) { chrome.tabs.update(tab.id, { active: true }); chrome.windows.update(tab.windowId, { focused: true }); }
  else chrome.tabs.create({ url });
});
// First install: open settings so the user can enter URLs/tokens.
chrome.runtime.onInstalled.addListener(d => d.reason === 'install' && chrome.runtime.openOptionsPage());
