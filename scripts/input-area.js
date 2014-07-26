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
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
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

            Selections.fromPlainJS = function (selections) {
                var newSelections = [];

                for (var i = selections.length - 1; i >= 0; i--) {
                    newSelections.push(new InputArea.Selection(selections[i].start, selections[i].end));
                }

                return new Selections(newSelections);
            };

            Selections.prototype.toJSON = function () {
                return this.selections;
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
        var TextChange = (function () {
            function TextChange(text, selections, title, url, syntax) {
                if (typeof text === "undefined") { text = null; }
                if (typeof selections === "undefined") { selections = []; }
                if (typeof title === "undefined") { title = window.document.title; }
                if (typeof url === "undefined") { url = location.host; }
                if (typeof syntax === "undefined") { syntax = ''; }
                this.text = text;
                this.selections = selections;
                this.title = title;
                this.url = url;
                this.syntax = syntax;
            }
            return TextChange;
        })();
        InputArea.TextChange = TextChange;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var Detector = (function () {
            function Detector() {
                this.onFocusCB = null;
                this.inputAreaElements = [];
            }
            Detector.prototype.detect = function (document) {
                if (this.onFocusCB === null) {
                    throw 'On focus callback is missing!';
                }

                this.addAceElements(document);

                this.addContentEditableElements(document);

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
                var textAreas = document.body.getElementsByTagName('textarea');

                for (var i = 0; i < textAreas.length; i++) {
                    var inputArea = new InputArea.TextArea();
                    inputArea.bind(textAreas[i]);
                    this.inputAreaElements.push(inputArea);
                }
            };

            Detector.prototype.addContentEditableElements = function (document) {
                var contentEditables = document.body.querySelectorAll('[contenteditable=\'true\']');

                for (var i = 0; i < contentEditables.length; i++) {
                    console.log(contentEditables[i]);
                    var inputArea = new InputArea.ContentEditable();
                    inputArea.bind(contentEditables[i]);
                    this.inputAreaElements.push(inputArea);
                }
            };

            Detector.prototype.addAceElements = function (document) {
                var aceEditors = document.body.querySelectorAll('.ace_editor');

                for (var i = 0; i < aceEditors.length; i++) {
                    var aceEditor = aceEditors[i];
                    var id = aceEditor.getAttribute('id');
                    this.injectScript(document, this.buildAceScript(id));
                    var inputArea = new InputArea.JSCodeEditor();
                    inputArea.bind(aceEditor);
                    this.inputAreaElements.push(inputArea);
                }
            };

            Detector.prototype.buildAceScript = function (id) {
                return [
                    '(function() {',
                    'var ghostTextAceDiv = document.querySelector("#', id, '");',
                    'var ghostTextAceEditor = ace.edit(document.querySelector("#', id, '"));',
                    'var ghostTextAceEditorSession = ghostTextAceEditor.getSession();',
                    'ghostTextAceDiv.addEventListener("GhostTextServerInput", function (e) {',
                    'console.log("window.addEventListener > GhostTextServerInput");',
                    'console.log(["GhostTextServerInput", e, e.detail]);',
                    'ghostTextAceEditorSession.setValue(e.detail.text);',
                    '}, false);',
                    'ghostTextAceEditorSession.on("change", function(e) {',
                    'console.log(["ghostTextAceEditor.on > change", e]);',
                    'var value = ghostTextAceEditorSession.getValue();',
                    'var inputEvent = new CustomEvent("GhostTextJSCodeEditorInput", {detail: {text: value}});',
                    'ghostTextAceDiv.dispatchEvent(inputEvent);',
                    '});',
                    'ghostTextAceDiv.addEventListener("GhostTextDoFocus", function(e) {',
                    'ghostTextAceEditor.focus();',
                    '});',
                    'ghostTextAceEditor.on("focus", function(e) {',
                    'var value = ghostTextAceEditorSession.getValue();',
                    'var focusEvent = new CustomEvent("GhostTextJSCodeEditorFocus", {detail: {text: value}});',
                    'ghostTextAceDiv.dispatchEvent(focusEvent);',
                    '});',
                    '})();'
                ].join('\n');
            };

            Detector.prototype.trySingleElement = function () {
                var that = this;
                if (this.inputAreaElements.length === 1) {
                    var inputArea = this.inputAreaElements[0];
                    inputArea.focusEvent(that.onFocusCB);
                    inputArea.focus();

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

            Detector.prototype.injectScript = function (document, javaScript) {
                console.log(['injectScript', javaScript]);
                var head = document.getElementsByTagName('head')[0];
                var script = document.createElement('script');
                script.setAttribute('type', 'text/javascript');
                script.innerText = javaScript;
                head.appendChild(script);
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
        var TextArea = (function () {
            function TextArea() {
                this.textArea = null;
                this.textChangedEventCB = null;
                this.selectionChangedEventCB = null;
                this.removeEventCB = null;
                this.focusEventCB = null;
                this.unloadEventCB = null;
                this.customEvent = null;
                this.inputEventListener = null;
                this.focusEventListener = null;
                this.beforeUnloadListener = null;
                this.elementRemovedListener = null;
            }
            TextArea.prototype.bind = function (domElement) {
                this.textArea = domElement;
                var that = this;

                this.focusEventListener = function (e) {
                    if (that.focusEventCB) {
                        that.focusEventCB(that);
                    }
                };
                this.textArea.addEventListener('focus', this.focusEventListener, false);

                this.inputEventListener = function (e) {
                    if (e.detail && e.detail['generatedByGhostText']) {
                        return;
                    }

                    console.log(e);

                    if (that.textChangedEventCB) {
                        that.textChangedEventCB(that, that.getText());
                    }
                };
                this.textArea.addEventListener('input', this.inputEventListener, false);

                this.elementRemovedListener = function (e) {
                    if (that.textChangedEventCB) {
                        that.textChangedEventCB(that, that.getText());
                    }
                };
                this.textArea.addEventListener('DOMNodeRemovedFromDocument', this.elementRemovedListener, false);

                this.beforeUnloadListener = function (e) {
                    if (that.unloadEventCB) {
                        that.unloadEventCB(that);
                    }
                };
                window.addEventListener('beforeunload', this.beforeUnloadListener);

                this.customEvent = InputArea.StandardsCustomEvent.get('input', { detail: { generatedByGhostText: true } });

                this.highlight();
            };

            TextArea.prototype.unbind = function () {
                this.textArea.removeEventListener('focus', this.focusEventListener);
                this.textArea.removeEventListener('input', this.inputEventListener);
                this.textArea.removeEventListener('DOMNodeRemovedFromDocument', this.elementRemovedListener);
                window.removeEventListener('beforeunload', this.beforeUnloadListener);
                this.removeHighlight();
            };

            TextArea.prototype.focus = function () {
                this.textArea.focus();

                var that = this;
                if (this.focusEventCB) {
                    that.focusEventCB(that);
                }
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

            TextArea.prototype.unloadEvent = function (callback) {
                this.unloadEventCB = callback;
            };

            TextArea.prototype.getText = function () {
                return this.textArea.value;
            };

            TextArea.prototype.setText = function (text) {
                this.textArea.value = text;

                this.textArea.dispatchEvent(this.customEvent);
            };

            TextArea.prototype.getSelections = function () {
                return new InputArea.Selections([new InputArea.Selection(this.textArea.selectionStart, this.textArea.selectionEnd)]);
            };

            TextArea.prototype.setSelections = function (selections) {
                var selection = selections.getMinMaxSelection();
                this.textArea.selectionStart = selection.start;
                this.textArea.selectionEnd = selection.end;
            };

            TextArea.prototype.buildChange = function () {
                return new InputArea.TextChange(this.getText(), this.getSelections().getAll());
            };

            TextArea.prototype.highlight = function () {
                this.textArea.setAttribute('style', 'transition: box-shadow 1s cubic-bezier(.25,2,.5,1); boxShadow: "#00ADEE" 0 0 20px 5px inset');
            };

            TextArea.prototype.removeHighlight = function () {
                this.textArea.setAttribute('style', '');
            };
            return TextArea;
        })();
        InputArea.TextArea = TextArea;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var JSCodeEditor = (function () {
            function JSCodeEditor() {
                this.jsCodeEditorDiv = null;
                this.textChangedEventCB = null;
                this.selectionChangedEventCB = null;
                this.removeEventCB = null;
                this.focusEventCB = null;
                this.unloadEventCB = null;
                this.inputEventListener = null;
                this.focusEventListener = null;
                this.beforeUnloadListener = null;
                this.elementRemovedListener = null;
                this.currentText = '';
            }
            JSCodeEditor.prototype.bind = function (domElement) {
                this.jsCodeEditorDiv = domElement;
                var that = this;

                this.inputEventListener = function (e) {
                    if (that.currentText == e.detail.text) {
                        return;
                    }

                    that.currentText = e.detail.text;

                    if (that.textChangedEventCB) {
                        that.textChangedEventCB(that, that.getText());
                    }
                };
                this.jsCodeEditorDiv.addEventListener('GhostTextJSCodeEditorInput', this.inputEventListener, false);

                this.focusEventListener = function (e) {
                    that.currentText = e.detail.text;

                    if (that.focusEventCB) {
                        that.focusEventCB(that);
                    }
                };
                this.jsCodeEditorDiv.addEventListener('GhostTextJSCodeEditorFocus', this.focusEventListener, false);

                this.beforeUnloadListener = function (e) {
                    if (that.unloadEventCB) {
                        that.unloadEventCB(that);
                    }
                };
                this.jsCodeEditorDiv.addEventListener('beforeunload', this.beforeUnloadListener);

                this.highlight();
            };

            JSCodeEditor.prototype.unbind = function () {
                this.jsCodeEditorDiv.removeEventListener('GhostTextJSCodeEditorFocus', this.focusEventListener);
                this.jsCodeEditorDiv.removeEventListener('GhostTextJSCodeEditorInput', this.inputEventListener);
                this.jsCodeEditorDiv.removeEventListener('beforeunload', this.beforeUnloadListener);
                this.removeHighlight();
            };

            JSCodeEditor.prototype.focus = function () {
                var gtDoFocusEvent = InputArea.StandardsCustomEvent.get('GhostTextDoFocus', {});
                window.dispatchEvent(gtDoFocusEvent);
            };

            JSCodeEditor.prototype.textChangedEvent = function (callback) {
                this.textChangedEventCB = callback;
            };

            JSCodeEditor.prototype.selectionChangedEvent = function (callback) {
                this.selectionChangedEventCB = callback;
            };

            JSCodeEditor.prototype.removeEvent = function (callback) {
                this.removeEventCB = callback;
            };

            JSCodeEditor.prototype.focusEvent = function (callback) {
                this.focusEventCB = callback;
            };

            JSCodeEditor.prototype.unloadEvent = function (callback) {
                this.unloadEventCB = callback;
            };

            JSCodeEditor.prototype.getText = function () {
                return this.currentText;
            };

            JSCodeEditor.prototype.setText = function (text) {
                if (this.currentText == text) {
                    return;
                }

                this.currentText = text;
                var details = { detail: { text: this.currentText } };
                var gtServerInputEvent = InputArea.StandardsCustomEvent.get('GhostTextServerInput', details);
                this.jsCodeEditorDiv.dispatchEvent(gtServerInputEvent);
            };

            JSCodeEditor.prototype.getSelections = function () {
                return new InputArea.Selections([new InputArea.Selection()]);
            };

            JSCodeEditor.prototype.setSelections = function (selections) {
            };

            JSCodeEditor.prototype.buildChange = function () {
                return new InputArea.TextChange(this.getText(), this.getSelections().getAll());
            };

            JSCodeEditor.prototype.highlight = function () {
            };

            JSCodeEditor.prototype.removeHighlight = function () {
            };
            return JSCodeEditor;
        })();
        InputArea.JSCodeEditor = JSCodeEditor;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
var GhostText;
(function (GhostText) {
    (function (InputArea) {
        var ContentEditable = (function () {
            function ContentEditable() {
                this.contentEditableElement = null;
                this.textChangedEventCB = null;
                this.selectionChangedEventCB = null;
                this.removeEventCB = null;
                this.focusEventCB = null;
                this.unloadEventCB = null;
                this.inputEventListener = null;
                this.focusEventListener = null;
                this.beforeUnloadListener = null;
            }
            ContentEditable.prototype.bind = function (domElement) {
                this.contentEditableElement = domElement;
                var that = this;

                this.focusEventListener = function (e) {
                    if (that.focusEventCB) {
                        that.focusEventCB(that);
                    }
                };
                this.contentEditableElement.addEventListener('focus', this.focusEventListener, false);

                this.inputEventListener = function (e) {
                    if (that.textChangedEventCB) {
                        that.textChangedEventCB(that, that.getText());
                    }
                };
                this.contentEditableElement.addEventListener('input', this.inputEventListener, false);

                this.beforeUnloadListener = function (e) {
                    if (that.unloadEventCB) {
                        that.unloadEventCB(that);
                    }
                };
                window.addEventListener('beforeunload', this.beforeUnloadListener);

                this.highlight();
            };

            ContentEditable.prototype.unbind = function () {
                this.contentEditableElement.removeEventListener('focus', this.focusEventListener);
                this.contentEditableElement.removeEventListener('input', this.inputEventListener);
                window.removeEventListener('beforeunload', this.beforeUnloadListener);
                this.removeHighlight();
            };

            ContentEditable.prototype.focus = function () {
                console.log('focus');
                this.contentEditableElement.focus();

                var that = this;
                if (this.focusEventCB) {
                    that.focusEventCB(that);
                }
            };

            ContentEditable.prototype.textChangedEvent = function (callback) {
                this.textChangedEventCB = callback;
            };

            ContentEditable.prototype.selectionChangedEvent = function (callback) {
                this.selectionChangedEventCB = callback;
            };

            ContentEditable.prototype.removeEvent = function (callback) {
                this.removeEventCB = callback;
            };

            ContentEditable.prototype.focusEvent = function (callback) {
                this.focusEventCB = callback;
            };

            ContentEditable.prototype.unloadEvent = function (callback) {
                this.unloadEventCB = callback;
            };

            ContentEditable.prototype.getText = function () {
                return this.contentEditableElement.innerHTML;
            };

            ContentEditable.prototype.setText = function (text) {
                this.contentEditableElement.innerHTML = text;
            };

            ContentEditable.prototype.getSelections = function () {
                return new InputArea.Selections([]);
            };

            ContentEditable.prototype.setSelections = function (selections) {
            };

            ContentEditable.prototype.buildChange = function () {
                return new InputArea.TextChange(this.getText(), this.getSelections().getAll());
            };

            ContentEditable.prototype.highlight = function () {
            };

            ContentEditable.prototype.removeHighlight = function () {
            };
            return ContentEditable;
        })();
        InputArea.ContentEditable = ContentEditable;
    })(GhostText.InputArea || (GhostText.InputArea = {}));
    var InputArea = GhostText.InputArea;
})(GhostText || (GhostText = {}));
