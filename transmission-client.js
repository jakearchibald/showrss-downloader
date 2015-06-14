var RSVP = require('rsvp');
var request = RSVP.denodeify(require('request'));
var Promise = RSVP.Promise;

function TransmissionClient(url, username, password) {
  this.username = username;
  this.password = password;
  this.url = url;
  this._lastTransmissionSessionId = '';
  this.currentRequest = Promise.resolve();
}

TransmissionClient.prototype.addTorrent = function(url, dir) {
  var client = this;
  this.currentRequest = this.currentRequest.then(function() {
    return request({
      url: client.url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Transmission-Session-Id": client._lastTransmissionSessionId
      },
      body: JSON.stringify({
        method: "torrent-add",
        arguments: {
          "download-dir": dir,
          "filename": url,
        }
      }),
      auth: {
        user: client.username,
        pass: client.password
      }
    }).then(function(response) {
      if (response.headers["x-transmission-session-id"]) {
        client._lastTransmissionSessionId = response.headers["x-transmission-session-id"];
      }

      return response;
    });
  });

  return this.currentRequest.then(function(response) {
    if (response.statusCode == 409) { // CSRF
      return client.addTorrent(url, dir);
    }

    if (response.statusCode != 200 || JSON.parse(response.body).result != "success") {
      throw Error("Add torrent request failed " + response.statusCode);
    }
  });
};

module.exports = TransmissionClient;