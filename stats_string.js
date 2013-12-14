var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');
var java = require('java');


var host = "localhost";
var port = 27017;
var db = "twitter_stats_61";

var connectString = 'mongodb://' + host + ':' + port + '/' + db;
mongoose.connect(connectString, function(err) {
    if (err !== undefined) {
        console.log('Unable to connect to ' + connectString);
        throw err;
    } else {
        console.log('Connected to ' + connectString);
    }
});
var models = require('./database/models');

java.classpath.push('./java_lib/Triplet_Extraction.jar');

var Parser = java.import('com.nextcentury.TripletExtraction.CoreNlpParser');
var parser = new Parser();

var PosTagger = java.import('com.nextcentury.TripletExtraction.CoreNlpPOSTagger');
var posTagger = new PosTagger();

var ArrayList = java.import('java.util.ArrayList');
var Triplet = java.import('com.nextcentury.TripletExtraction.Triplet');

var posTagSentences = function(sentence, callback) {
    posTagger.getTagString(sentence, callback);
};

var parseToAnnotationGraphs = function(sentence, callback) {
    parser.getAnnotationTreeString(sentence, true, callback);
};

var parseToDependencyGraphs = function(sentence, callback) {
    parser.getTextDependencyTree(sentence, callback);
};

var parseRootChildData = function(sentence, callback) {
    parser.getRootChildrenAsString(sentence, callback);
};

var parseToDotProductGraph = function(sentence, callback) {
    parser.getDotNotation(sentence, callback);
};

var parseToEdgeVertex = function(sentence, callback) {
    parser.getEdgeVertexNotationAsString(sentence, callback);
};

var skipCount = 0; //derr dont need to update thi when using  the ne selector
var toSave = {};

var checkTweet = function() {
    models.tweets.find({'string_processed': {$ne: true}}).sort({_id: 1}).skip(0).limit(100).exec(function(err, tweets) {
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
};

var date1 = new Date();
checkTweet();
