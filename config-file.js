var fs = require('fs');
var RSVP = require('rsvp');
var readFile = RSVP.denodeify(fs.readFile);
var writeFile = RSVP.denodeify(fs.writeFile);

var path = __dirname + '/config.json';

module.exports = {
  load: function() {
    // default:
    // {
    //   "lastMagnet": "",
    //   "rssUrl": "http://showrss.info/…",
    //   "transmission": {
    //     "url": "…",
    //     "username": "…",
    //     "saveDir": "/media/shared/Video/TV Shows/",
    //     "password": "…"
    //   }
    // }
    return readFile(path).then(JSON.parse);
  },
  save: function(obj) {
    return writeFile(path, JSON.stringify(obj, null, '  '));
  }
};