import { router, navigateTo } from '/static/js/Router.js';

export const categories = {
    ALL: {
        searchTypes: 'track,artist,album',
        path: ''
    },
    ARTISTS: {
        searchTypes: 'artist',
        path: '/artists'
    },
    TRACKS: {
        searchTypes: 'track',
        path: '/tracks'
    },
    ALBUMS: {
        searchTypes: 'album',
        path: '/albums'
    },
    ARTIST: {
        path: '/artist'
    },
    ALBUM: {
        path: '/album'
    }
}
const searchInput = document.querySelector('.input-container__search-input');
const navContainer = document.querySelector('.nav-container');
/*3 boolean values to determine if either of categories results have ended and should not be considered anymore*/
let tracksOver = true;
let artistsOver = true;
let albumsOver = true;
/*View always changes through router*/
let view;

/*Usually called when return/forward button is pressed*/
window.addEventListener('popstate', initPage);

document.addEventListener('DOMContentLoaded', async () => {
    document.body.addEventListener('click', async (e) => {
        if(e.target.matches('[data-link]')) {
            /*This is single-page application, so page doesn't reload and uses navigateTo to change url*/
            e.preventDefault();
            
            let prevActive = document.querySelector('.categories__caption--active');
            
            if(e.target.classList.contains('categories__caption') && !e.target.classList.contains('categories__caption--active')) {
                e.target.classList.add('categories__caption--active');
                view = await navigateTo(e.target.href + '?' + searchInput.value);
            }
            else {
                /*Happens when user clicks on logo or on already activated button to deactivate it*/
                e.target.classList.remove('categories__caption--active');
                view = await navigateTo('/?' + searchInput.value);
            }

            prevActive?.classList?.remove('categories__caption--active');
            
            /*Displaying results for the same query when category changes, but only if search is not empty*/
            if(searchInput.value) 
                fetchAndDisplay(searchInput.value, false, view.category.searchTypes);
        }
    });
    initPage();
    
    document.addEventListener('scroll', throttle(async () => {
        /*Using throttle function for scroll event to be called once a 200ms at max*/
        const tracksList = document.querySelector('.tracks-list');
        const artistsList = document.querySelector('.artists-list');
        const albumsList = document.querySelector('.albums-list');
        
        /*If the user is near the end of either category, if there are more results of it to be loaded and if there is an actual query,
        then displaying more results*/
        /*Last statement exists for this not to be activated when on an album's/artist's personal page*/
        if (((tracksList?.scrollHeight - window.innerHeight < window.scrollY + 1000 && !tracksOver) ||
                (artistsList?.scrollHeight - window.innerHeight < window.scrollY + 1000 && !artistsOver) ||
                (albumsList?.scrollHeight - window.innerHeight < window.scrollY + 1000 && !albumsOver)) && view.params.query) {
            fetchAndDisplay(searchInput.value, true, view.category.searchTypes);        
        }
        
        if(window.scrollY > 250) 
            navContainer.style.backgroundColor = 'rgb(11,11,11)';
        else
            navContainer.style.backgroundColor = 'rgb(41,41,41)';
    }, 200));
    
    navContainer.addEventListener('transitionend', (e) => {
        /*Detecting the transition from mid to top left of the page, excluding unwanted triggers*/
        if(navContainer.classList.contains('nav-container--sticky'))
            return;
        if(!e.target.classList.contains('nav-container'))
            return;

        /*Initially nav container has position: absolute for transition to exist*/
        navContainer.classList.add('nav-container--sticky');
    });

    const processInput = debounce(async () => {     
        /*Using debounce function on user input for this function to be called only if user hasn't typed anything for 250ms*/
        
        moveLogoToTopLeft();

        /*Getting needed path from current active caption,
        using view.category.path will fail when user will try to search for something while on artist/album personal page*/
        let path = document.querySelector('.categories__caption--active')?.href.split('/')[3] || '';       
        if(searchInput.value) {
            /*Displaying results if there is something in search input*/
            view = await navigateTo('/' + path + '?' + searchInput.value);
            fetchAndDisplay(searchInput.value, false, view.category.searchTypes); 
        }
        else {
            /*Else navigating to the root of current category*/
            document.title = searchInput.value + "NORM MUZLO";
            view = await navigateTo('/' + path);
        }
                
    }, 250);

    searchInput.addEventListener('input', async ()=> {
        processInput();  
    });

    document.querySelector('.lyrics-tooltip__caption').addEventListener('click', () => {
        if(document.querySelector('.lyrics-tooltip').classList.contains('lyrics-tooltip--active'))
            document.querySelector('.lyrics-tooltip').classList.remove('lyrics-tooltip--active');
        else
            document.querySelector('.lyrics-tooltip').classList.add('lyrics-tooltip--active');
    });
});

