var isConnected = false;
var isWaitingForUser = false;
var $connectedTextarea;

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

    //highlight selected textarea
    $connectedTextarea.css({
        outline: ''
    });
}

function openConnection (request) {
    var connectTextarea = function (textarea) {
        $connectedTextarea = $('textarea');
        isConnected = true;
        isWaitingForUser = false;

        //open actual connection
        GhostText.connectTextArea($connectedTextarea, $('title').text(), request.tabId, window.location);

        //close connection when the textarea is removed from the document
        $connectedTextarea.on('DOMNodeRemovedFromDocument', function () {
            closeConnection(request);
        });

        //close textarea when the tab is closed or reloaded
        window.addEventListener('beforeunload', function () {
            closeConnection(request);
        });

        //highlight selected textarea
        $connectedTextarea.css({
            outline: 'dashed 2px #f97e2e'
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