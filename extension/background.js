// Opens the side panel next to the meeting tab and passes keyboard commands to it, so the
// shortcuts work while the focus is in the meeting.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.commands.onCommand.addListener((command) => { chrome.runtime.sendMessage({ command }); });
