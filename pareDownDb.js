var async = require('async');

var host = "localhost";
var port = 27017;
var db = "paredown"


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var connectString = 'mongodb://' + host + ':' + port + '/' + db;
mongoose.connect(connectString, function(err) {
	if (err !== undefined) {
        console.log('Unable to connect to ' + connectString);
        throw err;
	} else {
        console.log('Connected to ' + connectString);                        
	}
});

var rawFeedModel = {
        createdDate: {type: Date, "default": Date.now, index: true},
        updatedDate: {type: Date, "default": Date.now},
        text: {type: String, required: true},
        feedSource: {type: String, enum: ['Twitter', 'Email', 'RSS'], required: true, index: true}
};

var rawFeedSchema = new Schema(rawFeedModel);
var rawFeed = mongoose.model('rawFeed', rawFeedSchema);

var alphaReportModel = {
        createdDate: {type: Date, "default": Date.now},
        updatedDate: {type: Date, "default": Date.now},
        raw_data_id: {type: ObjectId},
        source_name: {type: String, enum: ['Twitter', 'Email', 'RSS'], required: true},
        source_id: {type: String, required: true}, //FIXME   what is this? id from source
        message_date: {type: Date},
        message_body: {type: String},
        reporter_id: {type: ObjectId},
        location_name: {type: String}, //FIXME   why is this here? name from twitter
        longitude: {type: Number},
        latitude: {type: Number},
        radius: {type: Number},
        utc_offset: {type: Number},
        time_zone: {type: String},
        lang: {type: String}
};

var AlphaReportSchema = new Schema(alphaReportModel);
var alphaReport = mongoose.model('AlphaReport', AlphaReportSchema);

var assertionModel = {
        createdDate: {type: Date},
        updatedDate: {type: Date},
        alpha_report_id: {type: Schema.Types.ObjectId, required: true},
        reporter_id: {type: Schema.Types.ObjectId},
        entity1: {type: String, required: true},
        relationship: {type: String, required: true},
        entity2: {type: String, required: true}
};
var AssertionSchema = new Schema(assertionModel);
var assertion = mongoose.model('Assertion', AssertionSchema);



var start = new Date("09/16/2013").getTime();


var pareDown = function(skip) {
	console.log("Checking range " + skip + "::" + (skip+1000));

	rawFeed.find({}).sort({_id:1}).skip(skip).limit(1000).execFind(function(err, results) {
		async.each(results, function(rawfeed, callback) {
			var thisDate = new Date(rawfeed.createdDate).getTime();
			if(thisDate < start) {
				var rawfeedID = rawfeed._id;
				rawFeed.remove({_id:rawfeed._id}, function() {
					alphaReport.find({raw_data_id: rawfeedID}, function(err, docs) {
						if(docs.length > 0) {
							var alphaID = docs[0]._id;
							alphaReport.remove({_id: alphaID}, function() {
								assertion.find({alpha_report_id:alphaID}, function(err, adoc) {
									if(adoc.length > 0) {
										assertion.remove({_id:adoc[0]._id}, function() {
											callback();
										});
									} else {
										callback();
									}
								});
							});
						} else {
							callback();
						}
					})
				});
			} else {
				//console.log("Date is not older");
				alphaReport.find({raw_data_id: rawfeed._id}, function(err, docs) {
					//console.log("callback" + docs.length);
					if(docs.length > 0) {
						var doc = docs[0];
						doc.createdDate = rawfeed.createdDate;
						doc.save(function(err) {
							//console.log(err)
							assertion.find({alpha_report_id:doc._id}, function(err, adocs) {
								if(adocs.length > 0) {
									var adoc = adocs[0];

									adoc.createdDate = rawfeed.createdDate;
									adoc.save(function() {

										callback();
									})
								} else {
									callback();
								}
							})
						})
					} else {
						callback();
					}
				});
			}
		}, function() {
			rawFeed.count(function(err, c) {
				if((skip + 1000) < c) {
					console.log("calling next 1k");
					pareDown(skip+1000);
				} else {
					process.exit(0);
				}
			})
		})
	})
}

pareDown(0);