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
            var textAreas: NodeListOf<HTMLTextAreaElement> = document.getElementsByTagName('textarea');

            for (var i = 0; i < textAreas.length; i++) {
                var inputArea = new TextArea();
                inputArea.bind(textAreas[i]);

                this.inputAreaElements.push(inputArea)
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
    }
}