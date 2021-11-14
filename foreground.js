// GLOBALS VARIABLES
let HTTP = new XMLHttpRequest();
let DATE = new Date();

const CLIENT_SECRET = '';
const CLIENT_ID = '';
const SCOPE = ['user-private-read', 'playlist-modify-private', 'playlist-modify-public'];
const BASEURL = 'https://flask-chrome-extension.herokuapp.com/';
const redirectUri = chrome.identity.getRedirectURL();

let ACCESS_TOKEN = chrome.storage.local.get(["access_token"], data => {ACCESS_TOKEN = data.access_token});
let trackID = null;


/* ----------- HTML ----------- */
/* listens divs and buttons from index.html */
// listens to the button in index
document.querySelector('#playlistBTN').addEventListener('click', function () {

    if (!document.getElementById('playlistDIV').hasChildNodes())
        spotify_check_token();

});


document.querySelector('#playlistDIV').addEventListener('click', function (c) {

    if (c.target.id !== 'playlistBTN') {
        let playlistHAS = spotify_playlist_has_track(c.target.id);
        if (playlistHAS === false)
            spotify_add_playlist(c.target.id, trackID);
        else{
            let answer = window.confirm('You already have this music added in this playlist. Want to add it anyway?');
            if (answer)
                spotify_add_playlist(c.target.id, trackID);
        }

    }

    window.close();
});


// creates a list of playlists from user Spotify account
// hasID ** boolean, if the playlist clicked already has the track
// playlistCLICKED ** number, if the for() loop ran till the user playlist clicked
function html_append_playlist() {

    // returns playlists
    let data = spotify_playlist_me();
    let items = data['items'];

    // print each item from a list and creates a link to add the music into
    let d = document.getElementById('playlistDIV');

    // fill the children of a div with playlist's names
    for (let i = 0; i < data['items'].length; i++) {
        // create <a> tags and add them in div parent
        let a = document.createElement('a');
        let itemNAME = items[i]['name'];
        let playlistID = items[i]['id'];
        a.innerHTML = `<a id=${playlistID} href="" ">${itemNAME}</a><br/>`
        d.appendChild(a);
    }

}


/* ----------- YOUTUBE SCRIPTS ----------- */
// a function that receives a url and returns the video's name
function youtube_get_name(url){

    // filter the id from Youtube tab
    let ytbID = youtube_get_id(url);

    // send the youtube item ID and returns the item name
    return request_get(BASEURL + 'ytb/' + ytbID);

}

// get only the ID of a Youtube video
function youtube_get_id(url){

    url = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return (url[2] !== undefined) ? url[2].split(/[^0-9a-z_\-]/i)[0] : url[0];

}


/* ----------- SPOTIFY SCRIPTS ----------- */
// runs login page authorization for extension's use
function spotify_auth() {

    chrome.identity.launchWebAuthFlow({
        "url": `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${SCOPE}`,
        'interactive': true,
    }, redirect_url => {
        if (redirect_url.includes('callback?error=access_denied'))
            return ("error");
        else {
            let params = new URL(redirect_url);
            ACCESS_TOKEN = params.searchParams.get('code');
            spotify_request_token();
        }
    });

}

