$(document).ready(function () {
    GhostText.connectionHandler();
});
chrome.browserAction.onClicked.addListener(function () {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    },
    function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, {textarea: 'connect', id: tabs[0].id}, function(response) { });
    });
});
