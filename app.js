//declare the variables that we will need
var
    http = require ('http'),
    express = require('express'),
    app = express(),
    url = require('url'),
    mongoose = require ("mongoose"),
    dbConnString = 'mongodb://localhost/myMongooseDb',
    salesSchema = null,
    salesMember = null,
    utils = {},//stub, will be etended later
    initApp = function(){
        //create the http server and start it
        http.createServer(app).listen(app.get('port'),function(){
            //a message to indicate a successful startup of the http server
            console.log('Your Node.js application is listening on port #: ' + app.get('port'));
        });
    };

//database implementation

//connect to the database
mongoose.connect(dbConnString,function(err, res){
    if (err){
        console.log ('ERROR connecting to: ' + dbConnString + '! ' + err);
    } else {
        console.log ('Successfully connected to: ' + dbConnString);
    }
});

//define the schema to use
salesSchema = new mongoose.Schema({
    name: {
        first: String,
        last: String
    },
    phone: String
});

//define the data model, using the schema that we just created
salesMember = mongoose.model('Sales', salesSchema);

//express module implementation

//set the port to 5000
app.configure(function(){
    app.set('port',5000);
});

//default
app.get("/",function(req,res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    var str = '<h1>Welcome to your simple JSONP Service</h1>'
        + '<b><a href="/json">View JSON Data</a>   <a href="/json/delete">Delte all JSON Data</a></b>'
        + '<p><b>To make a JSONP call:</b> /json?callback=CALLBACKNAME</p>'
        + '<p><b>To add a user:</b> /addUser?fname=FIRSTNAME&lname=LASTNAME&phone=PHONENUMBER</p>';

    //end the request with the home page html
    res.end(str);
})

//delte all data in the database
app.get("/json/delete",function(req,res){
    //we'll need the response object and the data model
    utils.deleteAllData(res,salesMember);
})

//respond to request for /json
app.get("/json",function(req,res){
    //return every record in the database
    salesMember.find({}).exec(function (err, result) {
        var str = null;

        if (!err) {
            //stringify the database search result
            str = JSON.stringify(result, undefined, 2);

            //if a json callback was provided in the query string
            if(utils.isJsonCallback(req)){
                //wrap the json data with the named callbacck
                str = utils.wrapDataInCallback(req,str);
            };

            //deliver the json
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(str);
        } else {
            res.end("Error in first query. " + err)
        };
    });
})

//add user 
app.get("/addUser",function(req,res){
    var
        str = null,
        menu = "<br /><br /><b><a href=\"/\">Home</a>   <a href=\"/json\">View JSON Data</a></b>",
        url_parts = url.parse(req.url, true),
        query = url_parts.query,
        fname = query.fname,
        lname = query.lname,
        phone = query.phone,

        //add a new document to the collection
        newUser = new salesMember ({
            name: { first: fname, last: lname },
            phone: phone
        });

    //save the new document
    newUser.save(function (err) {
        if (err) console.log ('Error on save!')
    });

    //prepare the response
    res.writeHead(200, {'Content-Type': 'text/html'});

    str = ''
        + '<h1>New User Added!</h1><b>First Name -></b> ' + fname
        + '<br /><br /><b>Last Name -></b> ' + lname
        + '<br /><br /><b>Phone -></b> ' +  phone
        + '<br /><br /><b>This user\'s id is:</b> ' + newUser._id
        + menu;

    //send the response
    res.end(str);
});

//utility functions

//returns the name of the JSON callback, if there is one
utils.getJsonCallbackName = function(req){
    var url_parts = url.parse(req.url, true),
        query = url_parts.query;

    if(!url_parts.query || !url_parts.query.callback){return false};

    return url_parts.query.callback;
};

//takes the passed-in string and returns it
//wrapped in the callback name
utils.wrapDataInCallback = function(req,str){
    var
        start = utils.getJsonCallbackName(req) + '(',
        end = ')';

    return start + str + end;
};

//returns true if the query string contains a "callback" parameter
utils.isJsonCallback = function(req){
    var retVal = utils.getJsonCallbackName(req);

    if(retVal){return true};

    return false;
};

//deletes all data in the passed-in model
utils.deleteAllData = function(res,model){
    var successMessage = ''
        + '<h1 style="color:red">All data has been deleted from the database!</h1>'
        + '<b><a href="/">Home</a></b>';

    //delete all data
    model.remove({}, function(err) {
        if (err) {
            console.log ('There was an error deleting the old data.');
        } else  {
            console.log ('Successfully deleted the old data.');
            res.end(successMessage);
        }
    });
};

//start the application
initApp();