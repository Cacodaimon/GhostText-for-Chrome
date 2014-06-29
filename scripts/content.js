chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request.textarea || request.textarea != 'connect') {
        return;
    }

    var connectTextarea = function (textarea) {
        GhostText.connectTextArea($(textarea), $('title').text(), request.id, window.location);
    };

    sendResponse({textarea: 'connecting'});
    var $textareas = $('textarea');
    var $focusedTextarea = $textareas.filter(':focus');
    if ($focusedTextarea.length) {
        console.log('Textarea already focused:', $focusedTextarea);
        connectTextarea($focusedTextarea);
    } else {
        console.log('Textareas found:', $textareas);
        switch  ($textareas.length) {
            case 0: alert('No textarea elements on this page'); break;
            case 1: connectTextarea($textareas); break;
            default:
                var connectAndForgetTheRest = function () {
                    console.log('User focused:', this);
                    connectTextarea(this);
                    $textareas.off('.ghost-text');
                };
                $textareas.on('focus.ghost-text', connectAndForgetTheRest);
        }
    }
});