'use strict';
/**
 * GhostText for Chrome lib.
 *
 * @licence The MIT License (MIT)
 * @author Guido Krömer <mail 64 cacodaemon 46 de>
 *
 * @type {{protocolVersion: number, openTab: Function, serverPort: Function, connectTextArea: Function, connections: {}, connectionHandler: Function, connectionHandlerOnConnect: Function, closeConnection: Function, textChange: Function, guessSyntax: Function, getMinMaxSelection: Function, errorHandler: Function, checkProtocolVersion: Function}}
 */
var GhostText = {
    /**
     * @type {number} The GhostText protocol version.
     * @private
     */
    protocolVersion: 1,

    /**
     * Opens or activates a tab specified by its url.
     *
     * @param {string} url The tab's URL.
     * @public
     * @static
     */
    openTab: function(url) {
        /** @type {string} The sanitized URL. */
        var optionsUrl = chrome.extension.getURL(url);

        chrome.tabs.query({url: optionsUrl}, function(tabs) {
            if (tabs.length) {
                chrome.tabs.update(tabs[0].id, {active: true});
            } else {
                chrome.tabs.create({url: optionsUrl});
            }
        });
    },

    /**
     * Call the callback with the current tab id (async)
     *
     * @param  {function} callback The function to call with the id
     */
    inCurrentTab: function (callback) {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs){
            callback(tabs[0].id);
        });
    },

    /**
     * Gets or sets the GhostText server main port.
     *
     * @param {number} port The TCP port number.
     * @returns {number} The TCP port number.
     * @public
     * @static
     */
    serverPort: function(port) {
        if (!port) {
            return localStorage.getItem('server-port-v1') || 4001;
        }

        localStorage.setItem('server-port-v1', port);
    },

    /**
     * Chrome tab id to WebSocket mapping.
     * @type {Array<WebSocket>}
     * @private
     * @static
     */
    connections: {},

    /**
     * Handles incoming connections from the content script.
     * Has to be started in the background script.
     * @public
     * @static
     */
    connectionHandler: function() {
        chrome.runtime.onConnect.addListener(GhostText.connectionHandlerOnConnect);

        chrome.runtime.onMessage.addListener(GhostText.messageHandler);

        //inform the content script that the button has been clicked
        chrome.browserAction.onClicked.addListener(function () {
            GhostText.inCurrentTab(function toggleConnection (tabId){
                if (GhostText.connections[tabId]) {
                    GhostText.closeConnection(tabId);
                } else {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'select-and-connect',
                        tabId: tabId
                    });
                }
            });
        });
    },

    /**
     * Handles incoming chrome messages, used by the connectionHandler.
     *
     * @param {*} port
     * @see https://developer.chrome.com/extensions/runtime#type-Port
     * @private
     */
    connectionHandlerOnConnect: function(port) {
        if (port.name !== 'GhostText') {
            return;
        }

        port.onMessage.addListener(function(msg) {
            /** @type {string} The chrome tab id. */
            var tabId = msg.tabId;

            if (GhostText.connections[tabId] && GhostText.connections[tabId].readyState === 1) { // 1 - connection established
                GhostText.connections[tabId].send(msg.change);

                return;
            }

            $.get('http://localhost:' + GhostText.serverPort(), function(data) {
                if (!GhostText.checkProtocolVersion(data.ProtocolVersion)) {
                    return;
                }

                try {
                    GhostText.connections[tabId] = new WebSocket('ws://localhost:' + data.WebSocketPort);
                } catch (e) {
                    GhostText.errorHandler(e);

                    return;
                }

                GhostText.connections[tabId].onopen = function () {
                    chrome.browserAction.setBadgeText({
                        text: /linux/i.test(navigator.userAgent)?'OK':'✓',
                        tabId: tabId
                    });
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: '#008040',
                        tabId: tabId
                    });
                    GhostText.connections[tabId].send(msg.change);
                    console.log('Connection: opened');
                };

                GhostText.connections[tabId].onclose = function () {
                    GhostText.closeConnection(tabId);
                };

                GhostText.connections[tabId].onerror = function (event) {
                    GhostText.closeConnection(tabId);
                    console.log('Connection: error:', event);
                    GhostText.errorHandler(event);
                };

                GhostText.connections[tabId].onmessage = function (event) {
                    port.postMessage({
                        tabId: tabId,
                        change: event.data
                    });
                };
            }).fail(function(e) { GhostText.errorHandler(e); });
        });
    },

    /**
     * Closes a WebSocket connected to a tab.
     *
     * @param {number} tabId
     * @returns {boolean}
     * @private
     * @static
     */
    closeConnection: function(tabId) {
        if (!GhostText.connections[tabId]) {
            return false;
        }

        if (GhostText.connections[tabId].readyState !== 3) { // 3 - connection closed or could not open
            try {
                GhostText.connections[tabId].close();
            } catch (e) {
                console.log('Connection: error during closing:', e);
            }
        }
        delete GhostText.connections[tabId];
        console.log('Connection: closed');

        try {
            //inform tab that the connection was closed
            chrome.tabs.sendMessage(tabId, {
                action: 'disconnect',
                tabId: tabId
            });

            chrome.browserAction.setBadgeText({
                text: '',
                tabId: tabId
            });
        } catch (e) {
            //tab might have been closed already; don't know how to detect it first.
        }

        return true;
    },

    /**
     * Packs the title an the textarea's value and cursor into a change request the GhostText server understands.
     *
     * @param {string}   title
     * @param {jQuery}   textArea
     * @param {object}   loc The tab's location object.
     * @returns {string}
     * @private
     * @static
     */
    textChange: function(title, textArea, loc) {
        var textAreaDom = $(this).get(0);

        return JSON.stringify({
                title:  title,
                text:   textArea.val(),
                selections: [{
                    start: textAreaDom.selectionStart,
                    end: textAreaDom.selectionEnd
                }],
                url: loc.host,
                syntax: GhostText.guessSyntax(loc)
            });
    },

    /**
     * Guesses the syntax by the given URL.
     *
     * @param {string} url The URL used for the syntax lookup.
     * @returns {string} The guessed syntax name.
     * @private
     * @static
     * @todo This is currently just a method stub!
     */
    guessSyntax: function(url) {
        return 'plaintext';
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
    },

    /**
     * A general error handler.
     *
     * @param {Error} e
     * @private
     * @static
     */
    errorHandler: function(e) {
        if(e && (e.target && e.target.readyState === 3) || e.status === 404 || e.status === 0) {
            GhostText.notifyUser(true, 'Connection error. \n Make sure that Sublime Text is open and has GhostText installed. \n Try closing and opening it and try again. \n Make sure that the port matches (4001 is the default). \n See if there are any errors in Sublime Text\'s console');
        }
    },

    /**
     * Prints a error message if the server's protocol version differs from the clients.
     *
     * @param {number} version The protocol version.
     * @private
     * @static
     */
    checkProtocolVersion: function(version) {
        if (version === GhostText.protocolVersion) {
            return true;
        }

        GhostText.notifyUser(true, 'Can\'t connect to this GhostText server, the server\'s protocol version is', version, 'the client\'s protocol version is:', GhostText.protocolVersion);

        return false;
    },

    /**
     * Handles messages sent from other parts of the extension
     *
     * @param  {object} request The request object passed by Chrome
     */
    messageHandler: function (request) {
        if (!request || !request.action) {
            return;
        }
        switch (request.action) {
            case 'close-connection':
                GhostText.closeConnection(request.tabId);
                break;
        }
    },

    /**
     * Pipe messages to the document thought content.js
     *
     * @param  {boolean} isError Whether it's an error message (optional)
     * @param  {boolean} stay    Whether the message will stay on indefinitely (optional)
     * @param  {string}  message Message to display
     */
    notifyUser: function () {
        var msg = {};
        if (typeof arguments[0] === 'boolean') {
            msg.isError = [].shift.call(arguments);
        }
        if (typeof arguments[0] === 'boolean') {
            msg.stay = [].shift.call(arguments);
        }
        msg.message = [].join.call(arguments, ' ');
        msg.action = 'notify';

        GhostText.inCurrentTab(function (tabId) {
            msg.tabId = tabId;
            chrome.tabs.sendMessage(tabId, msg);
        });
    }
};