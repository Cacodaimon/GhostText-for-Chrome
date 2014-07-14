var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var Selection = (function () {
            function Selection(start, end) {
                if (typeof start === "undefined") { start = 0; }
                if (typeof end === "undefined") { end = 0; }
                this.start = start;
                this.end = end;
            }
            return Selection;
        })();
        InputArea.Selection = Selection;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var Selections = (function () {
            function Selections(selections) {
                if (typeof selections === "undefined") { selections = []; }
                this.selections = selections;
            }
            Selections.prototype.add = function (selection) {
                this.selections.push(selection);
            };

            Selections.prototype.getAll = function () {
                return this.selections;
            };

            Selections.prototype.getMinMaxSelection = function () {
                var minMaxSelection = new InputArea.Selection(Number.MAX_VALUE, Number.MIN_VALUE);

                for (var i = this.selections.length - 1; i >= 0; i--) {
                    minMaxSelection.start = Math.min(minMaxSelection.start, this.selections[i].start);
                    minMaxSelection.end = Math.max(minMaxSelection.end, this.selections[i].end);
                }

                return minMaxSelection;
            };
            return Selections;
        })();
        InputArea.Selections = Selections;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var Detector = (function () {
            function Detector() {
                this.onFocusCB = null;
            }
            Detector.prototype.detect = function (document) {
                if (this.onFocusCB === null) {
                    throw 'On focus callback is missing!';
                }

                this.addTextAreas(document);

                if (this.inputAreaElements.length === 0) {
                    throw 'No supported elements found!';
                }

                if (this.trySingleElement()) {
                    return 1;
                }

                this.tryMultipleElements();

                return this.inputAreaElements.length;
            };

            Detector.prototype.focusEvent = function (callback) {
                this.onFocusCB = callback;
            };

            Detector.prototype.addTextAreas = function (document) {
                var textAreas = document.getElementsByTagName('textarea');

                for (var i = 0; i < textAreas.length; i++) {
                    var inputArea = new InputArea.TextArea();
                    inputArea.bind(textAreas[i]);

                    this.inputAreaElements.push(inputArea);
                }
            };

            Detector.prototype.trySingleElement = function () {
                var that = this;
                if (this.inputAreaElements.length === 1) {
                    var inputArea = this.inputAreaElements[0];
                    inputArea.focusEvent(that.onFocusCB);

                    return true;
                }

                return false;
            };

            Detector.prototype.tryMultipleElements = function () {
                var that = this;
                for (var i = 0; i < this.inputAreaElements.length; i++) {
                    this.inputAreaElements[i].focusEvent(function (inputArea) {
                        for (var j = 0; j < that.inputAreaElements.length; j++) {
                            if (that.inputAreaElements[j] !== inputArea) {
                                that.inputAreaElements[j].unbind();
                            }
                        }

                        that.onFocusCB(inputArea);
                    });
                }
            };
            return Detector;
        })();
        InputArea.Detector = Detector;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var StandardsCustomEvent = (function () {
            function StandardsCustomEvent() {
            }
            StandardsCustomEvent.get = function (eventType, data) {
                var customEvent = CustomEvent;
                var event = new customEvent(eventType, data);
                return event;
            };
            return StandardsCustomEvent;
        })();
        InputArea.StandardsCustomEvent = StandardsCustomEvent;

        var TextArea = (function () {
            function TextArea() {
                this.textArea = null;
                this.$textArea = null;
                this.textChangedEventCB = null;
                this.selectionChangedEventCB = null;
                this.removeEventCB = null;
                this.focusEventCB = null;
                this.customEvent = null;
            }
            TextArea.prototype.bind = function (domElement) {
                this.textArea = domElement;
                this.$textArea = $(this.textArea);
                var that = this;

                this.$textArea.on('input.ghost-text', function (e) {
                    if (that.textChangedEventCB) {
                        that.textChangedEventCB(that, that.getText());
                    }
                });

                this.$textArea.on('focus.ghost-text', function (e) {
                    if (that.focusEventCB) {
                        that.focusEventCB(that);
                    }
                });

                this.$textArea.on('DOMNodeRemovedFromDocument.ghost-text', function (e) {
                    if (that.removeEventCB) {
                        that.removeEventCB(that);
                    }
                });

                this.customEvent = StandardsCustomEvent.get('CustomEvent', { detail: { generatedByGhostText: true } });

                this.highlight();
            };

            TextArea.prototype.unbind = function () {
                this.$textArea.off('.ghost-text');
                this.removeHighlight();
            };

            TextArea.prototype.focus = function () {
                this.textArea.focus();
            };

            TextArea.prototype.textChangedEvent = function (callback) {
                this.textChangedEventCB = callback;
            };

            TextArea.prototype.selectionChangedEvent = function (callback) {
                this.selectionChangedEventCB = callback;
            };

            TextArea.prototype.removeEvent = function (callback) {
                this.removeEventCB = callback;
            };

            TextArea.prototype.focusEvent = function (callback) {
                this.focusEventCB = callback;
            };

            TextArea.prototype.getText = function () {
                return this.$textArea.val();
            };

            TextArea.prototype.setText = function (text) {
                this.$textArea.val(text);

                this.textArea.dispatchEvent(this.customEvent);
            };

            TextArea.prototype.getSelections = function () {
                return new InputArea.Selections();
            };

            TextArea.prototype.setSelections = function (selections) {
                var selection = selections.getMinMaxSelection();
                this.textArea.selectionStart = selection.start;
                this.textArea.selectionEnd = selection.end;
            };

            TextArea.prototype.highlight = function () {
                this.$textArea.css({
                    transition: 'box-shadow 1s cubic-bezier(.25,2,.5,1)',
                    boxShadow: '#00ADEE 0 0 20px 5px inset'
                });
            };

            TextArea.prototype.removeHighlight = function () {
                this.$textArea.css({ boxShadow: '' });
            };
            return TextArea;
        })();
        InputArea.TextArea = TextArea;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
//# sourceMappingURL=input-area.js.map
