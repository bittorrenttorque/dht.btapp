(function() {

	function assert(b, err) { if(!b) throw err; }

	function get_magnet_link(hash) {
		return 'magnet:?xt=urn:btih:' + hash + '&tr=udp://tracker.openbittorrent.com:80/announce';
	}

	BtappContent = Backbone.Model.extend({
		initialize: function() {
			window.btapp = new Btapp;
			btapp.on('torrentStatus', this.status, this);
			btapp.on('add:dht', this.setup_dht, this);

			btapp.on('add:torrent', this.setup_torrents, this);
			btapp.connect();
			this.setup_status_handlers();
		},
		setup_status_handlers: function() {
			this.torrent_status_handlers = {};
			this.torrent_status_handlers[Btapp.STATUS.TORRENT.ADDED] = this.torrent_added_handler;
			this.torrent_status_handlers[Btapp.STATUS.TORRENT.METADATA_COMPLETE] = this.torrent_metadata_handler;
		},
		setup_dht: function(dht) {
			if('get_any_hash' in dht) {
				dht.get_any_hash(this.hash);
			} else {
				dht.on('add:get_any_hash', function() {
					btapp.get('dht').get_any_hash(this.hash);
				});
			}
		},
		setup_torrents: function(list) {
			list.on('add', this.torrent, this);
			list.each(this.torrent, this);
		},
		status: function(status) {
			if(typeof status !== 'object') return;
			if(!('status' in status)) return;
			if(this.torrent_status_handlers[status.state]) {
				this.torrent_status_handlers[status.state].call(this, status);
			}
		},
		hash: function(hash) {
			if(btapp.get('torrent').get(hash)) return;
			var link = get_magnet_link(hash);
			btapp.get('add').torrent(link);
		},
		torrent: function(torrent) {
			torrent.set_priority(Btapp.TORRENT.PRIORITY.METADATA_ONLY);
		},
		torrent_added_handler: function(status) {
			if(btapp.get('torrent').get(status.hash)) {
				btapp.get('torrent').get(status.hash).force_start();
			} else {
				btapp.get('torrent').on('add:' + status.hash, function(torrent) {
					btapp.get('torrent').off('add:' + status.hash);
					torrent.force_start();
				});
			}
		},
		torrent_metadata_handler: function(status) {
			if(btapp.get('torrent').get(status.hash)) {
				this.aggregate_torrent_information(btapp.get('torrent').get(status.hash));
			} else {
				btapp.get('torrent').on('add:' + status.hash, function(torrent) {
					this.aggregate_torrent_information(torrent);
				}, this);
			}
		},
		aggregate_torrent_information: function(torrent) {
			// At this point we have a torrent that is stopped. 
			// We don't necessarily have the information
			// to process it yet however.
			if(!torrent.get('properties')) {
				torrent.on('add:properties', function(properties) {
					this.aggregate_torrent_information(torrent);
					torrent.off('add:properties');
				}, this);
				return;
			}
			if(!torrent.get('file')) {
				torrent.on('add:file', function(files) {
					this.aggregate_torrent_information(torrent);
					torrent.off('add:file');
				}, this);
				return;
			}

			if(torrent.get('file').length === 0) {
				var files = torrent.get('file');
				files.on('add', function() {
					this.aggregate_torrent_information(torrent);
					files.off('add');
				}, this)
				return;
			}

			this.process_torrent_information(torrent);
		},
		process_torrent_information: function(torrent) {
			// Now that we have all the torrent file/metadata information,
			// Notify whoever is listening, and provide the info...once
			// that's been done there's no need to add the torrent again.
			this.trigger('content', torrent.toJSON());
			torrent.remove();
		}
	});
}).call(this);