// sends a auth and receives an access token
function spotify_request_token(){

    // POST call starts
    HTTP.open("POST", 'https://accounts.spotify.com/api/token', false);
    HTTP.setRequestHeader('Authorization', 'Basic ' + (window.btoa(CLIENT_ID + ':' + CLIENT_SECRET)));
    HTTP.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    // sends the auth acquired from last function
    let body = {
        'grant_type': 'authorization_code',
        'code': ACCESS_TOKEN,
        'redirect_uri': redirectUri
    };

    let formBody = [];
    for (let property in body) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(body[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    HTTP.send(formBody);

    // response receives a access token with refresh token and an "expires at" time
    let response = JSON.parse(HTTP.response);
    ACCESS_TOKEN = response['access_token'];

    // sets a new time for token expiration
    DATE = DATE.setMilliseconds(3600000);

    // data storage
    chrome.storage.local.set({"access_token": response['access_token']});
    chrome.storage.local.set({"refresh_token": response['refresh_token']});
    chrome.storage.local.set({"expires_at": DATE});

}

// exchange the actual token for a new one
function refresh_token() {

    // search in local storage for the refresh token data
    chrome.storage.local.get(["refresh_token"], data => {

        // prepares for a POST call to acquire a new access token
        HTTP.open("POST", 'https://accounts.spotify.com/api/token', false);
        HTTP.setRequestHeader('Authorization', 'Basic ' + (window.btoa(CLIENT_ID + ':' + CLIENT_SECRET)));
        HTTP.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        let body = {
            'grant_type': 'refresh_token',
            'refresh_token': data.refresh_token
        };

        let formBody = [];
        for (let property in body) {
            let encodedKey = encodeURIComponent(property);
            let encodedValue = encodeURIComponent(body[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");

        HTTP.send(formBody);

        // get a brand new access token
        let response = JSON.parse(HTTP.response);
        ACCESS_TOKEN = response['access_token'];

        DATE = DATE.setMilliseconds(3600000);

        chrome.storage.local.set({"access_token": response['access_token']});
        chrome.storage.local.set({"expires_at": DATE});

    });

}

// checks for the access token, to see if it's still up-to-date
function spotify_check_token() {

    chrome.storage.local.get(["expires_at"], data => {

        // if the app hasn't been opened or the browser got its cache cleaned
        if (data.expires_at === undefined) {
            spotify_auth();
        }
        // else it only needs a new refresh token 'cause its actual got expired
        else if (data.expires_at < time_is_now()) {
            refresh_token();
        }
        html_append_playlist();

    });

}

// Standard GET request to Spotify API endpoint
function spotify_get_request(urlto){

    HTTP.open('GET', urlto, false);
    HTTP.setRequestHeader('Authorization', 'Bearer ' + ACCESS_TOKEN);
    HTTP.send();
    let data = HTTP.response;
    return JSON.parse(data);

}

// a GET request to Spotify current user playlists endpoint to retrieve list of playlists
function spotify_playlist_me() {

    return spotify_get_request('https://api.spotify.com/v1/me/playlists');

}

// request to API endpoint to retrieve Spotify track ID
function spotify_get_trackid(musicNAME){

    trackID = request_get(BASEURL + 'scrap/' + musicNAME);

}

// check if the current user has a track in his playlist
function spotify_playlist_has_track(playlistID) {

    // response receives a list of actual clicked playlist tracks
    let response = spotify_get_request('https://api.spotify.com/v1/playlists/' + playlistID + '/tracks');
    let tracksLIST = response['items'];
    for (let i = 0; i < tracksLIST.length; i++) {
        if (tracksLIST[i]['track']['id'] === trackID){
            console.log("found!")
            return true;
        }
    }
    return false;

}

// POST request to Spotify API to add music in clicked playlist
function spotify_add_playlist(playlistID, trackID){

    let position = 0;
    let uri = 'spotify:track:' + trackID

    HTTP.open("POST", 'https://api.spotify.com/v1/playlists/'+playlistID+'/tracks?position='+position+'&uris='+uri, false);
    HTTP.setRequestHeader('Authorization', 'Bearer ' + ACCESS_TOKEN);
    let data = `{
   "uris": [
    "${uri}"
  ],
  "position": ${position}
}`;
    HTTP.send(data);

}

// create an embed <iframe> Spotify track preview
function spotify_embed(){

    let src = 'https://open.spotify.com/embed/track/'+trackID;
    let d = document.getElementById('frameSPOTIFY');
    let i = document.createElement("iframe");
    d.innerHTML = "<h3>Check if this is the right song </h3>";
    i.src = src;
    i.allow = "encrypted-media";
    i.allowTransparency = "true";
    i.height = "80";
    i.width = '300';
    i.loading = 'lazy';
    i.className = 'classframespotify'
    d.appendChild(i);

}


// do GET requests to my API endpoints
// page is the entire URL you want to send request
function request_get(page) {

    HTTP.open("GET", page, false);
    HTTP.send();
    if (HTTP.status === 200)
        return HTTP.response;

}


// returns the actual time, in milliseconds
function time_is_now(){

    DATE = new Date();
    return DATE.getTime();

}


/* ----------- MAIN ----------- */
function main(url) {

    // verifies if the actual tab is a Youtube video page
    if (!url.valueOf().toString().includes("https://www.youtube.com/watch?"))
        document.getElementById("playlistDIV").innerText = "Invalid URL!";
    // if is a youtube tab
    else {
        console.log("got in")

        // musicNAME receives a name from youtube's content
        let musicNAME = youtube_get_name(url);

        // send the Youtube item name to search for it's Spotify ID
        spotify_get_trackid(musicNAME);

        // if returned a value for Spotify track ID
        if (trackID !== undefined && trackID !== 'None') {

            // shows up a button to call user playlists
            document.getElementById('playlistBTN').removeAttribute('hidden');
            spotify_embed();

        }
        else
            document.getElementById("playlistDIV").innerText = "Content not found or invalid URl!";
    }

}