async function initPage() {
    view = await router();
    if(view.params.query) {
        moveLogoToTopLeft();
        searchInput.value = view.params.query;        
        /*If initially there is query in url, then immediately displaying search results*/
        
        fetchAndDisplay(searchInput.value, false, view.category.searchTypes); 
    }
    else if(view.params.id) {
        moveLogoToTopLeft();
        searchInput.value = '';
        /*If initially there is id, displaying either artist or album(determined by url) by id*/
       
        if(view.category.path === '/artist') 
            fetchAndDisplayArtist(view.params.id);
        else 
            fetchAndDisplayAlbum(view.params.id);
    }
    else {
        /*Otherwise search bar is being cleared*/
        searchInput.value = '';
    }
    
    chooseActiveCategory();
}

async function fetchAndDisplay(query, searchNext, searchTypes) { 
    document.title = query + " - Search";

    document.body.classList.add('loading');
    const data = await fetchSearchResults(query, searchNext, searchTypes);     
    displaySearchResults(data, searchNext);
}

async function fetchAndDisplayAlbum(id) {
    document.body.classList.add('loading');  
    const data = await fetchAlbumInfo(id);
    displayAlbumInfo(data);
}

async function fetchAndDisplayArtist(id) {
    document.body.classList.add('loading');
    const data = await fetchArtistInfo(id);
    displayArtistInfo(data);
}

function moveLogoToTopLeft() {
    navContainer.classList.remove('nav-container--middle');
    document.querySelector('.logo').classList.remove('logo--middle');
}

function chooseActiveCategory() {
    /*Deactivating previously active category*/
    document.querySelector('.categories__caption--active')?.classList?.remove('categories__caption--active');

    let categoryCaptions = Array.from(document.querySelectorAll('.categories__caption'));
    /*Activating the category whose href pathname matches current link pathname*/
    let activeCategory = categoryCaptions.find(el => el.href.split('/')[el.href.split('/').length - 1] === location.pathname.slice(1));
    activeCategory?.classList?.add('categories__caption--active');
}

function chooseActiveTrack() {
    /*Getting track id from embedded player src*/
    let currentTrackId = document.querySelector('.embedded-player')?.src?.split('/')[5];
    /*Finding track where data-id attribute matches id*/
    let currentTrack = Array.from(document.querySelectorAll('.track')).find(tr => tr.getAttribute('data-id') === currentTrackId);
    currentTrack?.classList.add('track--active');
}

function addImagesLoadingAnim() {
    /*Each newly created image has a [data-img] attribute*/
    document.querySelectorAll('[data-img]').forEach(function (img) {
        /*While they are not fully loaded, changing their src to loading gif and removing data-img 
        to not to use them here in future*/
        let src = img.getAttribute("src");
        img.removeAttribute('data-img');
        img.setAttribute("src", "/static/images/load.gif");
        img.addEventListener("load", () => { 
            /*Once they are loaded, their src is brought back*/
            img.setAttribute("src", src);
        });      
    });
}

async function fetchSearchResults(query, searchNext, searchTypes) {    
    /*Sending request to server side to fetch results*/
    let res = await fetch(`/search`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query,
            searchNext,
            searchTypes
        })
    });
    let data = await res.json();
    return data;
}

async function fetchLyrics(artists, title) {
    let res = await fetch('/lyrics', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            artist: artists.split(', ')[0], //Searching only for first artist because i think this way lyrics are being found better
            title
        })
    });
    let data = await res.json();

    return {...data, title, artists};
}

