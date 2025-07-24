mapboxgl.accessToken = 'pk.eyJ1Ijoiam9obm55MDY5NSIsImEiOiJjbWRjczRmMGIwMGw0MmpzY3NqcWlkdG9vIn0.AdzWN4zuPOkxzkm82JLWDA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [9.988, 53.565],
    zoom: 13,
    pitch: 60,
    bearing: 30,
    antialias: true
});

map.on('load', () => {
    map.addSource('gebaeude', {
        type: 'geojson',
        data: 'data/fertig/Hamburg_Gebaeude_selected.geojson'
    });

    map.addLayer({
        id: 'gebaeude-3d',
        type: 'fill-extrusion',
        source: 'gebaeude',
        paint: {
            'fill-extrusion-color': '#888',
            'fill-extrusion-height': ['*', ['coalesce', ['get', 'anzahlgs'], 1], 3],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.9
        }
    });

    map.addSource('flurstuecke', {
        type: 'vector',
        url: 'mapbox://johnny0695.2bdxvtpe'
    });

    map.addLayer({
        id: 'flurstuecke-fill',
        type: 'fill',
        source: 'flurstuecke',
        'source-layer': 'flurstuecke',
        paint: {
            'fill-color': '#000',
            'fill-opacity': 0.1
        }
    });

    map.addLayer({
        id: 'flurstuecke-outline',
        type: 'line',
        source: 'flurstuecke',
        'source-layer': 'flurstuecke',
        paint: {
            'line-color': '#000',
            'line-width': 1
        }
    });
});

map.on('click', 'gebaeude-3d', (e) => {
    const geb = e.features[0].properties;
    const grundflaeche = turf.area(e.features[0]);
    const geschosse = geb.anzahlgs || 1;
    const bgf = grundflaeche * geschosse;

    const flurstueck = map.queryRenderedFeatures(e.point, {
        layers: ['flurstuecke-fill']
    })[0]?.properties || {};

    const popupContent = `
        <b>Adresse:</b> ${geb.lagebeztxt || 'Keine Angabe'}<br>
        <b>PLZ:</b> ${flurstueck.plz || 'Keine Angabe'}<br>
        <b>Stadtteil:</b> ${flurstueck.stadtteil_name || 'Keine Angabe'}<br>
        <b>Bezirk:</b> ${flurstueck.bezirk_name || 'Keine Angabe'}<br>
        <b>Nutzung Gebäude:</b> ${geb.funktion || 'Keine Angabe'}<br>
        <b>Anzahl Geschosse:</b> ${geschosse}<br>
        <b>Flurstück:</b> ${flurstueck.flstnrzae || 'Keine Angabe'}<br>
        <b>Grundstücksfläche:</b> ${flurstueck.flaeche || 'Keine Angabe'} m²<br>
        <b>Gemarkung:</b> ${flurstueck.gemarkung || 'Keine Angabe'}<br><br>
        <b>Gebäudegrundfläche:</b> ${grundflaeche.toFixed(1)} m²<br>
        <b>Geschätzte BGF:</b> ${bgf.toFixed(1)} m²<br><br>
        <button onclick="window.open('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.lngLat.lat},${e.lngLat.lng}&heading=224.27&pitch=103.01', '_blank')">
        🔗 Street View öffnen</button>
    `;

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
});

document.getElementById('standard').addEventListener('click', () => {
    map.setStyle('mapbox://styles/mapbox/streets-v12');
});

document.getElementById('satellite').addEventListener('click', () => {
    map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
});