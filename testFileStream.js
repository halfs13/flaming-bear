var fs = require('fs');
var readline = require('readline');
var stream = require('stream');

var instream = fs.createReadStream('data/testfile');
var outstream = new stream;
var rl = readline.createInterface(instream, outstream);

var newline = "";

rl.on('line', function(line) {
    // process line here
    if(line.indexOf("Origin: ") !== -1) {
        console.log(line);
        newline = line.substring(8, line.length);
        console.log(newline);
    }
});

rl.on('close', function() {
    // do something on finish here
});