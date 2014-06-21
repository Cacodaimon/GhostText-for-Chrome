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
     * Opens or activates a tab specified by it's url.
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
     * Gets or sets the GhostText server main port.
     *
     * @param {number} port The TCP port number.
     * @returns {number} The TCP port number.
     * @public
     * @static
     */
    serverPort: function(port) {
        if (port == null) {
            return localStorage.getItem('server-port') || 4001;
        }

        localStorage.setItem('server-port', port);
    },

    /**
     * Connects a HTML textarea to a GhostText server by messaging through the background script..
     *
     * @param {jQuery} textArea The HTML textarea element to connect.
     * @param {string} title The tabs title.
     * @param {number} tabId The chrome tab id.
     * @param {string} tabUrl The chrome tab's URL.
     * @public
     * @static
     */
    connectTextArea: function(textArea, title, tabId, tabUrl) {
        /** @type {HTMLTextAreaElement} */
        var textAreaDom = $(textArea).get(0);

        /**
         * @type {*}
         * @see https://developer.chrome.com/extensions/runtime#type-Port
         */
        var port = chrome.runtime.connect({name: "GhostText"});

        textArea.on('input.sta propertychange.sta onmouseup.sta', function() {
            port.postMessage({
                change: GhostText.textChange(title, textArea, tabUrl),
                tabId: tabId
            });
        });

        port.onMessage.addListener(function(msg) {
            if (msg.tabId != tabId) {
                return;
            }

            /** @type {{text: {string}, selections: [{start: {number}, end: {number}}]}} */
            var response = JSON.parse(msg.change);
            textarea.val(response.text);
            /** @type {{start: {number}, end: {number}}} */
            var minMaxSelection = GhostText.getMinMaxSelection(response.selections);
            textAreaDom.selectionStart = minMaxSelection.start;
            textAreaDom.selectionEnd   = minMaxSelection.end;
            textAreaDom.focus();
        });

        port.postMessage({
            change: GhostText.textChange(title, textArea, tabUrl),
            tabId: tabId
        });
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

        chrome.tabs.onRemoved.addListener(GhostText.closeConnection);
    },

    /**
     * Handles incoming chrome messages, used by the connectionHandler.
     *
     * @param {*} port
     * @see https://developer.chrome.com/extensions/runtime#type-Port
     * @private
     */
    connectionHandlerOnConnect: function(port) {
        if (port.name != "GhostText") {
            return;
        }

        port.onMessage.addListener(function(msg) {
            /** @type {string} The chrome tab id. */
            var tabId = msg.tabId.toString();

            if (GhostText.connections[tabId] && GhostText.connections[tabId].readyState == 1) { // 1 - connection established
                GhostText.connections[tabId].send(msg.change);

                return;
            }

            $.get("http://localhost:" + GhostText.serverPort(), function(data) {
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
                    GhostText.connections[tabId].send(msg.change);
                };

                GhostText.connections[tabId].onclose = GhostText.connections[tabId].onerror = function (event) {
                    GhostText.closeConnection(tabId);
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
     * @param {number|string} tabId
     * @returns {boolean}
     * @private
     * @static
     */
    closeConnection: function(tabId) {
        tabId = tabId.toString();

        if (!GhostText.connections[tabId]) {
            return false;
        }

        if (GhostText.connections[tabId].readyState != 3) { // 3 - connection closed or could not open
            try {
                GhostText.connections[tabId].close();
            } catch (e) {
                console.log(e);
            }
        }
        delete GhostText.connections[tabId];

        return true;
    },

    /**
     * Packs the title an the textarea's value and cursor into a change request the GhostText server understands.
     *
     * @param {string} title
     * @param {jQuery} textArea
     * @param {string} tabUrl The tab's URL.
     * @returns {string}
     * @private
     * @static
     */
    textChange: function(title, textArea, tabUrl) {
        var textAreaDom = $(this).get(0);

        return JSON.stringify({
                title:  title,
                text:   textArea.val(),
                selections: [{
                    start: textAreaDom.selectionStart,
                    end: textAreaDom.selectionEnd
                }],
                syntax: GhostText.guessSyntax(tabUrl)
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
        return 'plaintext ' + url;
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
        if(e && (e.target && e.target.readyState === 3) || e.status == 404) {
            alert('Connection error. Make sure that Sublime Text is open and has GhostText installed. Try closing and opening it and try again. See if there are any errors in Sublime Text\'s console');
        }
    },

    /**
     * Prints a error message if the server's protocol version differs from the clients.
     *
     * @param {number} version The protocol version.
     */
    checkProtocolVersion: function(version) {
        if (version === GhostText.protocolVersion) {
            return true;
        }

        alert(['Can\'t connect to this GhostText server, the server\'s protocol version is', version, 'the client\'s protocol version is:', GhostText.protocolVersion].join(' '));

        return false;
    }
};