async function fetchAlbumInfo(id) {
    let res = await fetch('/album', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
    });
    let data = await res.json();

    return data;
}

async function fetchArtistInfo(id) {
    let res = await fetch('/artist', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
    });
    let data = await res.json();

    return data;
}

async function displayAlbumInfo(data) {
    /*Creating separate element to contain information about album*/
    let albumDiv = document.createElement('div');
    albumDiv.classList.add('album');
    albumDiv.classList.add('album--personal');
    albumDiv.innerHTML = `
        <img loading="lazy" width="120" height="120" class="album__img" src="${data.images[0]?.url || "/static/images/placeholder.png"}" data-img>
        <div class="album__info">
            <div class="album__duration-n-tracks">
                <p class="album__tracks-amount">${data.total_tracks} tracks</p>
                <p class="album__duration">${data.durationString}</p>
            </div>
            <p class="album__name">${data.name}</p>
            <p class="album__artists">${data.artists.items.map(a => a.name).join(', ')}</p>
        </div>
    `;
    document.querySelector('.container').insertBefore(albumDiv, document.querySelector('.search-results'));

    document.title = data.name;

    displaySearchResults(data, false);
}

async function displayArtistInfo(data) {
    /*Creating separate element to contain information about album*/
    let artistDiv = document.createElement('div');
    artistDiv.classList.add('artist');
    artistDiv.classList.add('artist--personal');
    artistDiv.innerHTML = `
        <img loading="lazy" width="120" height="120" class="artist__img" src="${data.images[0]?.url || "/static/images/placeholder.png"}" data-img>
        <div class="artist__info">    
            <p class="artist__name">${data.name}</p>
            <p class="artist__genres">${data.genres.join(', ')}</p>
        </div>
    `;
    document.querySelector('.container').insertBefore(artistDiv, document.querySelector('.search-results'));

    document.title = data.name;
    
    displaySearchResults(data, false);
}

async function displaySearchResults(data, searchNext) {
    const tracks = data.tracks;
    const artists = data.artists;
    const albums = data.albums;
    /*If next link doesn't exist, then category results have ended*/
    tracksOver = tracks?.next === null;
    artistsOver = artists?.next === null;
    albumsOver = albums?.next === null;

    if(!searchNext) {
        /*Clearing categories results if they are not getting appended to previous ones*/
        if(document.querySelector('.tracks-list')?.children?.length)
            document.querySelector('.tracks-list').innerHTML = '';
        if(document.querySelector('.artists-list')?.children?.length)
            document.querySelector('.artists-list').innerHTML = '';
        if(document.querySelector('.albums-list')?.children?.length)
            document.querySelector('.albums-list').innerHTML = '';
    }
    if(tracks?.items?.length) { 
        for(let tr of tracks.items) {
            let trackElem = document.createElement('div');
            trackElem.setAttribute('class', 'track');
            trackElem.setAttribute('data-id', tr.id);
            let durInMinutes = tr.duration_ms / 60000;
            let remainingSeconds = Math.floor((durInMinutes - Math.floor(durInMinutes)) * 60);
            trackElem.innerHTML = `
                <img loading="lazy" width="64" height="64" class="track__img" src="${tr.album.images[1]?.url || "/static/images/placeholder.png"}" data-img>
                <div class="track__info">
                    <p class="track__name">${tr.name}</p>
                    <p class="track__artists">${tr.artists.length < 8 ? tr.artists.map(a => a.name).join(', ') : tr.artists.slice(0, 7).map(a => a.name).join(', ') + '...'}</p>
                    <p class="track__duration">${Math.floor(durInMinutes)}:${(remainingSeconds < 10 ? '0' : '') + remainingSeconds}</p>
                </div>
            `;          
            trackElem.addEventListener('click', (e) => trackClickHandler(e, tr));
            document.querySelector('.tracks-list').append(trackElem);
        }
    }
    if(artists?.items?.length) {
        for(let ar of artists.items) {
            let artistElem = document.createElement('div');
            artistElem.setAttribute('class', 'artist');
            artistElem.setAttribute('data-id', ar.id);
            artistElem.innerHTML = `
                <img loading="lazy" width="120" height="120" class="artist__img" src="${ar.images[0]?.url || "/static/images/placeholder.png"}" data-img>
                <div class="artist__info">
                    <p class="artist__name">${ar.name}</p>
                </div>
            `;
            artistElem.addEventListener('click', (e) => artistClickHandler(e));
            document.querySelector('.artists-list').append(artistElem);
        }
    }
    if(albums?.items?.length) {
        for(let al of albums.items) {
            let albumElem = document.createElement('div');
            albumElem.setAttribute('class', 'album');
            albumElem.setAttribute('data-id', al.id);
            albumElem.innerHTML = `
                <img loading="lazy" width="120" height="120" class="album__img" src="${al.images[0]?.url || "/static/images/placeholder.png"}" data-img>
                <div class="album__info">
                    <p class="album__name">${al.name}</p>
                    <p class="album__artists">${al.artists.length < 3 ? al.artists.map(a => a.name).join(', ') : al.artists.slice(0, 2).map(a => a.name).join(', ') + '...'}</p>
                </div>
            `;
            albumElem.addEventListener('click', (e) => albumClickHandler(e));
            document.querySelector('.albums-list').append(albumElem);
        }
    }

    /*Searching for track that is currently active and making choosing it*/
    chooseActiveTrack();
    addImagesLoadingAnim();  
    /*All the elements have loaded, removing loading class from body*/
    document.body.classList.remove('loading');
}

