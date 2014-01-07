var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');
var java = require('java');

var dbs = ['16_20'];
var dbIndex = 0;

var host = "localhost";
var port = 27017;
var base_db_string = "twitter_stats_";

var models;

var totalSaved = 0;
var start = new Date().getTime();
var last = new Date().getTime();

var connectDB = function(dbIndex, connectCallback){
    var db = base_db_string + dbs[dbIndex];

    var connectString = 'mongodb://' + host + ':' + port + '/' + db;

    mongoose.connect(connectString, function(err) {
        if (err !== undefined) {
            console.log('Unable to connect to ' + connectString);
            throw err;
        } else {
            console.log('Connected to ' + connectString);
        }
        connectCallback();
    });

    models = require('./database/models');
}

var connectNextDB = function() {
    mongoose.connection.close();
    mongoose.disconnect();
    /*if(dbIndex < dbs.length) {
        dbIndex++;
        connectDB(dbIndex, quickProcess);
    } else {*/
        saveAnnotations();
    //}
}

var counts = mongoose.createConnection('mongodb://'+host+':'+port+'/stats_counts');

var annotation_type = counts.model('Model', new mongoose.Schema({
    createdDate: {type: Date, "default": Date.now, index: true},
    updatedDate: {type: Date, "default": Date.now},
    type: {type: String, required:true,
        enum: ["pos", "annotation_graph", "dependency_graph", "children_string",
                "dot_product_graph", "edge_vertex_string"]},
    value: {type:String, required:true},
    count: {type:Number, "default": 0, required:true}
}));

var processTotals = function() {
    //console.log("good");
    console.log(((totalSaved/((new Date().getTime()) - start)) * 1000) + " saved/second");

    models.tweets.find({'processed': {$ne: true}})/*.sort({annotation_string: 1})*/.skip(0).limit(1).exec(function(err, tweets) {
        //console.log(tweets[0]);
        //console.log("Find complete");
        if(tweets.length > 0) {
            var annotation = tweets[0].annotation_string;
            models.tweets.find({annotation_string: annotation}, function(err, sameTweets) {
                annotation_type.find({type:"annotation_graph", value: annotation}, function(err, docs){
                    //console.log(docs.length);

                    if(docs.length > 0) {
                        console.log(docs.length + " annotations found; adding to count");
                        docs[0].count += sameTweets.length;
                        docs[0].save(function(err) {
                            console.log("Need to save " + sameTweets.length);
                            var count = 0;
                            async.each(sameTweets, function(tw, callback){
                                tw.annotation_type = docs[0]._id;
                                tw.processed = true;
                                tw.save(function(err) {
                                    count++;
                                    totalSaved++;
                                    console.log(count);
                                    callback();
                                });
                            }, function() {
                                processTotals();
                            });
                        });
                    } else {
                        console.log("Saving new annotation");
                        var newNlp = new annotation_type({
                            type: 'annotation_graph',
                            value: annotation,
                            count: sameTweets.length
                        });

                        newNlp.save(function(err) {
                            console.log("Need to save " + sameTweets.length);
                            var count = 0;
                            async.each(sameTweets, function(tw, callback){
                                tw.annotation_type = newNlp._id;
                                tw.processed = true;
                                tw.save(function(err) {
                                    count++;
                                    totalSaved++;
                                    console.log(count);
                                    callback();
                                });
                            }, function() {

                                processTotals();
                            });
                        });
                    }
                });
            });
        } else {
            console.log("Connecting Next db");
            connectNextDB();
        }
    });
};


var annotations = {};
var skip = 0;
var limit = 50000;

var quickProcess = function() {
    //console.log("good");
    var now = new Date().getTime();
    console.log(totalSaved + " at " + ((totalSaved/(now - start)) * 1000) + " saved/second -- " + ((limit/(now - last))*1000) + "/s since last");
    last = now;

    models.tweets.find({/*'processed': {$ne: true}*/})/*.sort({annotation_string: 1})*/.skip(skip).limit(limit).exec(function(err, tweets) {
        //console.log(tweets[0]);
        //console.log("Find complete");
        if(tweets.length > 0) {
            async.each(tweets, function(tw, callback) {
                if(typeof(annotations[tw.annotation_string]) !== 'undefined') {
                    totalSaved++;
                    annotations[tw.annotation_string]++;
                } else {
                    totalSaved++;
                    annotations[tw.annotation_string] = 1;
                }
                /*models.tweets.remove({_id: tw._id}, function() {
                    //console.log(totalSaved);
                    callback();
                })*/
                callback();
            }, function(err) {
                skip += limit;
                quickProcess();
                //saveAnnotations();
            });
        } else {
            console.log("Connecting Next db");
            console.log(Object.keys(annotations).length);
            connectNextDB();
        }
    });
}

var saveAnnotations = function() {
    async.each(Object.keys(annotations), function(key, callback) {
        console.log('"' + key + '", ' + annotations[key]);
        callback();
    }, function() {
        process.exit(0);
    });

};

//connectDB(0, processTotals);
connectDB(0, quickProcess);

/*var checkTweet = function() {
    models.tweets.find({'string_processed': {$ne: true}}).sort({_id: 1}).skip(0).limit(2000).exec(function(err, tweets) {
        //tweet = tweet[0];
        if(tweets.length === 0) {
            process.exit(0);
        }

        async.each(tweets, function(tweet, eachTweetCallback) {
            async.parallel([function(posCallback) {
                posTagSentences(tweet.text, function(err, value) {
                    tweet.pos_string = value;
                    posCallback();
                });
            }, function(annotationCallback) {
                parseToAnnotationGraphs(tweet.text, function(err, value) {
                    tweet.annotation_string = value;
                    annotationCallback();
                });
            }], function(err) {
                tweet.pos_type = (tweet.pos_type ? tweet.pos_type : null);
                tweet.annotation_type = (tweet.annotation_type ? tweet.annotation_type : null);
                tweet.dependency_type = (tweet.dependency_type ? tweet.dependency_type : null);
                tweet.child_type =  (tweet.child_type ? tweet.child_type : null);
                tweet.dot_product_type = (tweet.dot_product_type ? tweet.dot_product_type : null);
                tweet.edge_vertex_type = (tweet.dot_product_type ? tweet.dot_product_type : null);
                tweet.processed = false;
                tweet.single_processed = false;
                tweet.string_processed = true;

                //console.log(tweet);

                tweet.save(function(err) {
                    //console.log(err);

                    if(skipCount % 20 === 0){
                        var date2 = new Date();
                        var seconds = (date2.getTime() - date1.getTime()) / 1000;
                        console.log(skipCount + ": " + tweet._id + " --- " + skipCount/seconds + "records/second");
                    }

                    skipCount++;
                    eachTweetCallback();
                });
            });
        }, function() {
            if(skipCount < 1000000) {
                checkTweet();
            } else {
                var ids = Object.keys(toSave);
                console.log("Exiting");
                process.exit(0);
            }
        });
    });
};*/