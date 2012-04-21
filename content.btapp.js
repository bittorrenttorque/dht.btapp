(function() {

	function assert(b, err) { if(!b) throw err; }

	function get_magnet_link(hash) {
		return 'magnet:?xt=urn:btih:' + hash + '&tr=udp://tracker.openbittorrent.com:80/announce';
	}

	BtappContent = Backbone.Model.extend({
		initialize: function() {
			window.btapp = new Btapp;
			btapp.on('add:dht', function(dht) {
				if('get_any_hash' in dht) {
					dht.get_any_hash(function() {}, this.hash);
				} else {
					dht.on('add:get_any_hash', function() {
						btapp.get('dht').get_any_hash(function() {}, this.hash);
					});
				}
			}, this);

			btapp.on('add:torrent', function(list) {
				list.on('add', this.torrent, this);
				list.each(this.torrent, this);
			}, this);

			btapp.on('add:events', function(events) {
				events.save({'torrentStatus': function(status) {
					debugger;
				}});
			}, this);

			btapp.connect();
		},
		hash: function(hash) {
			console.log('hash: ' + hash);
			var link = get_magnet_link(hash);
			btapp.get('add').torrent(function() {}, link);
		},
		torrent: function(torrent) {
			console.log('torrent:' + torrent.id);
		}
	});
}).call(this);