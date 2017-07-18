// Config and dependencies
var request = require('request');
var ProgressBar = require('progress');
var cheerio = require('cheerio');
var https = require('https');
var uuidv4 = require('uuid/v4');
var moment = require('moment');
// Databases
var Datastore = require('nedb'),
	db = {};
db.users = new Datastore({filename:'databases/users.db', autoload: true});
db.config = new Datastore({filename:'databases/config.db', autoload: true});
db.library = new Datastore({filename:'databases/library.db', autoload: true});

// Public-IP
var ip = require('ip');
var publicIp = require('public-ip');

// Webserver Stuff
var express = require('express');
var app = express();
app.use('/static', express.static('web/static'));
app.listen(8000);


// FFmpeg Stuff
var ffmpegStatic = require('ffmpeg-static');
var exec = require('child_process').exec;
process.env.FMPEG_PATH = ffmpegStatic.path;


// Initialize cookie container
var cookiejar = request.jar();

// Create a config container

var config;


// Check if it's our first launch and load config
var configPromise = new Promise(function(resolve,reject){
	db.config.find({}, function (err, docs) {
		if (docs.length === 0){
			// Config is not setup
			publicIp.v4().then(publicip => {
				const configID = uuidv4();

				var configURL = 'http://' + publicip + ':8000/' + configID;
				var localConfigURL = 'http://' + ip.address() + ':8000/' + configID;

				console.log('First start or app not setup, go to this URL to config:');
				console.log('External server:',configURL);
				console.log('Local server:',localConfigURL);

				app.route('/setup/'+configID)
					.get(function(req,res){
						res.sendFile(__dirname + '/web/html/setup.html');
					})
					.post(function(req,res){
						console.log(req.query);
						res.status(201).send('Query recevied: ' + JSON.stringify(req.query));
						config = {
							'auth': req.query.lttForumLogin,
							'password': req.query.lttForumPassword,
							'videoQuality': req.query.quality,
							'plexFolder': req.query.dlPath,
							'lttFolderName': 'Linus Tech Tips/',
							'tqFolderName': 'Techquickie/',
							'csfFolderName': 'Channel Super Fun/'
						};
						db.config.insert(config,function(err,newDoc) {
							console.log(newDoc._id);
							resolve(newDoc);
						});
					});
			});
		}
		else {
			console.log('Config file found');
			config = docs[0];
			resolve(docs[0]);
		}
	});
})
	.then(function(resolve,reject){
		config = resolve;
		// Create a login promise to be sure to be logged before doing anything
		var LoginPromise = new Promise(function(resolve,reject){
			// Set forum login url
			var loginURL = 'https://linustechtips.com/main/login/';

			// Do a first get so we have some values/cookies required to login
			request({url: loginURL,jar: cookiejar}, function (error, response, body) {
				// Do some log
				console.log('First login, grabing cookies and csrfKey...');
				if(error){reject(error,response);}

				// Load body and get csrfKey (form input identifier)
				var $ = cheerio.load(body);
				var csrfKeyInput = $('input[name=csrfKey]').val();
				console.log(csrfKeyInput);

				// Start login
				request.post({
					headers: {'content-type' : 'application/x-www-form-urlencoded'},
					url: loginURL,
					jar: cookiejar,
					form: {
						login__standard_submitted: '1',
						csrfKey: csrfKeyInput,
						auth: config.auth,
						password: config.password,
						remember_me: '1',
						remember_me_checkbox: '1',
						signin_anonymous: '0'
					}
				}, function(error, response, body){
					if(error){reject(error,response);}
					var $ = cheerio.load(body);
					if($('.ipsMessage_error')[0] !== undefined){
						errorMessage = $('.ipsMessage_error')[0].children[0].data;
						reject('Error on login: ' + errorMessage);
					}
					else {
						console.log('We are logged in!');
						resolve('logged');
					}
				});
			});
		});

		LoginPromise.catch(function(error){
			console.error('Error in LoginPromise:');
			console.error(error);
		});
		LoginPromise.then(function(resolve){
			// Create mains routes to web pages and API endpoints
			app.route('/')
				.get(function(req,res){
					res.sendFile(__dirname + '/web/html/home.html');
				});

			app.route('/library')
				.get(function(req,res){
					res.sendFile(__dirname + '/web/html/library.html');
				});
			app.get('/library/refresh',function(req,res) {
				res.send('Refresh page');
				refreshPostList();
			});
			app.get('/library/byVideoId/:videoID',function(req,res) {
				videoID = parseFloat(req.params.videoID);
				db.library.findOne({'videoID':videoID},function(err,doc){
					res.send(doc);
				});
			});
			app.get('/library/all',function(req,res) {
				db.library.find({},function(err,docs){
					res.send(docs);
				});
			});
			app.put('/library/byVideoId/:videoID',function(req,res) {
				// Update a specific video
			});
			app.delete('/library/byVideoId/:videoID',function(req,res) {
				// Delete a specific video
			});
			app.post('/library/add',function(req,res) {
				// Manually add a video from a Forum URL
			});
			app.route('/settings')
				.get(function(req,res){
					res.sendFile(__dirname + '/web/html/home.html');
				});

		});
	});


