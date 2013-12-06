var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var mongoose = require('mongoose');
var async = require('async');


var host = "localhost";
var port = 27017;
var db = "twitter_stats"

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


//setup
var java = require('java');
java.classpath.push('./java_lib/twitter-stats.jar');
var Ingest = java.import('com.tadbitstrange.UDITwitterCrawlIngest');
//var ingest = new Ingest('/home/halfs13/workspace/flaming-bear/data/testfile');


// var processTweet = function() {
//     ingest.readTweet(function(err, tweet) {
//         console.log(tweet);
//         console.log(tweet.userId.longValue);
//     });
// };

var countComplete = 0;
var files = [];
var i = 9;
var j = 2;
var k = 3;

var readFileNames = function() {
    var stats = fs.readdirSync('/home/halfs13/Downloads/tweets/tweets/'+i+'/'+j+'/'+k);
    for(var index = 0; index < stats.length; index++) {
        files.push('/home/halfs13/Downloads/tweets/tweets/'+i+'/'+j+'/'+k+'/'+stats[index]);
    }

    processNextFile();
}


var nextFileNames = function() {
    if(k < 9) {
        k++
    } else {
        k = 0;
        if(j < 9) {
            j++;
        } else {
            j = 0;
            if(i < 9) {
                i++;
            } else {
                process.exit(0)
            }
        }
    }
    readFileNames();
}


var fileIndex = 192;//breaks on 193 & 212
var processNextFile = function() {
    if(fileIndex < files.length) {
        console.log("Opening file " + files[fileIndex])
        fileIndex++;
        processFile(files[fileIndex - 1]);
    } else {
        nextFileNames();
        //process.exit(0);
    }
}

var saveTweets = function(tweets) {
    async.each(tweets, function(tweet, eachCallback) {
        //console.log(tweet);

        var data = {
            text: tweet.text,
            twitter_id: tweet.userId.longValue,
            time: new Date(tweet.time),
            retweet_count: tweet.retweetCount.longValue,
            favorite: tweet.favorite,
            mentions: (tweet.mentions ? tweet.mentions.split(' ') : []),
            hashtags: (tweet.hashtags ? tweet.hashtags.split(' ') : [])
        };

        var newTweet = new models.tweets(data);
        newTweet.save(function(err) {
            ++countComplete
            //if(countComplete % 1000 === 0) {
                //console.log(countComplete);
            //}
            if (err) {
                console.log("Error saving tweet ")
                console.log(err);
            }
            eachCallback();
        });
    }, function(err) {
        processNextFile();
    });
};

var processTweets = function(ingest) {
    return ingest.readTweetsSync();
};

var processFile = function(fileName) {
    var ingest = new Ingest(fileName);
    var tweets = processTweets(ingest);
    if(tweets) {
        saveTweets(tweets);
    } else {
        //console.log("bad result calling next file");
        processNextFile();
    }
}
readFileNames();

// //use async.series here -- convert the other methods to take a callback
// for(var fileIndex = 0; fileIndex < files.length; fileIndex++) {
//     processFile(files[fileIndex]);
// }
