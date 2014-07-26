module GhostText.InputArea {
    /**
     * CustomEvent TS Workaround.
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
}