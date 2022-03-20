const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const lyricsFinder = require('lyrics-finder');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();
let accessToken, nextLink;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/*Now /static always refers to /client/static*/
app.use("/static", express.static(path.resolve(__dirname, "client", "static")));

app.get('/*', (request, response) => {
    response.sendFile(path.resolve(__dirname, "client", "index.html"));
});

app.post('/search', async (request, response) => {
    /*Next link is being saved earlier*/
    let url;
    if(request.body.searchNext)
        url = nextLink;
    else 
        url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(request.body.query)}&type=${request.body.searchTypes}&limit=30`;

    if(url == null)
        return;
    const result = await fetch(url, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    })
    
    const data = await result.json();
    /*Finding first category with that has next link and placing wanted search types in it*/
    let categoryWithNext = Object.values(data).find(category => category.next !== null);
    if(categoryWithNext)
        nextLink = categoryWithNext?.next?.replace(/(?<=&type=)(.*)(?=&offset)/, request.body.searchTypes);
    else
        nextLink = null;
    

    response.send(data);
});

app.post('/lyrics', async (request, response) => {
    let lyrics = await lyricsFinder(request.body.artist, request.body.title) || "Not Found!";
    response.send({ lyrics });
});

app.post('/album', async (request, response) => {
    const result = await fetch(`https://api.spotify.com/v1/albums/${request.body.id}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    });
    const data = await result.json();

    for(let ar of data.artists) {
        /*Just to get each artist's image*/
        const resultArtist = await fetch(`https://api.spotify.com/v1/artists/${ar.id}`, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            }
        });
        const artistData = await resultArtist.json(); 
        ar.images = artistData.images;
    }

    let duration = 0;
    for(let tr of data.tracks.items) {
        /*Also setting each track image to be album's image*/
        tr.album = {};
        tr.album.images = data.images;
        duration += tr.duration_ms;
    }

    let durInMinutes = duration / 60000;
    let remainingSeconds = Math.floor((durInMinutes - Math.floor(durInMinutes)) * 60);
    let durInHours = durInMinutes / 60;
    let remainingMinutes = Math.floor((durInHours - Math.floor(durInHours)) * 60);
    let durationString = `${Math.floor(durInHours)}:${(remainingMinutes < 10 ? '0' : '') + remainingMinutes}:${(remainingSeconds < 10 ? '0' : '') + remainingSeconds}`;

    /*Sendind data this way for items to be processed correctly there*/
    response.send({...data, durationString, tracks: data.tracks, artists: { items: data.artists } });
});

app.post('/artist', async (request, response) => {
    /*Getting artist, his top tracks and his albums*/
    const resultArtist = await fetch(`https://api.spotify.com/v1/artists/${request.body.id}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    });
    const resultAlbums = await fetch(`https://api.spotify.com/v1/artists/${request.body.id}/albums`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    });
    const resultTracks = await fetch(`https://api.spotify.com/v1/artists/${request.body.id}/top-tracks?market=US`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
        },
    });
    const dataArtist = await resultArtist.json();
    const dataAlbums = await resultAlbums.json();
    const dataTracks = await resultTracks.json();

    /*Sendind data this way for items to be processed correctly there*/
    response.send({...dataArtist, albums: dataAlbums, tracks: { items: dataTracks.tracks } });
});

const encodedClient = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("Base64");
fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization" : `Basic ${encodedClient}`
    },
    body: "grant_type=client_credentials"
}).then((res) => {
    res.json()
    .then((data) => {
        accessToken = data.access_token;
        app.listen(PORT, () => {
            console.log("Server has been started on port " + PORT);
        });
    });
});