function refreshPostList() {
	var interval = 1 * 500;
	request({url: 'https://linustechtips.com/main/forum/91-the-floatplane-club/',jar: cookiejar},
		function (error, response, body) {
			console.log('error:', error); // Print the error if one occurred
			console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

			// Store html to the var
			floatplanePage = ''+ body;

			// Parse html to read DOM values
			var $ = cheerio.load(floatplanePage);

			// Target the postList
			var baseURLtarget = 'https://linustechtips.com/main/forum/91-the-floatplane-club/?page=1';
			var postList = $('div.ipsBox[data-baseurl="' + baseURLtarget + '"]').children('ol');

			// Get values in an array
			var postTitles = postList.children().children('div.ipsDataItem_main');
			var postTitleContainer = postTitles.children('h4').children('div').children('a');
			var postTimeContainer = postTitles.children('div').children('time');

			// Create an array to store post infos before saving them in json files
			var linksAndTitles = [];
			// Get and list 10 last posts
			for (let i = 1; i < 11; i++) {
				setTimeout(function() {
					console.log('Start requesting:', postTitleContainer[i].attribs.href);
					request({url: postTitleContainer[i].attribs.href, jar: cookiejar}, function (error, response, body) {
						var $ = cheerio.load(body);

						// Get all values and save them in a json
						videoGUID = $('.floatplane-script').data('videoGuid'); // VideoID value

						// Post URL
						postURL = postTitleContainer[i].attribs.href;

						request({url:'https://cms.linustechtips.com/get/videos/by_guid/' + videoGUID, jar: cookiejar}, function (error,response,body) {
							values = JSON.parse(body);

							// Parsing values for filename
							bannedFilenameChars = new RegExp(/[^a-zA-Z0-9.() ]/g);
							parsedTitleForFile = values.title.replace(bannedFilenameChars, '');

							// Filenames (final and temp.)
							fileName = values.channel + ' - ' + moment(values.added_date).format('YYYY-MM-DD') + ' - ' + parsedTitleForFile + '.mp4';
							fileNameNotEdited = values.channel + ' - ' + moment(values.added_date).format('YYYY-MM-DD') + ' - ' + parsedTitleForFile + ' - NOT EDITED.mp4';

							linksAndTitles[i] = {
								videoID:values.id_video, // ID used for this loop
								title:values.title, // Title
								channel:values.channel, // If it's a LTT or CSF or TQ video
								filename:fileName, // Final filename
								filenameTest:fileNameNotEdited, // Temp filename
								postURL:postURL, // Forum post link (unused)
								date:moment(values.added_date).format('YYYY-MM-DD'), // Release date
								dateTime:values.added_date,
								guid:values.guid, // Video ID
								thumbnail:'https://cms.linustechtips.com' + values.thumbnail,
								dlURL:'', // Video download URL
								downloaded:false,
							};
							if (values.id_video !== undefined) {
								// Declare vars
								videoQuality = config.videoQuality;
								getDlUrl = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid=' + values.guid + '&video_quality='+ videoQuality +'&download=1';
								request({url: getDlUrl, jar:cookiejar}, function (error, response, body) {
									linksAndTitles[i].dlURL = body;
									db.library.insert(linksAndTitles[i],function(err,newDoc){
										console.log(newDoc._id);
									});
								});
							}
						});
					});
				}, interval * i, i); // This sets an incremental interval depending on postID (to make a synchronious call in native js)
			}
			// Wait 30s and start downloading videos
			// TODO: Make it as a callback when json are all saved.
			setTimeout(function(){
				//downloadVideos();
			}, interval * 30);
		}
	);
}
