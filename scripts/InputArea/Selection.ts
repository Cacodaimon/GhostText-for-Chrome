module GhostText.InputArea {
    /**
     * GhostText input area selection class.
     * Defines a selection with a start and an end.
     *
     * @licence The MIT License (MIT)
     * @author Guido Krömer <mail 64 cacodaemon 46 de>
     */
    export class Selection {
        /**
         * Creates an new selection instance.
         *
         * @param start The selection's start.
         * @param end The selection's start.
         */
        public constructor(public start: number = 0, public end: number = 0) {

        }
    }
}