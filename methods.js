var axios = require("axios");
var cheerio = require("cheerio");
const { NovelCovid } = require('novelcovid');
const track = new NovelCovid();


var db = {
    all: {},
    countries: [],
    countriesUpdated: [],
    roCounties: []
}
let dataState = {
    countries: false,
    all: false,
    roCounties: false
}

let geoSpatial = { data: '' };

let getNovelCountries = async () => {
    await track.countries().then(rsp => {
        db.countriesUpdated = rsp.sort((a, b) => { return b.cases - a.cases });
        dataState.countries = true;
        console.log('Updated Novel Countries!')
    }).catch(err => {
        dataState.countries = false;
        console.log('NOVEL COUNTRIES NOT UPDATED !!!', err);
    })
}

let getNovelAll = async () => {
    await track.all().then(rsp => {
        db.all = rsp;
        dataState.all = true;
        console.log('Updated Novel ALL!')
    }).catch(err => {
        dataState.all = false;
        console.log('NOVEL ALL NOT UPDATED !!!', err);
    })
}


let getGeoSpatial = async () => {
    response = await axios.get('https://covid19.geo-spatial.org/api/dashboard/v2/getCasesByCounty').then(rsp => {
        geoSpatial.data = rsp.data;
        // console.log(geoSpatial.data);
        console.log("Updated GeoSpatial!")
    }).catch(err => {
        console.log(geoSpatial.data);
        console.log('GEOSPATIAL NOT UPDATED!!! ', err)
    });
}

let getRoCounties = async () => {
    response = await axios.get('https://services7.arcgis.com/I8e17MZtXFDX9vvT/arcgis/rest/services/Coronavirus_romania/FeatureServer/0/query?f=json&where=1=1&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=Judete%20asc&resultOffset=0&resultRecordCount=42&cacheHint=true').then(rsp => {
        let tempArray = []
        rsp.data.features.forEach(countie => {
            let obj = {
                judet: countie.attributes.Judete,
                cazuri: countie.attributes.Cazuri_confirmate,
                vindecate: countie.attributes.Persoane_vindecate,
                carantina: countie.attributes.Persoane_in_carantina,
                izolate: countie.attributes.Persoane_izolate,
                decedate: countie.attributes.Persoane_decedate
            }
            tempArray.push(obj)
            // console.log(obj)
        });
        db.roCounties = tempArray;
        dataState.roCounties = true;
        console.log("Updated Romanian Counties!")
    }).catch(err => {
        dataState.roCounties = false;
        console.log('ROMANIAN COUNTIES NOT UPDATED!!! ', err)
    });
}

let getAll = async () => {
    let response;
    try {
        response = await axios.get("https://www.worldometers.info/coronavirus/");
        if (response.status !== 200) {
            console.log("ERROR");
        }
    } catch (err) {
        return null;
    }

    // to store parsed data
    const result = {};

    // get HTML and parse death rates
    const html = cheerio.load(response.data);
    html(".maincounter-number").filter((i, el) => {
        let count = el.children[0].next.children[0].data || "0";
        count = parseInt(count.replace(/,/g, "") || "0", 10);
        // first one is
        if (i === 0) {
            result.cases = count;
        } else if (i === 1) {
            result.deaths = count;
        } else {
            result.recovered = count;
        }
    });


    if (result) {
        db.all = result;
        console.log("Updated The Cases!");
        dataState.all = true;
    } else {
        console.log("result: ", result);
        dataState.all = false;
        console.log("!!! Cases not updated !!!");
    }
}

