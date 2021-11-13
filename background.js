
window.onload = function () {
        chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
            if (tabs[0] !== undefined)
                try {
                    main(tabs[0].url);
                } catch (e) {
                    console.log(e)
                }
        });
}
// after execution, this is closing itself
// how to keep that open?

/*
while !== musica adicionada{
    keep running code?
    if clickout send message window.close()
}
 */