async function artistClickHandler(e) {
    document.title = e.target.querySelector('.artist__name').innerHTML;

    let id = e.target.getAttribute('data-id');
    view = await navigateTo('/artist/' + id);
    fetchAndDisplayArtist(id);
}

async function albumClickHandler(e) {
    document.title = e.target.querySelector('.album__name').innerHTML;

    let id = e.target.getAttribute('data-id');
    view = await navigateTo('/album/' + id);
    fetchAndDisplayAlbum(id);
}

function trackClickHandler(e, tr) {
    document.querySelector('.embedded-player')?.remove();

    if(!e.target.classList.contains('track--active')) {
        /*Creating new iframe and not changing src of the previous one
        because i don't want a new entry to history that is being created when changing src*/
        let player = document.createElement('iframe');
        player.classList.add('embedded-player');
        player.setAttribute('width', '300');
        player.setAttribute('height', '80');
        player.setAttribute('frameborder', '0');
        player.setAttribute('allowtransparency', 'true');
        player.setAttribute('allow', 'encrypted-media');
        
        player.src = `https://open.spotify.com/embed/track/${tr.id}`;

        document.body.insertBefore(player, document.querySelector('.lyrics-tooltip'));
        /*Making previously active track non-active*/
        document.querySelector('.track--active')?.classList?.remove('track--active');
        e.target.classList.add('track--active');

        handleLyrics(e);
    }
    else {
        
        document.querySelector('.lyrics-tooltip').style.display = 'none';
        e.target.classList.remove('track--active');
    }
}

async function handleLyrics(e) {
    let artists = e.target.querySelector('.track__artists').innerText;
    let title = e.target.querySelector('.track__name').innerText;

    document.querySelector('.lyrics-tooltip__text').innerText = "Loading..";
    document.querySelector('.lyrics-tooltip').style.display = 'block';

    let data = await fetchLyrics(artists, title);
    
    /*Checking if fetched lyrics are still valid for the track that is currently active*/
    /*Adressing the error when lyrics could be returned when user has already chosen another track*/
    const activeTrack = document.querySelector('.track--active');
    if(activeTrack?.querySelector('.track__name')?.innerText === data.title && activeTrack?.querySelector('.track__artists').innerText === data.artists)
        document.querySelector('.lyrics-tooltip__text').innerText = data.lyrics;
}

function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args) }, delay);
    }
}

function throttle (callback, limit) {
    let wait = false;                  // Initially, we're not waiting
    return function () {               // We return a throttled function
        if (!wait) {                   // If we're not waiting
            callback();           // Execute users function
            wait = true;               // Prevent future invocations
            setTimeout(function () {   // After a period of time
                wait = false;          // And allow future invocations
            }, limit);
        }
    }
}