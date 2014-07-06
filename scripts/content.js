var GhostTextContent = {
    /**
     * Displays the passed message to the user.
     *
     * @param  {string} message Message to display
     */
    informUser: function (message, stay) {
        console.info('GhostText:', message);
        GThumane.remove();

        var timeout = stay ? 0 : GhostTextContent.getMessageDisplayTime(message);
        GThumane.log(message, {
            timeout: timeout,
            clickToClose: true
        });
    },

    /**
     * Displays the passed message to the user as an error
     *
     * @param  {string} message Message to display
     */
    alertUser: function (message) {
        console.warn('GhostText:', message);
        GThumane.remove();

        var timeout = stay ? 0 : GhostTextContent.getMessageDisplayTime(message);
        GThumane.log(message, {
            timeout: timeout,
            clickToClose: true,
            addnCls: 'ghost-text-message-error'
        });
    },
    /**
     * Hides any messages on screen
     *
     * @param  {string} message Message to display
     */
    hideMessages: function () {
        GThumane.remove();
    },

    /**
     * Gets how long a message needs to stay on screen
     * @param  {String} message Message to display
     * @return {Number}         in milliseconds
     */
    getMessageDisplayTime: function (message) {
        var wpm = 100;//180 is the average words read per minute, make it slower
        var duration = message.split(' ').length / wpm * 60 * 1000;
        return duration;
    }
};

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
        case 0: GhostTextContent.alertUser('No textarea elements on this page'); break;
        case 1: connectTextarea($textareas); break;
        default:
            var connectAndForgetTheRest = function () {
                console.log('User focused:', this);
                connectTextarea(this);
                $textareas.off('.ghost-text');
                GhostTextContent.hideMessages();
            };
            GhostTextContent.informUser('There are multiple textareas on this page. <br> Click on the one you want to use.', true);
            $textareas.on('focus.ghost-text', connectAndForgetTheRest);
    }
}

chrome.runtime.onMessage.addListener(reactToButtonClicked);