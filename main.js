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

// Function to add 3D buildings layer
function addBuildingsLayer() {
    if (!geoData || map.getSource('gebaeude')) return;
    
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
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');

    map.on('load', () => {
        console.log('Map loaded, fetching data...');
        fetch('data/hh_final_join_280725_wgs84.geojson')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load GeoJSON');
                return response.json();
            })
            .then(data => {
                console.log('Data loaded:', data.features.length, 'features');
                geoData = data;
                addBuildingsLayer();

                // Populate dropdowns
                const stadtteile = new Set();
                const bezirke = new Set();
                
                data.features.forEach(f => {
                    if (f.properties.stadtteil) stadtteile.add(f.properties.stadtteil);
                    if (f.properties.bezirk) bezirke.add(f.properties.bezirk);
                });
                
                const stadtteilSelect = document.getElementById('stadtteil');
                const bezirkSelect = document.getElementById('bezirk');
                
                [...stadtteile].sort().forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = opt.text = s;
                    stadtteilSelect.appendChild(opt);
                });
                
                [...bezirke].sort().forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = opt.text = b;
                    bezirkSelect.appendChild(opt);
                });
                
                console.log('Dropdowns populated');
            })
            .catch(error => {
                console.error('Error loading data:', error);
            });
    });

    // Re-add buildings after style change
    map.on('style.load', () => {
        addBuildingsLayer();
    });

    // Building click popup
    map.on('click', 'extrusion', (e) => {
        const p = e.features[0].properties;
        const grundflaeche = turf.area(e.features[0]);
        const geschosse = parseInt(p.geschosse) || 1;
        const bgf = grundflaeche * geschosse;

        const popupContent = `
            <div style="font-size: 14px; line-height: 1.4;">
                <b>Adresse:</b> ${p.lagebeztxt || 'Keine Angabe'}<br>
                <b>Postleitzahl:</b> ${p.plz || 'Keine Angabe'}<br>
                <b>Stadtteil:</b> ${p.stadtteil || 'Keine Angabe'}<br>
                <b>Bezirk:</b> ${p.bezirk || 'Keine Angabe'}<br>
                <b>Nutzung Gebäude:</b> ${p["nutzung gebaeude"] || 'Keine Angabe'}<br>
                <b>Anzahl Geschosse:</b> ${geschosse}<br>
                <b>Flurstück:</b> ${p.flurstuecksnummer || 'Keine Angabe'}<br>
                <b>Grundstücksfläche:</b> ${p.flaeche || 'Keine Angabe'} m²<br><br>
                <b>Gebäudegrundfläche:</b> ${grundflaeche.toFixed(1)} m²<br>
                <b>Geschätzte BGF:</b> ${bgf.toFixed(1)} m²<br><br>
                <button onclick="window.open('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.lngLat.lat},${e.lngLat.lng}&heading=220&pitch=60', '_blank')" 
                        style="padding: 8px; background: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🔗 Street View öffnen</button>
            </div>
        `;

        new mapboxgl.Popup({ maxWidth: '300px' })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map);
    });

    // Style toggle buttons
    document.getElementById('standard')?.addEventListener('click', () => {
        map.setStyle('mapbox://styles/mapbox/light-v11');
    });

    document.getElementById('satellite')?.addEventListener('click', () => {
        map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
    });

    // Search functionality
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        console.log('Search form found, attaching listener');
        
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Search submitted');
            
            if (!geoData) {
                console.warn('No data loaded yet');
                return;
            }

            const adresse = document.getElementById('adresse').value.trim().toLowerCase();
            const plz = document.getElementById('plz').value.trim();
            const stadtteil = document.getElementById('stadtteil').value;
            const bezirk = document.getElementById('bezirk').value;
            const flurstueck = document.getElementById('flurstueck').value.trim();
            const min = parseFloat(document.getElementById('flaecheMin').value) || 0;
            const max = parseFloat(document.getElementById('flaecheMax').value) || Infinity;

            console.log('Search criteria:', { adresse, plz, stadtteil, bezirk, flurstueck, min, max });

            const treffer = geoData.features.filter(f => {
                const p = f.properties;
                
                const adresseMatch = !adresse || (p.lagebeztxt?.toLowerCase() || '').includes(adresse);
                const plzMatch = !plz || String(p.plz).trim() === plz;
                const stadtteilMatch = !stadtteil || p.stadtteil === stadtteil;
                const bezirkMatch = !bezirk || p.bezirk === bezirk;
                const flurstueckMatch = !flurstueck || String(p.flurstuecksnummer).trim() === flurstueck;
                const flaecheMatch = !p.flaeche || (p.flaeche >= min && p.flaeche <= max);

                return adresseMatch && plzMatch && stadtteilMatch && bezirkMatch && flurstueckMatch && flaecheMatch;
            });

            console.log('Found matches:', treffer.length);

            const liste = document.getElementById('trefferliste');
            liste.innerHTML = '';

            if (treffer.length === 0) {
                liste.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Keine Treffer gefunden</div>';
                return;
            }

            treffer.forEach((f) => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <div style="font-weight: bold;">${f.properties.lagebeztxt || 'Unbenannt'}</div>
                    <div style="font-size: 12px; color: #666;">PLZ: ${f.properties.plz || 'N/A'} | ${f.properties.stadtteil || 'N/A'}</div>
                `;
                div.style.cursor = 'pointer';
                div.style.padding = '8px';
                div.style.borderBottom = '1px solid #eee';
                
                div.addEventListener('click', () => {
                    const bbox = turf.bbox(f);
                    map.fitBounds(bbox, { padding: 60 });
                    
                    new mapboxgl.Popup()
                        .setLngLat(turf.center(f).geometry.coordinates)
                        .setHTML(`
                            <div style="font-size: 14px;">
                                <b>Adresse:</b> ${f.properties.lagebeztxt}<br>
                                <b>Postleitzahl:</b> ${f.properties.plz}
                            </div>
                        `)
                        .addTo(map);
                });
                
                liste.appendChild(div);
            });
        });
    } else {
        console.error('Search form not found');
    }
});