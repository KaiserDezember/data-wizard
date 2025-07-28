mapboxgl.accessToken = 'pk.eyJ1Ijoiam9obm55MDY5NSIsImEiOiJjbWRjczRmMGIwMGw0MmpzY3NqcWlkdG9vIn0.AdzWN4zuPOkxzkm82JLWDA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [9.988, 53.565],
    zoom: 14,
    pitch: 60,
    bearing: 20,
    antialias: true
});

let geoData;

map.on('load', () => {
    fetch('data/hh_final_join_280725.geojson')
        .then(response => response.json())
        .then(data => {
            geoData = data;

            map.addSource('gebaeude', {
                type: 'geojson',
                data: geoData
            });

            map.addLayer({
                id: 'extrusion',
                type: 'fill-extrusion',
                source: 'gebaeude',
                paint: {
                    'fill-extrusion-color': '#aaa',
                    'fill-extrusion-height': ['*', ['coalesce', ['get', 'geschosse'], 1], 3],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.9
                }
            });

            // Dropdowns befüllen
            const stadtteile = new Set();
            const bezirke = new Set();
            data.features.forEach(f => {
                if (f.properties.stadtteil) stadtteile.add(f.properties.stadtteil);
                if (f.properties.bezirk) bezirke.add(f.properties.bezirk);
            });
            stadtteile.forEach(s => {
                const opt = document.createElement('option');
                opt.value = opt.text = s;
                document.getElementById('stadtteil').appendChild(opt);
            });
            bezirke.forEach(b => {
                const opt = document.createElement('option');
                opt.value = opt.text = b;
                document.getElementById('bezirk').appendChild(opt);
            });
        });
});

// POPUP
map.on('click', 'extrusion', (e) => {
    const p = e.features[0].properties;
    const grundflaeche = turf.area(e.features[0]);
    const geschosse = parseInt(p.geschosse) || 1;
    const bgf = grundflaeche * geschosse;

    const popupContent = `
        <b>Adresse:</b> ${p.lagebeztxt || 'Keine Angabe'}<br>
        <b>Postleitzahl:</b> ${p.plz_2 || 'Keine Angabe'}<br>
        <b>Stadtteil:</b> ${p.stadtteil || 'Keine Angabe'}<br>
        <b>Bezirk:</b> ${p.bezirk || 'Keine Angabe'}<br>
        <b>Nutzung Gebäude:</b> ${p["nutzung gebaeude"] || 'Keine Angabe'}<br>
        <b>Anzahl Geschosse:</b> ${geschosse}<br>
        <b>Flurstück:</b> ${p.flurstuecksnummer || 'Keine Angabe'}<br>
        <b>Grundstücksfläche:</b> ${p.flaeche || 'Keine Angabe'} m²<br><br>
        <b>Gebäudegrundfläche:</b> ${grundflaeche.toFixed(1)} m²<br>
        <b>Geschätzte BGF:</b> ${bgf.toFixed(1)} m²<br><br>
        <button onclick="window.open('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.lngLat.lat},${e.lngLat.lng}&heading=220&pitch=60', '_blank')">
        🔗 Street View öffnen</button>
    `;

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
});

// 🔄 Stilwechsel
document.getElementById('standard').addEventListener('click', () => {
    map.setStyle('mapbox://styles/mapbox/light-v11');
});
document.getElementById('satellite').addEventListener('click', () => {
    map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
});

// 🔍 Suche
document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const adresse = document.getElementById('adresse').value.trim().toLowerCase();
    const plz = document.getElementById('plz').value.trim();
    const stadtteil = document.getElementById('stadtteil').value;
    const bezirk = document.getElementById('bezirk').value;
    const flurstueck = document.getElementById('flurstueck').value.trim();
    const min = parseFloat(document.getElementById('flaecheMin').value) || 0;
    const max = parseFloat(document.getElementById('flaecheMax').value) || Infinity;

    const treffer = geoData.features.filter(f => {
        const p = f.properties;
        return (!adresse || (p.lagebeztxt?.toLowerCase() || '').includes(adresse)) &&
               (!plz || p.plz_2 === plz) &&
               (!stadtteil || p.stadtteil === stadtteil) &&
               (!bezirk || p.bezirk === bezirk) &&
               (!flurstueck || p.flurstuecksnummer == flurstueck) &&
               (!p.flaeche || (p.flaeche >= min && p.flaeche <= max));
    });

    const liste = document.getElementById('trefferliste');
    liste.innerHTML = '';

    if (treffer.length === 0) {
        liste.innerHTML = '<div>Keine Treffer</div>';
        return;
    }

    treffer.forEach((f) => {
        const div = document.createElement('div');
        div.innerText = `${f.properties.lagebeztxt || 'Unbenannt'} (${f.properties.plz_2 || 'PLZ?'})`;
        div.addEventListener('click', () => {
            const bbox = turf.bbox(f);
            map.fitBounds(bbox, { padding: 60 });
            new mapboxgl.Popup()
                .setLngLat(turf.center(f).geometry.coordinates)
                .setHTML(`<b>Adresse:</b> ${f.properties.lagebeztxt}<br><b>Postleitzahl:</b> ${f.properties.plz_2}`)
                .addTo(map);
        });
        liste.appendChild(div);
    });
});
