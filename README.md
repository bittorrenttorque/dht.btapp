# Btapp Content

## What can I do?
You'll see random torrent file meta data blobs. This included file names, size, potentially swarm size, peers, etc.

## How does it work?
The underlying torrent client takes part in the underlying distributed hash table, which is a completely distributed key value store, used for connecting peers looking for a common torrent info hash (a 120 bit value unique to each torrent file). Taking part in this network means that your client is helping fulfill these lookups. Because it is completely distributed, you don't know who is looking for what, and you'll only see a small slice of the content being searched for. However, due to scale of use, even non-representative slivers of dht usage can be interesting.  
<br>
This library listens for these info hashes and resolves the meta data associated with them before triggering a *content* event with the data.

## Usage
The *content:data* event is really the most interesting. The others are provided just to allow you to peek under the hood.
```js
var listener = new BtappContent();
listener.on('content:data', function(torrent) {
  //process the information here
});
```

## Events
- *content:dht*  
  Simply your notice that the javascript library is setting its hook into the dht system.
- *content:hash*  
  Called with a hash that was seen being searched for via the dht. Duplicates are likely. 
- *content:torrent*  
  Called once the underlying client has added a magnet link with hashes from the *content:hash* event.
- *content:metadata*  
  Called when the torrent metadata for a magnet link has been aquired from swarm peers.
- *content:data*  
  Called with the torrent file object once metadata has been resolved, and its state is completely bubbled up to javascript. At this point file/properties information is guaranteed to be available. At this point the torrent is already is the stopped (*not downloading*) state, and once this event is triggered the torrent will be deleted. This is the recommended time to store/keyword index the metadata.
- *content:remove*  
  Called once the torrent file has been successfully removed.