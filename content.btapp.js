(function() {

	function assert(b, err) { if(!b) throw err; }

	function get_magnet_link(hash) {
		return 'magnet:?xt=urn:btih:' + hash + '&tr=udp://tracker.openbittorrent.com:80/announce';
	}

	BtappContent = Backbone.Model.extend({
		initialize: function() {
			_.bindAll(this);

			this.btapp = new Btapp;
			this.btapp.on('torrentStatus', this.status);
			this.btapp.on('add:dht', this.setup_dht);

			this.btapp.on('add:torrent', this.setup_torrents);
			this.btapp.connect();
			this.setup_status_handlers();
		},
		setup_status_handlers: function() {
			this.torrent_status_handlers = {};
			this.torrent_status_handlers[Btapp.STATUS.TORRENT.METADATA_COMPLETE] = this.torrent_metadata_handler;
		},
		setup_dht: function(dht) {
			if('get_any_hash' in dht) {
				this.trigger('content:dht');
				dht.get_any_hash(this.hash);
			} else {
				dht.on('add:get_any_hash', _.bind(function() {
					this.trigger('content:dht');
					this.btapp.get('dht').get_any_hash(this.hash);
				}, this));
			}
		},
		setup_torrents: function(list) {
			list.on('add', this.torrent);
			list.on('remove', function(value, key) {
				this.trigger('content:remove', value.id);
			}, this);
			list.each(this.torrent, this);
		},
		status: function(status) {
			this.trigger('content:status', status);
			if(typeof status !== 'object') return;
			if(!('status' in status)) return;
			if(this.torrent_status_handlers[status.state]) {
				this.torrent_status_handlers[status.state].call(this, status);
			}
		},
		hash: function(hash) {
			this.trigger('content:hash', hash);
			if(this.btapp.get('torrent').get(hash)) return;
			var link = get_magnet_link(hash);
			this.btapp.get('add').torrent(link);
		},
		torrent: function(torrent) {
			this.trigger('content:torrent', torrent.id);
			torrent.force_start();
			torrent.set_priority(Btapp.TORRENT.PRIORITY.METADATA_ONLY);
			this.aggregate_torrent_information(torrent);
		},
		torrent_metadata_handler: function(status) {
			// The client has notified us that we have the metadata for a torrent
			// It may not have bubbled up to our library, but make sure we stop it
			// as soon as we see it. We have no use for the content.
			this.trigger('content:metadata', status);
			if(this.btapp.get('torrent').get(status.hash)) {
				this.btapp.get('torrent').get(status.hash).stop();
			} else {
				this.btapp.get('torrent').on('add:' + status.hash, function(torrent) { torrent.stop(); });
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
			this.trigger('content:data', torrent.toJSON());
			torrent.remove();
		}
	});
}).call(this);