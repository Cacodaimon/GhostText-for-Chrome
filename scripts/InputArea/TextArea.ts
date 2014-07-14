/// <reference path="../../vendor/jquery.d.ts" />

module GhostText.InputArea {
    /**
     * Workaround.
     *
     * @see http://stackoverflow.com/questions/17571982/dispatching-custom-events#17575452
     */
    export class StandardsCustomEvent {
        static get(eventType: string, data: {}) {
            var customEvent = <any>CustomEvent;
            var event = new customEvent(eventType, data);
            return <CustomEvent> event;
        }
    }

    /**
     * Implementation for a text area element.
     *
     * @licence The MIT License (MIT)
     * @author Guido Krömer <mail 64 cacodaemon 46 de>
     */
    export class TextArea implements IInputArea {

        /**
         * The bind HTML text area element.
         */
        private textArea: HTMLTextAreaElement = null;

        /**
         * The jQuery representation of textArea.
         */
        private $textArea: JQuery = null;

        /**
         * Callback fired on an input event.
         */
        private textChangedEventCB: (inputArea: IInputArea, text: string) => void = null;

        /**
         * Callback fired on an select event.
         */
        private selectionChangedEventCB: (inputArea: IInputArea, selection: Selection) => void = null;

        /**
         * Callback fired on an remove from DOM event.
         */
        private removeEventCB: (inputArea: IInputArea) => void = null;

        /**
         * Callback fired on an  element focus event.
         */
        private focusEventCB: (inputArea: IInputArea) => void = null;

        /**
         * Custom event fired on text change.
         */
        private customEvent: Event = null;

        public bind(domElement: HTMLElement): void {
            this.textArea = <HTMLTextAreaElement>domElement;
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

            //TODO selection changed event

            this.$textArea.on('DOMNodeRemovedFromDocument.ghost-text', function (e) {
                if (that.removeEventCB) {
                    that.removeEventCB(that);
                }
            });

            this.customEvent = <Event>StandardsCustomEvent.get('CustomEvent',  { detail: { generatedByGhostText: true} })

            this.highlight();
        }

        public unbind(): void {
            this.$textArea.off('.ghost-text');
            this.removeHighlight();
        }

        public focus(): void {
            this.textArea.focus();
        }

        public textChangedEvent(callback:(inputArea: IInputArea, text: string) => void): void {
            this.textChangedEventCB = callback;
        }

        public selectionChangedEvent(callback:(inputArea: IInputArea, selection: Selection) => void): void {
            this.selectionChangedEventCB = callback;
        }

        public removeEvent(callback:(inputArea: IInputArea) => void): void {
            this.removeEventCB = callback;
        }

        public focusEvent(callback:(inputArea: IInputArea) => void): void {
            this.focusEventCB = callback;
        }

        public getText(): string {
            return this.$textArea.val();
        }

        public setText(text: string): void {
            this.$textArea.val(text);

            this.textArea.dispatchEvent(this.customEvent);
        }

        public getSelections(): Selections {
            //TODO
            return new Selections();
        }

        public setSelections(selections: Selections): void {
            var selection: Selection = selections.getMinMaxSelection();
            this.textArea.selectionStart = selection.start;
            this.textArea.selectionEnd   = selection.end;
        }

        /**
         * Adds some nice highlight styles.
         */
        private highlight(): void {
            this.$textArea.css({
                transition: 'box-shadow 1s cubic-bezier(.25,2,.5,1)',
                boxShadow: '#00ADEE 0 0 20px 5px inset'
            });
        }

        /**
         * Removes the highlight styles.
         */
        private removeHighlight(): void {
            this.$textArea.css({boxShadow: ''});
        }
    }
}