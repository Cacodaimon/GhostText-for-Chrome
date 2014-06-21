/**
 * GhostText for Chrome lib.
 *
 * @licence The MIT License (MIT)
 * @author Guido Krömer <mail 64 cacodaemon 46 de>
 * @type {{protocolVersion: number, openTab: Function, serverPort: Function, connectTextArea: Function, connections: {}, connectionHandler: Function, connectionHandlerOnConnect: Function, closeConnection: Function, textChange: Function, errorHandler: Function}}
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
     * Connects a textarea to a GhostText server by messaging through the background script..
     *
     * @param {jQuery} textarea The textarea to connect.
     * @param {string} title The tabs title.
     * @param {number} tabId The chrome tab id.
     * @public
     * @static
     */
    connectTextArea: function(textarea, title, tabId) {
        /** @type {HTMLTextAreaElement} */
        var textAreaDom = $(textarea).get(0);

        /**
         * @type {*}
         * @see https://developer.chrome.com/extensions/runtime#type-Port
         */
        var port = chrome.runtime.connect({name: "GhostText"});

        textarea.on('input.sta propertychange.sta onmouseup.sta', function() {
            port.postMessage({
                change: GhostText.textChange(title, textarea),
                tabId: tabId
            });
        });

        port.onMessage.addListener(function(msg) {
            if (msg.tabId != tabId) {
                return;
            }

            /**
             * @type {{text: {string}, cursor: {min: {number}, max: {number}}}}
             */
            var response = JSON.parse(msg.change);
            textarea.val(response.text);

            textAreaDom.selectionStart = response.cursor.min;
            textAreaDom.selectionEnd   = response.cursor.max;
            textAreaDom.focus();
        });

        port.postMessage({
            change: GhostText.textChange(title, textarea),
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
     * @param {jQuery} textarea
     * @param {string} title
     * @returns {string}
     * @private
     * @static
     */
    textChange: function(title, textarea) {
        var textAreaDom = $(this).get(0);

        return JSON.stringify({
                title:  title,
                text:   textarea.val(),
                cursor: {
                    start: textAreaDom.selectionStart,
                    end: textAreaDom.selectionEnd
                }
            });
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
     * @param version
     */
    checkProtocolVersion: function(version) {
        if (version === GhostText.protocolVersion) {
            return true;
        }

        alert(['Can\'t connect to this GhostText server, the server\'s protocol version is', version, 'the client\'s protocol version is:', GhostText.protocolVersion].join(' '));

        return false;
    }
};
