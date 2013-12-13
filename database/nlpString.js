var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var nlpStringModel = {
    createdDate: {type: Date, "default": Date.now, index: true},
    updatedDate: {type: Date, "default": Date.now},
    type: {type: String, required:true,
        enum: ["pos", "annotation_graph", "dependency_graph", "children_string",
                "dot_product_graph", "edge_vertex_string"]},
    value: {type:String, required:true},
    count: {type:Number, "default": 0, required:true}
};

var nlpStringSchema = new Schema(nlpStringModel);
var nlpString = mongoose.model('nlpString', nlpStringSchema);

exports.nlpString = nlpString;