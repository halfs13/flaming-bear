var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var tweetModel = {
    createdDate: {type: Date, "default": Date.now, index: true},
    updatedDate: {type: Date, "default": Date.now},
    text: {type: String, required:true},
    twitter_id: {type: Number, required:true},
    time: {type:Date, required:true},
    retweet_count: {type:Number, "default": 0, required:true},
    favorite: {type: Boolean, required:true},
    mentions: {type: [Number], required:false},
    hashtags: {type: [String], required:false}
};

var tweetSchema = new Schema(tweetModel);
var tweets = mongoose.model('tweet', tweetSchema);

exports.tweets = tweets;