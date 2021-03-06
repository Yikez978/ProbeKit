var fs = require('fs');
var _ = require('underscore');
var argv = require('minimist')(process.argv.slice(2));
var MongoClient = require('mongodb').MongoClient;

var inputFile = argv.input || argv.i;
var collectionName = argv.collection || argv.c;

if (!inputFile || !collectionName) {
	console.log('Usage: match_probes_in_db.js -i <probes_csv> -c <collection>');
	process.exit(1);
}

fs.readFile(inputFile, { encoding: 'utf8'}, function(err, data){

	if (err) {
		console.log('[error] Could not load ' + inputFile);
		process.exit(1);
	}

	// Connection URL 
	var url = 'mongodb://localhost:27017/probe';
	// Use connect method to connect to the Server 
	MongoClient.connect(url, function(err, db) {
	  
		if (err) {
			console.log('[error] Cannot connect to MongoDB. Are you sure that there is a MongoDB server running?');
		  	process.exit(1);
		}
		
		db.collections(function(err, collections){

			if (err) {
				console.log('[error] Could not fetch database collection names.');
				db.close();
  				process.exit(1);
			}

			var nameFound = false;
			collections.forEach(function(collection, i){
				if (collection.s && collection.s.name && collection.s.name == collectionName) {
					nameFound = true;
				}
			});

			if (!nameFound) {
				console.log('[error] Collection \'' + collectionName + '\' does not exist.');
				db.close();
					process.exit(1);
			}

			console.log('[verbose] MongoDB connection established.');
			var collection = db.collection(collectionName);

			var csv = data.split('\n');
			var probedSSIDs = [];
			var matches = [];
		
			csv.forEach(function(probe){
				var arr = probe.split(',');
				if (arr.length == 3) {
					var ssid = arr[1];
					if (probedSSIDs.indexOf(ssid) == -1) probedSSIDs.push(ssid);
				}
			});

			probedSSIDs = _.uniq(probedSSIDs);

			afterComplete = _.after(probedSSIDs.length, complete);

			probedSSIDs.forEach(function(ssid, i){
				collection.findOne({ ssid: ssid }, function(err, result){
					
					if (err) throw err;
					if (result) {
						console.log(result.ssid);
						matches.push(result.ssid);
					}

					afterComplete(matches);
				});
			});
		});
	});
});

// fires when comparison is complete
function complete(matches) {
	console.log('[info] ' + matches.length + ' matching networks found.');
	process.exit(0);
}