let getcountries = async () => {
    //MAKE REQUEST TO WORLDOMETER.INFO:
    let response;
    try {
        response = await axios.get("https://www.worldometers.info/coronavirus/");
        if (response.status !== 200) {
            console.log("Error", response.status);
        }
    } catch (err) {
        return null;
    }
    //METHOD FOR OLD WAY OF GETTING COUNTRIES
    const oldWay = () => {
        //CHECK FUNCTION
        function checkDataContinent(cell) {
            let attribsArray = Object.keys(cell.attribs);
            console.log('FUNCTION attribsArray: ', attribsArray);
            let includesDataContinent = attribsArray.includes('data-continent');
            console.log('FUNCTION includes: ', includesDataContinent);
            return includesDataContinent
        }
        // to store parsed data
        const result = [];

        // get HTML and parse death rates
        const html = cheerio.load(response.data);
        const countriesTable = html("table#main_table_countries_today");
        const countriesTableCells = countriesTable
            .children("tbody")
            .children("tr")
            .children("td");
        // NOTE: this will change when table format change in website
        const totalColumns = 12;
        const countryColIndex = 0;
        const casesColIndex = 1;
        const todayCasesColIndex = 2;
        const deathsColIndex = 3;
        const todayDeathsColIndex = 4;
        const curedColIndex = 6;
        const criticalColIndex = 7;

        // minus totalColumns to skip last row, which is total
        for (let i = 0; i < countriesTableCells.length - totalColumns; i += 1) {
            const cell = countriesTableCells[i];
            console.log(`cell ${i} attribs: `, cell.attribs)
            if (!checkDataContinent(cell)) {
                console.log(`heere ${i} !`)
                if (i % totalColumns === countryColIndex) {
                    let country =
                        cell.children[0].data ||
                        cell.children[0].children[0].data ||
                        // country name with link has another level
                        cell.children[0].children[0].children[0].data ||
                        cell.children[0].children[0].children[0].children[0].data ||
                        "";
                    country = country.trim();
                    if (country.length === 0) {
                        // parse with hyperlink
                        country = cell.children[0].next.children[0].data || "";
                    }
                    result.push({ country: country.trim() || "" });
                }
                // get cases
                if (i % totalColumns === casesColIndex) {
                    let cases = cell.children[0] ? (cell.children[0].data) : "";
                    result[result.length - 1].cases = parseInt(
                        cases.trim().replace(/,/g, "") || "0",
                        10
                    );
                }
                // get today cases
                if (i % totalColumns === todayCasesColIndex) {
                    let cases = cell.children[0] ? (cell.children[0].data) : "";
                    result[result.length - 1].todayCases = parseInt(
                        cases.trim().replace(/,/g, "") || "0",
                        10
                    );
                }
                // get deaths
                if (i % totalColumns === deathsColIndex) {
                    let deaths = cell.children[0] ? (cell.children[0].data) : "";
                    result[result.length - 1].deaths = parseInt(
                        deaths.trim().replace(/,/g, "") || "0",
                        10
                    );
                }
                // get today deaths
                if (i % totalColumns === todayDeathsColIndex) {
                    let deaths = cell.children[0] ? (cell.children[0].data) : "";
                    result[result.length - 1].todayDeaths = parseInt(
                        deaths.trim().replace(/,/g, "") || "0",
                        10
                    );
                }
                // get cured
                if (i % totalColumns === curedColIndex) {
                    // console.log('result on recovered: ', result, 'i: ', i)
                    let cured = cell.children[0] ? (cell.children[0].data) : "";
                    result[result.length - 1].recovered = parseInt(
                        cured.trim().replace(/,/g, "") || 0,
                        10
                    );
                }
                // get critical
                if (i % totalColumns === criticalColIndex) {
                    let critical = cell.children[0] ? (cell.children[0].data) : "";
                    result[result.length - 1].critical = parseInt(
                        critical.trim().replace(/,/g, "") || "0",
                        10
                    );
                }
            }
            // } else {
            //     console.log('NOT PROCESSING BECAUSE TRUE')
            // }

        }
        if (result.length > 0) {
            let tempCountries = result.sort((a, b) => { return b.cases - a.cases })
            db.countries = tempCountries[0].country === 'World' ? tempCountries.slice(1) : tempCountries;
            console.log("Updated The Countries!");
            dataState.countries = true;
        } else {
            console.log("!!! Countries not updated Old Way!!!", result);
            dataState.countries = false;
        }
    }
    //METHOD FOR NEW WAY OF GETTING COUNTRIES
    const newWay = () => {
        // to store parsed data
        const result = [];

        // get HTML and parse death rates
        const html = cheerio.load(response.data);
        const countriesTable = html("table#main_table_countries_today");
        const countriesTableCells = countriesTable
            .children("tbody")
            .children("tr")
            .children("td");

        // NOTE: this will change when table format change in website
        const totalColumns = 12;
        const countryColIndex = 0;
        const casesColIndex = 1;
        const todayCasesColIndex = 2;
        const deathsColIndex = 3;
        const todayDeathsColIndex = 4;
        const curedColIndex = 5;
        const activeColIndex = 6;
        const criticalColIndex = 7;

        // minus totalColumns to skip last row, which is total
        for (let i = 0; i < countriesTableCells.length - totalColumns; i += 1) {
            const cell = countriesTableCells[i];
            // get country
            if (i % totalColumns === countryColIndex) {
                let country =
                    cell.children[0].data ||
                    cell.children[0].children[0].data ||
                    // country name with link has another level
                    cell.children[0].children[0].children[0].data ||
                    cell.children[0].children[0].children[0].children[0].data ||
                    "";
                country = country.trim();
                if (country.length === 0) {
                    // parse with hyperlink
                    country = cell.children[0].next.children[0].data || "";
                }
                result.push({ country: country.trim() || "" });
            }
            // get cases
            if (i % totalColumns === casesColIndex) {
                let cases = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].cases = parseInt(
                    cases.trim().replace(/,/g, "") || "0",
                    10
                );
            }
            // get today cases
            if (i % totalColumns === todayCasesColIndex) {
                let cases = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].todayCases = parseInt(
                    cases.trim().replace(/,/g, "") || "0",
                    10
                );
            }
            // get deaths
            if (i % totalColumns === deathsColIndex) {
                let deaths = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].deaths = parseInt(
                    deaths.trim().replace(/,/g, "") || "0",
                    10
                );
            }
            // get today deaths
            if (i % totalColumns === todayDeathsColIndex) {
                let deaths = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].todayDeaths = parseInt(
                    deaths.trim().replace(/,/g, "") || "0",
                    10
                );
            }
            // get cured
            if (i % totalColumns === curedColIndex) {
                let cured = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].recovered = parseInt(
                    cured.trim().replace(/,/g, "") || 0,
                    10
                );
            }
            // get active
            if (i % totalColumns === activeColIndex) {
                let active = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].active = parseInt(
                    active.trim().replace(/,/g, "") || 0,
                    10
                );
            }
            // get critical
            if (i % totalColumns === criticalColIndex) {
                let critical = cell.children[0] ? (cell.children[0].data) : "";
                result[result.length - 1].critical = parseInt(
                    critical.trim().replace(/,/g, "") || "0",
                    10
                );
            }
        }
        if (result.length > 0) {
            let tempCountries = result.sort((a, b) => { return b.cases - a.cases })
            db.countriesUpdated = tempCountries[0].country === 'World' ? tempCountries.slice(1) : tempCountries;
            console.log("Updated The Countries New Way!");
            dataState.countries = true;
        } else {
            console.log("!!! Countries not updated  Old Way!!!", result);
            dataState.countries = false;
        }
    }
    oldWay();
    newWay();

}

// getAll();
// // getcountries();
getNovelAll();
getNovelCountries();
getRoCounties();
getGeoSpatial();

// setInterval(getAll, 120000);
// setInterval(getcountries, 120000);
setInterval(getNovelAll, 60000);
setInterval(getNovelCountries, 60000);
setInterval(getGeoSpatial, 300000);
setInterval(getRoCounties, 600000);

module.exports = {
    db: db,
    dataState: dataState,
    geoSpatial: geoSpatial
}