var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var twitterUserModel = {
    createdDate: {type: Date, "default": Date.now, index: true},
    updatedDate: {type: Date, "default": Date.now},
    twitter_id: {type: Number, required: true},
    user_name: {type: String, required: true},
    friend_count: {type: Number, required: false},
    follower_count: {type: Number, required: false},
    status_count: {type: Number, required: false},
    favorite_count: {type: Number, required: false},
    account_age: {type: Date, required: false},
    location_string: {type: String, required: false}
};

var twitterUserSchema = new Schema(twitterUserModel);
var twitterUser = mongoose.model('twitterUser', twitterUserSchema);

exports.twitterUser = twitterUser;