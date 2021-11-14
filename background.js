
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

// how to check the tab even if the extension is closed
// this could improve the performance
// let the page done with search and requests to when i click i wouldnt need to wait




