$(document).ready(function () {
    $('#btn-options').click(function () {
        GhostText.openTab('options.html');
    });

    $('#btn-about').click(function () {
        GhostText.openTab('about.html');
    });

    $('#btn-connect').click(function () {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        },
        function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {textarea: 'connect', id: tabs[0].id}, function(response) { });
        });
    });
});