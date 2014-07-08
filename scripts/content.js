'use strict';

var GhostTextContent = {
    /**
     * This tab's ID
     *
     * @type {Number}
     */
    tabId: null,

    /**
     * @type {*}
     * @see https://developer.chrome.com/extensions/runtime#type-Port
     */
    port: null,

    /**
     * The text area we're connected to
     *
     * @type {jQuery}
     */
    $connectedTextArea: $(),

    /**
     * Handles messages sent from other parts of the extension
     *
     * @param  {object} request The request object passed by Chrome
     * @public
     * @static
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
                GhostTextContent.disconnectTextArea();
                break;
            case 'notify':
                GhostTextContent[request.isError ? 'alertUser' : 'informUser'](request.message, request.stay);
                break;
        }
    },

    /**
     * Displays the passed message to the user.
     *
     * @param  {string}  message Message to display
     * @param  {boolean} stay    Whether the message will stay on indefinitely
     * @private
     * @static
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
     * @private
     * @static
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
     * @private
     * @static
     */
    hideMessages: function () {
        GThumane.remove();
    },

    /**
     * Gets how long a message needs to stay on screen
     *
     * @param  {string} message Message to display
     * @return {number} The duration in milliseconds
     */
    getMessageDisplayTime: function (message) {
        var wpm = 100;//180 is the average words read per minute, make it slower

        return message.split(' ').length / wpm * 60 * 1000;
    },

    /**
     * Disconnect text area.
     * @private
     * @static
     */
    disconnectTextArea: function () {
        //remove highlight from connected text area
        GhostTextContent.$connectedTextArea.css({
            boxShadow: ''
        });

         //remove all event listeners
        GhostTextContent.$connectedTextArea.off('.ghost-text');
        window.removeEventListener('beforeunload', GhostTextContent.disconnectTextArea);

        GhostTextContent.$connectedTextArea = $();
    },

    /**
     * Look for text areas in document and connect to is as soon as possible.
     * @private
     * @static
     */
    selectAndConnect: function () {
        var $textAreas = $('textarea');
        $textAreas.off('.ghost-text'); //remove all event listeners

        var $focusedTextArea = $textAreas.filter(':focus');

        if ($focusedTextArea.length) {
            $textAreas = $focusedTextArea;
        }
        switch  ($textAreas.length) {
            case 0:
                GhostTextContent.alertUser('No text area elements on this page');
                break;
            case 1:
                GhostTextContent.connectTextArea($textAreas);
                break;
            default:
                GhostTextContent.informUser('There are multiple text areas on this page. \n Click on the one you want to use.', true);
                $textAreas.on('focus.ghost-text', function () {
                    console.log('User focused:', this);
                    GhostTextContent.connectTextArea(this);
                    $textAreas.off('.ghost-text');
                });
        }
    },

    /**
     * Connects a HTML text area to a GhostText server by messaging through the background script
     *
     * @param {jQuery} $textArea The HTML text area element to connect.
     * @private
     * @static
     */
    connectTextArea: function ($textArea) {
        GhostTextContent.$connectedTextArea = $textArea;

        /** @type {HTMLTextAreaElement} */
        var textAreaDom = $textArea.get(0);

        //On the first connection, setup the port
        if(!GhostTextContent.port) {
            GhostTextContent.port = chrome.runtime.connect({name: 'GhostText'});
        }

        //Send content of text area now and when it changes
        GhostTextContent.sendTextToBackground();
        $textArea.on('input.ghost-text propertychange.ghost-text onmouseup.ghost-text', GhostTextContent.sendTextToBackground);

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
            $textArea.val(response.text);
            /** @type {{start: {number}, end: {number}}} */
            var minMaxSelection = GhostTextContent.getMinMaxSelection(response.selections);
            textAreaDom.selectionStart = minMaxSelection.start;
            textAreaDom.selectionEnd   = minMaxSelection.end;
            textAreaDom.focus();
        });

        //close connection when the text area is removed from the document
        $textArea.on('DOMNodeRemovedFromDocument.ghost-text', GhostTextContent.disconnectTextArea);

        //close text area when the tab is closed or reloaded
        window.addEventListener('beforeunload', GhostTextContent.disconnectTextArea);

        //highlight selected text area
        $textArea.css({
            // transition: 'box-shadow 1s cubic-bezier(.25,2,.5,1)', //This would have looked nice (http://i.imgur.com/B170pRA.gif), but it leaves some dirty pixels very often, so I disabled it
            boxShadow: '20px 20px #00adee'
        });

        //focus text area (scrolls it into view if it was auto-selected)
        textAreaDom.focus();

        //hide all messages (instructions and errors)
        GhostTextContent.hideMessages();

        GhostTextContent.informUser('Connected! You can switch to your editor');
    },

    /**
     * Send content of text area to background.js
     * @private
     * @static
     */
    sendTextToBackground: function () {
        /** @type {string} */
        var title = $('title').text();

        GhostTextContent.port.postMessage({
            change: GhostTextContent.textChange(title, GhostTextContent.$connectedTextArea, location),
            tabId: GhostTextContent.tabId
        });
    },

    /**
     * Packs the title an the text area's value and cursor into a change request the GhostText server understands.
     *
     * @param {string}   title
     * @param {jQuery}   $textArea
     * @param {object}   loc The tab's location object.
     * @returns {string}
     * @private
     * @static
     */
    textChange: function(title, $textArea, loc) {
        /** @type HTMLTextAreaElement */
        var textAreaDom = $textArea.get(0);

        return JSON.stringify({
                title:  title,
                text:   $textArea.val(),
                selections: [{
                    start: textAreaDom.selectionStart,
                    end: textAreaDom.selectionEnd
                }],
                url: loc.host,
                syntax: 'plaintext'
            });
    },

    /**
     * Extracts the min and max selection cursor position from the given selection array.
     *
     * @param {[{start: {number}, end: {number}}]} selection The selection array to extract the min max values.
     * @returns {{start: {number}, end: {number}}}
     * @private
     * @static
     */
    getMinMaxSelection: function(selection) {
        var minMaxSelection = {start: Number.MAX_VALUE, end: Number.MIN_VALUE};

        for (var i = selection.length - 1; i >= 0; i--) {
            minMaxSelection.start = Math.min(minMaxSelection.start, selection[i].start);
            minMaxSelection.end   = Math.max(minMaxSelection.end, selection[i].end);
        }

        return minMaxSelection;
    }
};

chrome.runtime.onMessage.addListener(GhostTextContent.messageHandler);