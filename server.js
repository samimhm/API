var express = require("express");
var app = express();

var cors = require("cors");
const requestIp = require('request-ip');
var geoip = require('geoip-lite');
var bodyParser = require('body-parser');

// import { db, dataState, geoSpatial } from './methods'
let data = require('./methods');


let pandemicController = {
  problems: false,
  message: '',
  showChat: true,
  showCounties: true,
  showTop10: true,
  showMondial: true
}
let users = {};

let geoSpatial = { data: '' };

let getGeoSpatial = async () => {
  response = await axios.get('https://covid19.geo-spatial.org/api/dashboard/v2/getCasesByCounty').then(rsp => {
    geoSpatial.data = rsp.data;
    // console.log(geoSpatial.data);
    console.log("UpdatedGeoSpatial!")
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
  let response;
  try {
    response = await axios.get("https://www.worldometers.info/coronavirus/");
    if (response.status !== 200) {
      console.log("Error", response.status);
    }
  } catch (err) {
    return null;
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
    db.countries = tempCountries[0].country === 'World' ? tempCountries.slice(1) : tempCountries;
    console.log("Updated The Countries!");
    dataState.countries = true;
  } else {
    console.log("!!! Countries not updated !!!", result);
    dataState.countries = false;
  }

}

getAll();
getcountries();
getRoCounties();
getGeoSpatial();

setInterval(getAll, 120000);
setInterval(getcountries, 120000);
setInterval(getGeoSpatial, 300000);
setInterval(getRoCounties, 600000);


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(cors());
app.use(requestIp.mw());


app.get("/", async function (request, response) {
  let a = data.db.all;
  response.send(
    `${a.cases} cases are reported of the COVID-19 Novel Coronavirus strain<br> ${a.deaths} have died from it <br>\n${a.recovered} have recovered from it <br> Get the endpoint /all to get information for all cases <br> get the endpoint /countries for getting the data sorted country wise`
  );
});

var listener = app.listen(process.env.PORT ? process.env.PORT : 5000, function () {
  console.log("Your app is listening on port " + listener.address().port);
});

app.get("/all/", async function (req, res) {
  let all = data.db.all;
  //......................................................
  const ip = req.clientIp;
  console.log(ip, ': Hello ALL!');

  if (users[ip]) {
    //..........................
    if (users[ip].lastDate) {
      let dif = Date.now() - users[ip].lastDate;
      if (dif > 35000) {
        users[ip] = {
          lastDate: Date.now(),
          views: 1,
          lastConnection: Date.now()
        }
      }
    }
    //.........................
  } else {
    users[ip] = {
      lastDate: Date.now(),
      views: 1,
      lastConnection: Date.now()
    }
  }
  let geo;

  if (ip) {
    geo = geoip.lookup(ip);
    if (geo) {
      if (users[ip])
        users[ip].geo = geo;
    } else {
      users[ip].geo = {
        range: [0, 0],
        country: 'N/A',
        region: 'N/A',
        eu: 'N/A',
        timezone: 'N/A',
        city: 'N/A',
        ll: [0, 0],
        metro: 0,
        area: 0
      }
    }
  }
  //...................................................
  res.send(all);
});

app.get("/countries/", async function (req, res) {
  // let countries = await db.fetch("countries");
  let countries = data.db.countries;
  res.send(countries);
});

app.get("/romania/", async function (req, res) {
  let countries = data.db.countries;
  let romania = countries.find(info => { return info.country === "Romania" });
  res.send(romania);
});

app.get("/romaniaUpdated/", async function (req, res) {
  let countries = data.db.countriesUpdated;
  let romania = countries.find(info => { return info.country === "Romania" });
  res.send(romania);
});

app.get("/full/", async function (req, res) {
  const ip = req.clientIp;

  if (users[ip]) {
    users[ip].lastConnection = Date.now();
  }

<<<<<<< HEAD
  let all = db.all;
  let countries = db.countries;
  let romania = countries.find(info => { return info.country === "Romania" });
  let judete = db.roCounties;
  let geoJudete = geoSpatial.data;
  // console.log('full: ', judete)
=======
  let all = data.db.all;
  let countries = data.db.countries;
  let romania = data.db.countries.find(info => { return info.country === "Romania" });
  let judete = data.db.roCounties;
  let geoJudete = data.geoSpatial.data;
  console.log(ip, ': full')
>>>>>>> testing
  res.send({
    all: all,
    countries: countries,
    romania: romania,
    judete: judete,
    geojudete: geoJudete,
<<<<<<< HEAD
=======
    pandemicController: pandemicController
  });
});

app.get("/fullV2/", async function (req, res) {
  const ip = req.clientIp;

  if (users[ip]) {
    users[ip].lastConnection = Date.now();
  } else {
    users[ip] = {
      lastDate: Date.now(),
      views: 1,
      lastConnection: Date.now()
    }

    let geo;

    if (ip) {
      geo = geoip.lookup(ip);
      if (geo) {
        if (users[ip])
          users[ip].geo = geo;
      } else {
        users[ip].geo = {
          range: [0, 0],
          country: 'N/A',
          region: 'N/A',
          eu: 'N/A',
          timezone: 'N/A',
          city: 'N/A',
          ll: [0, 0],
          metro: 0,
          area: 0
        }
      }
    }
  }

  let all = data.db.all;
  let countries = data.db.countriesUpdated;
  let romania = data.db.countriesUpdated.find(info => { return info.country === "Romania" });
  let judete = data.db.roCounties;
  let geojudete = data.geoSpatial.data;
  console.log(ip, ': fullV2')
  res.send({
    all: all,
    countries: countries,
    romania: romania,
    judete: judete,
    geojudete: geojudete,
>>>>>>> testing
    pandemicController: pandemicController
  });
});


app.get("/hello/", async function (req, res) {
  const ip = req.clientIp;
  console.log(ip, ': Hello!');

  if (users[ip]) {
    users[ip].lastDate = Date.now();
    users[ip].views = users[ip].views + 1;
  } else {
    users[ip] = {
      lastDate: Date.now(),
      views: 1,
      lastConnection: Date.now()
    }
  }
  let geo;

  if (ip) {
    geo = geoip.lookup(ip);
    if (geo) {
      if (users[ip])
        users[ip].geo = geo;
    } else {
      users[ip].geo = {
        range: [0, 0],
        country: 'N/A',
        region: 'N/A',
        eu: 'N/A',
        timezone: 'N/A',
        city: 'N/A',
        ll: [0, 0],
        metro: 0,
        area: 0
      }
    }
  }
  res.send('Welcome')
});

app.get("/visits/", async function (req, res) {
  res.send({
    users: users,
    dataState: data.dataState,
    problems: pandemicController.problems,
    showElements: {
      showChat: pandemicController.showChat,
      showCounties: pandemicController.showCounties,
      showTop10: pandemicController.showTop10,
      showMondial: pandemicController.showMondial
    }
  });
  // console.log('Pandemic Analytics: PING ');
});


app.post("/problems/", async function (req, res) {
  let password = 'volume';
  if (req.body.password === password) {
    if (req.body.problems === true) {
      pandemicController.problems = true;
      if (req.body.message) {
        pandemicController.message = req.body.message;
        console.log('Pandemic Analytics: ', pandemicController)
      }
    }
    if (req.body.problems === false) {
      pandemicController.problems = false;
      console.log('Pandemic Analytics: NO PROBLEMS ANYMORE');
    }
    res.send({ done: true })
  } else {
    console.log('WRONG PASSWORD')
    res.status(401).send(new Error('Wrong password!'))
  }
});

app.post("/showElement/", async function (req, res) {
  let password = 'volume';
  if (req.body.password === password) {
    if (req.body.show === true) {
      console.log(`Pandemic Analytics: ${req.body.element.toUpperCase()} TURNED TO "SHOW"`);
      switch (req.body.element) {
        case 'chat':
          pandemicController.showChat = true;
          break;
        case 'judete':
          pandemicController.showCounties = true;
          break;
        case 'top10':
          pandemicController.showTop10 = true;
          break;
        case 'mondial':
          pandemicController.showMondial = true;
          break;

        default: console.log('Error on /showElement: no element provided');
          break;
      }
    }
    if (req.body.show === false) {
      console.log(`Pandemic Analytics: ${req.body.element.toUpperCase()} TURNED TO "HIDE"`);
      switch (req.body.element) {
        case 'chat':
          pandemicController.showChat = false;
          break;
        case 'judete':
          pandemicController.showCounties = false;
          break;
        case 'top10':
          pandemicController.showTop10 = false;
          break;
        case 'mondial':
          pandemicController.showMondial = false;
          break;

        default: console.log('Error on /showElement: no element provided');
          break;
      }
    }

    res.send({ done: true })
  } else {
    console.log('WRONG PASSWORD')
    res.status(401).send(new Error('Wrong password!'))
  }
});

app.get("/goodbye/", async function (req, res) {
  const ip = req.clientIp;
  console.log(ip, ': Good Bye!');
  res.send('See you later!')
});

app.get("/sorin/", async function (req, res) {
  console.log('Sorin Type Request')
  res.send(data.geoSpatial.data);
});