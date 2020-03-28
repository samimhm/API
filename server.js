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

  let all = data.db.all;
  let countries = data.db.countries;
  let romania = data.db.countries.find(info => { return info.country === "Romania" });
  let judete = data.db.roCounties;
  console.log(ip, ': full')
  res.send({
    all: all,
    countries: countries,
    romania: romania,
    judete: judete,
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
  console.log(ip, ': fullV2')
  res.send({
    all: all,
    countries: countries,
    romania: romania,
    judete: judete,
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