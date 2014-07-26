
module GhostText.InputArea {

    /**
     * Implementation for a JS code editor signaling through window events to the content script.
     *
     * @licence The MIT License (MIT)
     * @author Guido Krömer <mail 64 cacodaemon 46 de>
     */
    export class JSCodeEditor implements IInputArea {

        /**
         * Callback fired on an input event.
         */
        private textChangedEventCB: (inputArea: IInputArea, text: string) => void = null;

        /**
         * Callback fired on an select event.
         */
        private selectionChangedEventCB: (inputArea: IInputArea, selections: Selections) => void = null;

        /**
         * Callback fired on an remove from DOM event.
         */
        private removeEventCB: (inputArea: IInputArea) => void = null;

        /**
         * Callback fired on an element focus event.
         */
        private focusEventCB: (inputArea: IInputArea) => void = null;

        /**
         * Callback fired when the element's documents gets unloaded.
         */
        private unloadEventCB: (inputArea: IInputArea) => void = null;

        /**
         * Custom event fired on text change.
         */
        private inputEventListener: EventListener = null;

        /**
         * Custom event fired on focus.
         */
        private focusEventListener: EventListener = null;

        /**
         * Fired when the elements page gets reloaded.
         */
        private beforeUnloadListener: EventListener = null;

        /**
         * Fired when the elements get removed from dom.
         */
        private elementRemovedListener: EventListener = null;

        /**
         * The elements current text.
         */
        private currentText: string = '';

        public bind(domElement: HTMLElement): void {
            var that = this;

            this.inputEventListener = function (e: CustomEvent) {
                that.currentText = e.detail.text;

                if (that.textChangedEventCB) {
                    that.textChangedEventCB(that, that.getText());
                }
            };
            window.addEventListener('GhostTextJSCodeEditorInput', this.inputEventListener, false);


            this.focusEventListener = function (e: CustomEvent) {
                that.currentText = e.detail.text;

                if (that.focusEventCB) {
                    that.focusEventCB(that);
                }
            };
            window.addEventListener('GhostTextJSCodeEditorFocus', this.focusEventListener, false);

            this.beforeUnloadListener = function (e) {
                if (that.unloadEventCB) {
                    that.unloadEventCB(that);
                }
            };
            window.addEventListener('beforeunload', this.beforeUnloadListener);

            this.highlight();
        }

        public unbind(): void {
            window.removeEventListener('GhostTextJSCodeEditorFocus', this.focusEventListener);
            window.removeEventListener('GhostTextJSCodeEditorInput', this.inputEventListener);
            window.removeEventListener('beforeunload', this.beforeUnloadListener);
            this.removeHighlight();
        }

        public focus(): void {
            //TODO
        }

        public textChangedEvent(callback:(inputArea: IInputArea, text: string) => void): void {
            this.textChangedEventCB = callback;
        }

        public selectionChangedEvent(callback:(inputArea: IInputArea, selections: Selections) => void): void {
            this.selectionChangedEventCB = callback;
        }

        public removeEvent(callback:(inputArea: IInputArea) => void): void {
            this.removeEventCB = callback;
        }

        public focusEvent(callback:(inputArea: IInputArea) => void): void {
            this.focusEventCB = callback;
        }

        public unloadEvent(callback:(inputArea: IInputArea) => void): void {
            this.unloadEventCB = callback;
        }

        public getText(): string {
            return this.currentText;
        }

        public setText(text: string): void {
            this.currentText = text;
            var details = { detail: { text: this.currentText} };
            var gtServerInputEvent = <Event>StandardsCustomEvent.get('GhostTextServerInput', details);
            window.dispatchEvent(gtServerInputEvent);
        }

        public getSelections(): Selections {
            return new Selections([new Selection()]);
        }

        public setSelections(selections: Selections): void {
            //TODO
        }

        public buildChange(): TextChange {
            return new TextChange(
                this.getText(),
                this.getSelections().getAll()
            );
        }

        /**
         * Adds some nice highlight styles.
         */
        private highlight(): void {
            //TODO
        }

        /**
         * Removes the highlight styles.
         */
        private removeHighlight(): void {
            //TODO
        }
    }
}