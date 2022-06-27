
const fs = require('fs');
const axios = require('axios').default;
const cheerio = require('cheerio');
const jsondiffpatch = require('jsondiffpatch');


const SOURCES = [
    {
        key: 'bevoelkerung-demokratie',
        title: 'Bevölkerung & Demographie',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12810.1&La=1&'
    },
    {
        key: 'bildung-kultur-sport',
        title: 'Bildung, Kultur & Sport',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12811.1&La=1&'
    },
    {
        key: 'freizeit-tourismus',
        title: 'Freizeit & Tourismus',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12814.1&La=1&'
    },
    {
        key: 'geographie-geobasisdaten-stadtplanung',
        title: 'Geographie, Geobasisdaten & Stadtplanung',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12815.1&La=1&'
    },
    {
        key: 'gesundheit-soziales',
        title: 'Gesundheit & Soziales',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12816.1&La=1&'
    },
    {
        key: 'haushalt-steuern',
        title: 'Haushalt & Steuern',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12812.1&La=1&'
    },
    {
        key: 'infrastruktur-bauen-wohnen',
        title: 'Infrastruktur, Bauen & Wohnen',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12817.1&La=1&'
    },
    {
        key: 'oeffentliche-verwaltung',
        title: 'Öffentliche Verwaltung',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12813.1&La=1&'
    },
    {
        key: 'politik-wahlen',
        title: 'Politik & Wahlen',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12818.1&La=1&'
    },
    {
        key: 'transport-verkehr',
        title: 'Transport & Verkehr',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12821.1&La=1&'
    },
    {
        key: 'umwelt-klima',
        title: 'Umwelt & Klima',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12819.1&La=1&'
    },
    {
        key: 'wirtschaft-arbeit',
        title: 'Wirtschaft & Arbeit',
        url: 'https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/Verwaltung-Service/Offene-Verwaltungsdaten/index.php?NavID=37.906&object=tx|37.12820.1&La=1&'
    }
];


function forceTargetDirectory(source) {
    if (!fs.existsSync(`./generated/${source.key}`)) {
        fs.mkdirSync(`./generated/${source.key}`, { recursive: true });
    }
}


async function fetchSnapshot(source) {
    return axios
        .get(source.url)
        .then(response => response.data);
}


async function parseSnapshot(htmlSnapshot) {

    const $ = cheerio.load(htmlSnapshot);
    return $('.ovd_element')
        .map((index, elem) => {

            const titleElem = $('.toggler_titel .ovd_title', elem);
            const title = titleElem.text().trim();
            const subtitleElem = titleElem.next();
            const subtitle = subtitleElem.text().trim();

            const detailsElem = $('.toggler_container', elem);
            const descriptionElem = detailsElem.children().first();
            const description = descriptionElem.text().trim();

            const detailsRowElems = $('.row', detailsElem);
            const details = detailsRowElems
                .map((index, rowElem) => {
                    const labelElem = $('label', rowElem);
                    const spanElem = $('span', rowElem);
                    return { label: labelElem.text().trim(), value: spanElem.html().trim() };
                })
                .toArray();

            const downloadLinkElement = $('a[title="Dokument anzeigen"]', elem);
            const downloadLink = downloadLinkElement.attr('href');

            return { title, subtitle, description, details, downloadLink };

        })
        .toArray();

}


function loadLatestSnapshot(source) {
    const filename = `./generated/${source.key}/latest-snapshot.json`;
    if (fs.existsSync(filename)) {
        return JSON.parse(fs.readFileSync(filename, 'utf-8'));
    }
    return null;
}


function checkChanges(oldSnapshot, newSnapshot) {
    return jsondiffpatch.diff(oldSnapshot, newSnapshot);
}


function saveDiff(oldSnapshot, newSnapshot, diff, source) {
    const now = new Date();
    const json = { date: now.toISOString(), oldSnapshot, newSnapshot, diff };
    const filename = `./generated/${source.key}/diff-${now.toISOString()}.json`;
    fs.writeFileSync(filename, JSON.stringify(json, null, 2));
}


function saveLatestSnapshot(snapshot, source) {
    const filename = `./generated/${source.key}/latest-snapshot.json`;
    fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2));
}


(async () => {

    for (const source of SOURCES) {

        console.log(`Processing "${source.title}"`);

        forceTargetDirectory(source);

        const htmlSnapshot = await fetchSnapshot(source);
        const snapshot = await parseSnapshot(htmlSnapshot);
        const latestSnapshot = await loadLatestSnapshot(source) || [];
        const diff = checkChanges(latestSnapshot, snapshot);
        if (diff) {
            console.log("Found updates!");
            saveDiff(latestSnapshot, snapshot, diff, source);
            saveLatestSnapshot(snapshot, source);
        } else {
            console.log('No updates.');
        }

    }

    console.log('Done.');
})();
