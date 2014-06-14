chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request.textarea || request.textarea != 'connect') {
        return;
    }

    sendResponse({textarea: 'connecting'});

alert("Conn");
    $("textarea").focus(function () {
        alert("Focus");
        var textArea = $(this);
        textArea.unbind("focus");
        SublimeTextArea.connectTextarea($(this), $('title').text());
    });
});
