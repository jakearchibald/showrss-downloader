var RSVP = require('rsvp');
var Promise = RSVP.Promise;
var configFile = require('./config-file');
var FeedParser = require('feedparser');
var request = require('request');
var TransmissionClient = require('./transmission-client');
var maxEpHistory = 20;

Array.from = function(arr) {
  return Array.prototype.slice.call(arr);
};

function streamRequest(url) {
  return new Promise(function(resolve, reject) {
    var req = request(url);
    req.on('error', function(error) {
      reject(error);
    });
    req.on('response', function(res) {
      if (res.statusCode != 200) return reject(Error('Bad status code'));
      resolve(this);
    });
  })
}

var transmission;

configFile.load().then(function(config) {
  console.log("Fetching RSS…");
  return streamRequest(config.rssUrl).then(function(stream) {
    return new Promise(function(resolve, reject) {
      var items = [];
      var parser = new FeedParser();
      stream.pipe(parser);
      parser.on('error', function(error) {
        reject(error);
      });

      parser.on('readable', function(error) {
        var item;
        while (item = parser.read()) {
          items.push({
            title: item.title,
            link: item.link,
            showName: item.title.replace(/\s+\d.*/, '').replace(/!/g, '')
          });
        }
      });

      parser.on('end', function() {
        resolve(items);
      });
    });
  }).then(function(items) {
    console.log("Done");
    var transmission = new TransmissionClient(config.transmission.url, config.transmission.username, config.transmission.password);

    for (var i = 0; i < items.length; i++) {
      if (items[i].link === config.lastMagnet) {
        items = items.slice(0, i);
        break;
      }
    }

    if (items[0]) {
      console.log("Found new stuff!");
      config.lastMagnet = items[0].link;
    }
    else {
      console.log("Nothing new.");
      return;
    }

    return Promise.all(items.map(function(item) {
      console.log("Adding " + item.title + " (" + item.showName + ")");
      return transmission.addTorrent(item.link, config.transmission.saveDir + '/' + item.showName);
    })).then(function() {
      console.log("Done!");
    });
  }).then(function() {
    return configFile.save(config);
  });
}).catch(function(err) {
  setTimeout(function() { throw err });
  console.log(err.message);
});
