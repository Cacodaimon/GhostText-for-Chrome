'use strict';
var GhostTextContent = {
    /**
     * This tab's ID
     * @type {Number}
     */
    tabId: null,

    /**
     * @type {*}
     * @see https://developer.chrome.com/extensions/runtime#type-Port
     */
    port: null,

    /**
     * Displays the passed message to the user.
     *
     * @param  {string}  message Message to display
     * @param  {boolean} stay    Whether the message will stay on indefinitely
     */
    informUser: function (message, stay) {
        console.info('GhostText:', message);
        GThumane.remove();

        message = message.replace(/\n/g,'<br>');
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
     * @param  {boolean} stay    Whether the message will stay on indefinitely
     */
    alertUser: function (message, stay) {
        console.warn('GhostText:', message);
        GThumane.remove();

        message = message.replace(/\n/g,'<br>');
        var timeout = stay ? 0 : GhostTextContent.getMessageDisplayTime(message);
        GThumane.log(message, {
            timeout: timeout,
            clickToClose: true,
            addnCls: 'ghost-text-message-error'
        });
    },
    /**
     * Hides any messages on screen
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
     * Handles messages sent from other parts of the extension
     *
     * @param  {object} request The request object passed by Chrome
     */
    messageHandler: function (request) {
        console.log('Got message:', request);
        if (!request || !request.action || !request.tabId) {
            return;
        }

        //Store this tab's id as soon as possible
        GhostTextContent.tabId = request.tabId;

        switch (request.action) {
            case 'select-and-connect':
                GhostTextContent.selectAndConnect();
                break;
            case 'disconnect':
                GhostTextContent.disconnectTextarea();
                break;
            case 'notify':
                GhostTextContent[request.isError ? 'alertUser' : 'informUser'](request.message, request.stay);
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
     */
    disconnectTextarea: function () {
        //remove highlight from connected textarea
        GhostTextContent.$connectedTextarea.css({
            outline: ''
        });

         //remove all event listeners
        GhostTextContent.$connectedTextarea.off('.ghost-text');
        window.removeEventListener('beforeunload', GhostTextContent.disconnectTextarea);

        GhostTextContent.$connectedTextarea = $();
    },


    /**
     * Look for textareas in document and connect to is as soon as possible
     */
    selectAndConnect: function () {
        var $textareas = $('textarea');
        $textareas.off('.ghost-text'); //remove all event listeners

        var $focusedTextarea = $textareas.filter(':focus');
        if ($focusedTextarea.length) {
            $textareas = $focusedTextarea;
        }
        switch  ($textareas.length) {
            case 0:
                GhostTextContent.alertUser('No textarea elements on this page');
                break;
            case 1:
                GhostTextContent.connectTextarea($textareas);
                break;
            default:
                var connectAndForgetTheRest = function () {
                    console.log('User focused:', this);
                    GhostTextContent.connectTextarea(this);
                    $textareas.off('.ghost-text');
                    GhostTextContent.hideMessages();
                };
                GhostTextContent.informUser('There are multiple textareas on this page. \n Click on the one you want to use.', true);
                $textareas.on('focus.ghost-text', connectAndForgetTheRest);
        }
    },

    /**
     * Connects a HTML textarea to a GhostText server by messaging through the background script
     *
     * @param {element} textArea The HTML textarea element to connect.
     * @public
     * @static
     */
    connectTextarea: function (textarea) {
        /** @type {jQuery} */
        var $textarea = GhostTextContent.$connectedTextarea = $(textarea);

        /** @type {HTMLTextAreaElement} */
        textarea = $textarea.get(0);


        //On the first connection, setup the port
        if(!GhostTextContent.port) {
            GhostTextContent.port = chrome.runtime.connect({name: 'GhostText'});
        }


        //Send content of textarea now and when it changes
        GhostTextContent.sendTextToBackground();
        $textarea.on('input.ghost-text propertychange.ghost-text onmouseup.ghost-text', GhostTextContent.sendTextToBackground);


        /**
         * Receive messages from background.js
         *
         * @param  {object} msg The message received
         */
        GhostTextContent.port.onMessage.addListener(function(msg) {
            if (msg.tabId !== GhostTextContent.tabId) {
                return;
            }

            /** @type {{text: {string}, selections: [{start: {number}, end: {number}}]}} */
            var response = JSON.parse(msg.change);
            $textarea.val(response.text);
            /** @type {{start: {number}, end: {number}}} */
            var minMaxSelection = GhostText.getMinMaxSelection(response.selections);
            textarea.selectionStart = minMaxSelection.start;
            textarea.selectionEnd   = minMaxSelection.end;
            textarea.focus();
        });

        //close connection when the textarea is removed from the document
        $textarea.on('DOMNodeRemovedFromDocument.ghost-text', GhostTextContent.disconnectTextarea);

        //close textarea when the tab is closed or reloaded
        window.addEventListener('beforeunload', GhostTextContent.disconnectTextarea);

        //highlight selected textarea
        $textarea.css({
            outline: 'dashed 2px #f97e2e'
        });
    },


    /**
     * Send content of textarea to background.js
     */
    sendTextToBackground: function () {
        /**
         * @type {string}
         */
        var title = $('title').text();

        GhostTextContent.port.postMessage({
            change: GhostText.textChange(title, GhostTextContent.$connectedTextarea, location),
            tabId: GhostTextContent.tabId
        });
    }
};

chrome.runtime.onMessage.addListener(GhostTextContent.messageHandler);