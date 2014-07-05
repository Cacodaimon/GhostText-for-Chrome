var isConnected = false;
var isWaitingForUser = false;
function reactToButtonClicked (request) {
    if (request.action && request.action == 'button-clicked') {
        if(isWaitingForUser) {
            $textareas.off('.ghost-text');
        }
        if (isConnected) {
            closeConnection(request);
        } else {
            openConnection(request);
        }
    }
}
function closeConnection (request) {
    isConnected = false;
    chrome.runtime.sendMessage({
        action: 'close-connection',
        tabId: request.tabId
    });
}
function openConnection (request) {
    var connectTextarea = function (textarea) {
        isConnected = true;
        isWaitingForUser = false;
        GhostText.connectTextArea($(textarea), $('title').text(), request.tabId, window.location);
        window.addEventListener('beforeunload', function () {
            closeConnection(request);
        });
    };

    var $textareas = $('textarea');
    var $focusedTextarea = $textareas.filter(':focus');
    if ($focusedTextarea.length) {
        $textareas = $focusedTextarea;
    }
    switch  ($textareas.length) {
        case 0: alert('No textarea elements on this page'); break;
        case 1: connectTextarea($textareas); break;
        default:
            isWaitingForUser = true;
            var connectAndForgetTheRest = function () {
                console.log('User focused:', this);
                connectTextarea(this);
                $textareas.off('.ghost-text');
            };
            $textareas.on('focus.ghost-text', connectAndForgetTheRest);
    }
}


chrome.runtime.onMessage.addListener(reactToButtonClicked);