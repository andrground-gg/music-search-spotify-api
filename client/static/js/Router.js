import Main from './views/Main.js';
import Tracks from './views/Tracks.js';
import Artists from './views/Artists.js';
import Albums from './views/Albums.js';
import Artist from './views/Artist.js';
import Album from './views/Album.js';

const navigateTo = async (url) => {
    history.pushState(null, null, url);
    let view = await router();
    return view;
}

const pathToRegex = path => new RegExp("^" + path.replace(/\//g, "\\/").replace(/\?/g, "\\?").replace(/:\w+/g, "(.+)") + "$");
/*Creating regex for current path to get parameters*/

const getParams = match => {
    const values = match.result.slice(1);
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(results => results[1]);

    return Object.fromEntries(keys.map((key, i) => {
        return [key, decodeURIComponent(values[i])];
    }));
}

const router = async () => {
    const routes = [
        { path: '/', view: Main },
        { path: '/?:query', view: Main },
        { path: '/artist/:id', view: Artist },
        { path: '/album/:id', view: Album },
        { path: '/tracks', view: Tracks },
        { path: '/tracks?:query', view: Tracks },
        { path: '/artists', view: Artists },
        { path: '/artists?:query', view: Artists },
        { path: '/albums', view: Albums },
        { path: '/albums?:query', view: Albums },
    ];

    //Test each route for potential match
    const potentialMatches = routes.map(route => {
        return {
            route,
            result: (location.pathname + location.search).match(pathToRegex(route.path))
        }
    });

    let match = potentialMatches.find(m => m.result !== null);


    if(!match) {
        match = {
            route: routes[0],
            result: location.search.slice(1)
        }
        /*If path is unknown redirecting to root*/
        navigateTo('/');
    }

    const view = new match.route.view(getParams(match));
    document.querySelector('#app').innerHTML = await view.getHTML();

    return view;
}

export { router, navigateTo }