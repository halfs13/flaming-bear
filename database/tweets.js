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
    hashtags: {type: [String], required:false},
    processed: {type: Boolean, "default": false},
    pos_type: {type: ObjectId},
    annotation_type: {type: ObjectId},
    dependency_type: {type: ObjectId},
    child_type: {type: ObjectId},
    dot_product_type: {type: ObjectId},
    edge_vertex_type: {type: ObjectId},
    single_processed: {type: Boolean, "default": false}
};

var tweetSchema = new Schema(tweetModel);
var tweets = mongoose.model('tweet', tweetSchema);

exports.tweets = tweets;