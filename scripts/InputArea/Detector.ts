module GhostText.InputArea {
    /**
     * Detects supported input elements in the given DOM.
     *
     * @licence The MIT License (MIT)
     * @author Guido Krömer <mail 64 cacodaemon 46 de>
     */
    export class Detector {
        /**
         * List of found input elements.
         */
        private inputAreaElements: Array<IInputArea>;

        /**
         * Raised when an element got focused or if only one element was found.
         */
        private onFocusCB: (inputArea: IInputArea) => void = null;

        public constructor() {
            this.inputAreaElements = [];
        }

        /**
         * Detects supported element in the given DOM.
         *
         * @param document
         * @return {number} Number of detected elements.
         */
        public detect(document: HTMLDocument): number {
            if (this.onFocusCB === null) {
                throw 'On focus callback is missing!';
            }

            this.addTextAreas(document);
            this.addContentEditableElements(document);
            this.addAceElements(document);

            if (this.inputAreaElements.length === 0) {
                throw 'No supported elements found!';
            }

            if (this.trySingleElement()) {
                return 1;
            }

            this.tryMultipleElements();

            return this.inputAreaElements.length;
        }

        /**
         * Sets the on focus element listener.
         *
         * @param callback The event listener.
         */
        public focusEvent(callback:(inputArea: IInputArea) => void): void {
            this.onFocusCB = callback;
        }

        /**
         * Adds all text area elements found in the dom.
         *
         * @param document
         */
        private addTextAreas(document: HTMLDocument): void {
            var textAreas: NodeListOf<HTMLTextAreaElement> = document.body.getElementsByTagName('textarea');

            for (var i = 0; i < textAreas.length; i++) {
                var inputArea = new TextArea();
                inputArea.bind(textAreas[i]);
                this.inputAreaElements.push(inputArea)
            }
        }

        /**
         * Adds all content editable elements found in the dom.
         *
         * @param document
         */
        private addContentEditableElements(document: HTMLDocument): void {
            var contentEditables: NodeList = document.body.querySelectorAll('[contenteditable=\'true\']');

            for (var i = 0; i < contentEditables.length; i++) {
                console.log(contentEditables[i]);
                var inputArea = new ContentEditable();
                inputArea.bind(<HTMLDivElement>contentEditables[i]);
                this.inputAreaElements.push(inputArea)
            }
        }

        private addAceElements(document: HTMLDocument): void {
            var aceEditors: NodeList = document.body.querySelectorAll('.ace_editor');
            //console.log(aceEditors[0].getAttribute('id'));

            var script = [
                'var ghostTextAceEditor = ace.edit(document.querySelector(\'.ace_editor\')).getSession()',
                'var body = document.getElementsByTagName(\'body\')[0]',
                'var textArea = document.createElement(\'textarea\')',
                'textArea.setAttribute(\'id\', \'ghost-text-ace-text-area\')',
                'textArea.innerText = ghostTextAceEditor.getValue()',
                'body.appendChild(textArea)',
                'ghostTextAceEditor.on(\'change\', function(e) { textArea.innerText = ghostTextAceEditor.getValue() })',
                'textArea.addEventListener(\'input\', function () { ghostTextAceEditor.setValue(textArea.value) }, false);'
            ];

            for (var i = 0; i < aceEditors.length; i++) {
                GhostText.InputArea.Detector.injectScript(document, script.join(';'))
            }
        }

        /**
         * If only one supported element was found the onFocus callback get raised automatically.
         * @return {boolean}
         */
        private trySingleElement(): boolean {
            var that = this;
            if (this.inputAreaElements.length === 1) {
                var inputArea: IInputArea = this.inputAreaElements[0];
                inputArea.focusEvent(that.onFocusCB);
                inputArea.focus();

                return true;
            }

            return false;
        }

        /**
         * Binds the onFocus callback on all found elements and wits for the first focus.
         */
        private tryMultipleElements(): void {
            var that = this;
            for (var i = 0; i < this.inputAreaElements.length; i++) {
                this.inputAreaElements[i].focusEvent(function (inputArea: IInputArea) {
                    for (var j = 0; j < that.inputAreaElements.length; j++) { //unbind all others
                        if (that.inputAreaElements[j] !== inputArea) {
                            that.inputAreaElements[j].unbind();
                        }
                    }

                    that.onFocusCB(inputArea);
                });
            }
        }

        /**
         * Injects the given JavaScript to the specified dom.
         *
         * @param document The DOM document.
         * @param javaScript The script to inject as string.
         */
        private static injectScript(document: HTMLDocument, javaScript: string): void {
            var head: HTMLHeadElement = document.getElementsByTagName('head')[0];
            var script: HTMLScriptElement = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.innerText = javaScript;
            head.appendChild(script);
        }
    }
}