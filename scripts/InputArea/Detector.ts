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

            this.addAceElements(document);
            this.addTextAreas(document);
            this.addContentEditableElements(document);

            if (this.inputAreaElements.length === 0) {
                return 0;
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
            var textAreas: NodeList = document.body.querySelectorAll('textarea:not(.ace_text-input)');

            for (var i = 0; i < textAreas.length; i++) {
                var inputArea = new TextArea();
                inputArea.bind(<HTMLTextAreaElement>textAreas[i]);
                this.inputAreaElements.push(inputArea);
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
                var inputArea = new ContentEditable();
                inputArea.bind(<HTMLDivElement>contentEditables[i]);
                this.inputAreaElements.push(inputArea);
            }
        }

        private addAceElements(document: HTMLDocument): void {
            var aceEditors: NodeList = document.body.querySelectorAll('.ace_editor');

            for (var i = 0; i < aceEditors.length; i++) {
                var aceEditor: HTMLDivElement = <HTMLDivElement>aceEditors[i];
                var id: string = aceEditor.getAttribute('id');
                if (id === null) {
                    id = 'generated-by-ghost-text-' + (Math.random() * 1e17);
                    aceEditor.setAttribute('id', id);
                }
                this.injectScript(document, this.buildAceScript(id), id);
                var inputArea = new JSCodeEditor();
                inputArea.bind(aceEditor);
                this.inputAreaElements.push(inputArea);
            }
        }

        /**
         * Builds the script injected into the page.
         *
         * @param id The ace editors id.
         * @return {string} The script to inject.
         */
        private buildAceScript(id): string {
            return [
                '(function() {',
                    'var ghostTextAceDiv = document.querySelector("#', id,'");',
                    'var ghostTextAceEditor = ace.edit(ghostTextAceDiv);',
                    'var ghostTextAceEditorSession = ghostTextAceEditor.getSession();',

                    'ghostTextAceDiv.addEventListener("GhostTextServerInput", function (e) {',
                        'ghostTextAceEditorSession.setValue(e.detail.text);',
                    '}, false);',

                    'ghostTextAceDiv.addEventListener("GhostTextDoFocus", function(e) {',
                        'alert("TTF");',
                        'ghostTextAceEditor.focus();',
                    '});',

                    'ghostTextAceDiv.addEventListener("GhostTextDoHighlight", function(e) {',
                        'var ghostTextAceScrollerDiv = ghostTextAceDiv.querySelector(".ace_scroller");',
                        'ghostTextAceScrollerDiv.style.transition = "box-shadow 1s cubic-bezier(.25,2,.5,1)";',
                        'ghostTextAceScrollerDiv.style.boxShadow = "rgb(0,173,238) 0 0 20px 5px inset";',
                    '});',

                    'ghostTextAceDiv.addEventListener("GhostTextRemoveHighlight", function(e) {',
                        'var ghostTextAceScrollerDiv = ghostTextAceDiv.querySelector(".ace_scroller");',
                        'ghostTextAceScrollerDiv.style.boxShadow = "";',
                    '});',

                    'ghostTextAceEditorSession.on("change", function(e) {',
                        'window.setTimeout(function () {', //ace fires the text change even before all content has been processed so getValue can contain only a part of the actually setted text
                            'var value = ghostTextAceEditorSession.getValue();',
                            'var inputEvent = new CustomEvent("GhostTextJSCodeEditorInput", {detail: {text: value}});',
                            'ghostTextAceDiv.dispatchEvent(inputEvent);',
                        '}, 100);',
                    '});',

                    'ghostTextAceEditor.on("focus", function(e) {',
                        'var value = ghostTextAceEditorSession.getValue();',
                        'var focusEvent = new CustomEvent("GhostTextJSCodeEditorFocus", {detail: {text: value}});',
                        'ghostTextAceDiv.dispatchEvent(focusEvent);',
                    '});',
                '})();'
            ].join('');

            //TODO unbind on readd, maybe this[i].parentElement.removeChild(this[i]); + DOMNodeRemovedFromDocument…
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
         * @param id The script tag's id.
         */
        private injectScript(document: HTMLDocument, javaScript: string, id: string): void {
            if (document.getElementById('ghost-text-injected-script-' + id) !== null) {
                return;
            }

            var head: HTMLHeadElement = document.getElementsByTagName('head')[0];
            var script: HTMLScriptElement = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.setAttribute('class', 'ghost-text-injected-script');
            script.setAttribute('id', 'ghost-text-injected-script-' + id);
            script.innerText = javaScript;
            head.appendChild(script);
        }
    }
}