var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');
var java = require('java');


var host = "localhost";
var port = 27017;
var db = "twitter_stats";

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
    models.tweets.find({'processed': {$ne: true}}).sort({_id: 1}).skip(3).limit(1).exec(function(err, tweet) {
        tweet = tweet[0];

        if(skipCount % 20 === 0){
            var date2 = new Date();
            var seconds = (date2.getTime() - date1.getTime()) / 1000;
            console.log(skipCount + ": " + tweet._id + " --- " + skipCount/seconds + "records/second");
        }

        async.parallel([function(posCallback) {
            posTagSentences(tweet.text, function(err, value) {
                if(typeof(toSave[value]) !== 'undefined') {
                    //console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Exists in local");
                    tweet.pos_type = toSave[value]._id;
                    posCallback();
                } else {
                    models.nlpString.find({type: 'pos', value: value}, function(err, nlp) {
                        if(nlp.length > 0) {
                            //console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Exists in db");
                            tweet.pos_type = nlp[0]._id;

                            toSave[value] = {};
                            toSave[value]._id = nlp[0]._id

                            posCallback();
                        } else {
                            //console.log("need to create");
                            var newNlp = new models.nlpString({
                                type: 'pos',
                                value: value,
                                count: 1
                            });
                            newNlp.save(function(err) {
                                tweet.pos_type = newNlp._id;
                                toSave[value] = {};
                                toSave[value]._id = newNlp._id;

                                posCallback();
                            });
                        }
                    });
                }
            });
        }, function(annotationCallback) {
            parseToAnnotationGraphs(tweet.text, function(err, value) {
                if(typeof(toSave[value]) !== 'undefined') {
                    //console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Exists in local");
                    tweet.annotation_type = toSave[value]._id;
                    annotationCallback();
                } else {
                    models.nlpString.find({type: 'annotation_graph', value: value}, function(err, nlp) {
                        if(nlp.length > 0) {
                            //console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Exists in db");
                            tweet.annotation_type = nlp[0]._id;

                            toSave[value] = {};
                            toSave[value]._id = nlp[0]._id

                            annotationCallback();
                        } else {
                            //console.log("need to create");
                            var newNlp = new models.nlpString({
                                type: 'annotation_graph',
                                value: value,
                                count: 1
                            });
                            newNlp.save(function(err) {
                                tweet.annotation_type = newNlp._id;
                                toSave[value] = {};
                                toSave[value]._id = newNlp._id;

                                annotationCallback();
                            });
                        }
                    });
                }
            });
        }], function(err) {
            tweet.pos_type = (tweet.pos_type ? tweet.pos_type : null);
            tweet.annotation_type = (tweet.annotation_type ? tweet.annotation_type : null);
            tweet.dependency_type = (tweet.dependency_type ? tweet.dependency_type : null);
            tweet.child_type =  (tweet.child_type ? tweet.child_type : null);
            tweet.dot_product_type = (tweet.dot_product_type ? tweet.dot_product_type : null);
            tweet.edge_vertex_type = (tweet.dot_product_type ? tweet.dot_product_type : null);
            tweet.processed = true;

            //console.log(tweet);

            tweet.save(function(err) {
                if(skipCount < 1000000) {
                    checkTweet();
                } else {
                    var ids = Object.keys(toSave);
                    console.log("Exiting");
                    process.exit(0);
                }
            });
        });
    });
    skipCount++;
};

var date1 = new Date();
checkTweet();
