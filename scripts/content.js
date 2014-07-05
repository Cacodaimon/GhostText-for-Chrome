var $connectedTextarea = $();

function reactToButtonClicked (request) {
    if (request.action && request.action == 'button-clicked') {
        if ($connectedTextarea.length) {
            closeConnection(request);
        } else {
            openConnection(request);
        }
    }
}

function closeConnection (request) {

    chrome.runtime.sendMessage({
        action: 'close-connection',
        tabId: request.tabId
    });

    //remove highlight from connected textarea
    $connectedTextarea.css({
        outline: ''
    });

    $connectedTextarea.off('.ghost-text'); //remove all event listeners
    $connectedTextarea = $();
}

function openConnection (request) {
    $connectedTextarea.off('.ghost-text'); //remove all event listeners

    var connectTextarea = function (textarea) {
        $connectedTextarea = $('textarea');

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
            var connectAndForgetTheRest = function () {
                console.log('User focused:', this);
                connectTextarea(this);
                $textareas.off('.ghost-text');
            };
            $textareas.on('focus.ghost-text', connectAndForgetTheRest);
    }
}

chrome.runtime.onMessage.addListener(reactToButtonClicked);