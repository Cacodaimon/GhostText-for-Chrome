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
     *
     * @param  {string} message Message to display
     * @return {number}         in milliseconds
     */
    getMessageDisplayTime: function (message) {
        var wpm = 100;//180 is the average words read per minute, make it slower
        var duration = message.split(' ').length / wpm * 60 * 1000;
        return duration;
    },

    /**
     * Handles messages sent from background.js
     *
     * @param  {object} request The request object passed by Chrome
     */
    messageHandler: function (request) {
        if (!request || !request.action) {
            return;
        }
        switch (request.action) {
            case 'button-clicked':
                if (GhostTextContent.$connectedTextarea.length) {
                    GhostTextContent.disconnectTextarea(request);
                } else {
                    GhostTextContent.tryToConnectTextarea(request);
                }
                break;
        }
    },

    /**
     * The textarea we're connected to
     * @type {jQuery}
     */
    $connectedTextarea: $(),

    /**
     * Disconnect textarea
     *
     * @param  {object} request The request object passed by Chrome
     */
    disconnectTextarea: function (request) {

        chrome.runtime.sendMessage({
            action: 'close-connection',
            tabId: request.tabId
        });

        //remove highlight from connected textarea
        GhostTextContent.$connectedTextarea.css({
            outline: ''
        });

        GhostTextContent.$connectedTextarea.off('.ghost-text'); //remove all event listeners
        GhostTextContent.$connectedTextarea = $();
    },


    /**
     * Look for textareas in document and connect to is as soon as possible
     *
     * @param  {object} request The request object passed by Chrome
     */
    tryToConnectTextarea: function (request) {

        var connectTextarea = function (textarea) {
            GhostTextContent.$connectedTextarea = $('textarea');

            //open actual connection
            GhostText.connectTextArea(GhostTextContent.$connectedTextarea, $('title').text(), request.tabId, window.location);

            //close connection when the textarea is removed from the document
            GhostTextContent.$connectedTextarea.on('DOMNodeRemovedFromDocument', function () {
                GhostTextContent.disconnectTextarea(request);
            });

            //close textarea when the tab is closed or reloaded
            window.addEventListener('beforeunload', function () {
                GhostTextContent.disconnectTextarea(request);
            });

            //highlight selected textarea
            GhostTextContent.$connectedTextarea.css({
                outline: 'dashed 2px #f97e2e'
            });
        };

        var $textareas = $('textarea');
        $textareas.off('.ghost-text'); //remove all event listeners

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
};

chrome.runtime.onMessage.addListener(GhostTextContent.messageHandler);