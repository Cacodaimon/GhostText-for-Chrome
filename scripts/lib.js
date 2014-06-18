/**
 * GhostText for Chrome lib.
 *
 * @licence The MIT License (MIT)
 * @author Guido Krömer <mail 64 cacodaemon 46 de>
 * @todo Remove debug output.
 * @type {{openTab: Function, serverPort: Function, connectTextArea: Function, connectionHandler: Function, textChange: Function, errorHandler: Function}}
 */
var GhostText = {
    /**
     * Opens or activates a tab specified by it's url.
     *
     * @param {string} url The tab's URL.
     * @static
     */
    openTab: function (url) {
        /**
         * @type {string} The sanitized URL.
         */
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
     * @static
     */
    serverPort: function (port) {
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
     * @static
     */
    connectTextArea: function (textarea, title, tabId) {
        console.log("connectTextarea");
        /**
         * @type {HTMLTextAreaElement}
         */
        var textAreaDom = $(textarea).get(0);

        /**
         * @type {*}
         * @see https://developer.chrome.com/extensions/runtime#type-Port
         */
        var port = chrome.runtime.connect({name: "GhostText"});

        textarea.on('input.sta propertychange.sta onmouseup.sta', function() {
            console.log("CT");
            port.postMessage({
                change: GhostText.textChange(title, textarea),
                tabId: tabId
            });
        });

        port.onMessage.addListener(function(msg) {
            console.log(msg);

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
    },

    /**
     * Handles incoming connections from the content script.
     * Has to be started in the background script.
     * @todo Does not fit on my screen, refactor.
     * @static
     */
    connectionHandler: function () {
        console.log("connectionHandler");

        /**
         * Chrome tab id to WebSocket mapping.
         * @type {Array<WebSocket>}
         */
        var connections = {};

        chrome.runtime.onConnect.addListener(function(port) {
            console.log("chrome.runtime.onConnect.addListener");
            if (port.name != "GhostText") {
                return;
            }

            port.onMessage.addListener(function(msg) {
                console.log("port.onMessage.addListener");
                /**
                 * @type {string} The chrome tab id.
                 */
                var tabId = msg.tabId.toString();

                if (connections[tabId]) {
                    console.log(["connections[tabId].send(msg.change)", msg.change]);
                    connections[tabId].send(msg.change);

                    return;
                }

                $.get("http://localhost:" + GhostText.serverPort(), function(data) {
                    console.log("$.get");
                    /**
                     * @type {number}
                     */
                    var webSocketPort = data.WebSocketPort;
                    console.log(["Port ", port].join());

                    try {
                        connections[tabId] = new WebSocket('ws://localhost:' + webSocketPort);
                    } catch (e) {
                        GhostText.errorHandler(e);

                        return;
                    }

                    connections[tabId].onopen = function (event) {
                        console.log(event);
                        connections[tabId].send(msg.change);
                    };

                    connections[tabId].onerror = function (event) {
                        console.log(event);
                        delete connections[tabId];

                        GhostText.errorHandler(event);
                    };

                    connections[tabId].onmessage = function (event) {
                        console.log(event);
                        port.postMessage({
                            tabId: tabId,
                            change: event.data
                        });
                    };
                });
            });
        });
    },

    /**
     * Packs the title an the textarea's value and cursor into a change request the GhostText server understands.
     *
     * @param {jQuery} textarea
     * @param {string} title
     * @returns {string}
     * @static
     */
    textChange: function (title, textarea) {
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
     * @static
     */
    errorHandler: function (e) {
        if(e && (e.target && e.target.readyState === 3) || e.status == 404) {
            alert('Connection error. Make sure that Sublime Text is open and has GhostText installed. Try closing and opening it and try again. See if there are any errors in Sublime Text\'s console');
        }
    }
};
