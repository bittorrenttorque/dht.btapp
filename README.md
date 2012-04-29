# Btapp Content

## What do I see
You'll see random torrent file meta data json blobs. This included file names, size. You won't see peers, swarm size, or anything else that can be used for potentially privacy theatening activity (though this is due entirely to the underlying infrastructure).

## How it works
The underlying torrent client takes part in the underlying distributed hash table, which is a completely distributed key value store, used for connecting peers looking for a common torrent info hash (a 120 bit value unique to each torrent file). Taking part in this network means that your client is helping fulfill these lookups. Because it is completely distributed, you don't know who is looking for what, and you'll only see a small slice of the content being searched for. However, due to scale of use, even non-representative slivers of dht usage can be interesting.  
<br>
This library listens for these info hashes and resolves the meta data associated with them before triggering a *content* event with the data.

## Usage
Just 