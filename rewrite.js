// Config and dependencies
var request = require('request');
var ProgressBar = require('progress');
var fs = require('fs');
var async = require('async');
var cheerio = require('cheerio');
var https = require('https');
var uuidv4 = require('uuid/v4');
var moment = require('moment');
var os = require('os');
var path = require('path');
console.log(os.platform());
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

				var configURL = 'http://' + publicip + ':8000/setup/' + configID;
				var localConfigURL = 'http://' + ip.address() + ':8000/setup/' + configID;

				console.log('First start or app not setup, go to this URL to config:');
				console.log('External server:',configURL);
				console.log('Local server:',localConfigURL);

				app.route('/setup/'+configID)
					.get(function(req,res){
						res.sendFile(__dirname + '/web/html/setup.html');
					})
					.post(function(req,res){
						console.log(req.query);
						config = {
							'auth': req.query.lttForumLogin,
							'password': req.query.lttForumPassword,
							'videoQuality': req.query.quality,
							'plexFolder': req.query.dlPath,
							'lttFolderName': 'Linus Tech Tips/',
							'tqFolderName': 'Techquickie/',
							'csfFolderName': 'Channel Super Fun/',
							'keepTime': 30
						};
						db.config.insert(config,function(err,newDoc) {
							console.log(newDoc._id);
							setTimeout(function () {
								res.status(201).send('Query recevied');
							}, 5000);
							resolve(newDoc);
						});
					});
				app.get('/setup/path', function(req,res) {
					if (os.platform() === 'win32'){
						res.status(201).send(path.normalize(__dirname + '\\'));
					} else {
						res.status(201).send(__dirname + '/');
					}

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
				refreshPostList(function(newVideos) {
					res.send(newVideos);
				});
			});
			app.get('/library/all',function(req,res) {
				db.library.find({}).sort({date:-1}).exec(function(err,docs){
					res.send(docs);
				});
			});

			app.route('/library/byVideoId/:videoID')
				.get(function(req,res) {
					videoID = parseFloat(req.params.videoID);
					db.library.findOne({'videoID':videoID},function(err,doc){
						res.send(doc);
					});
				})
				.post(function(req,res) {
					// Download a video
					downloadVideos(req.params.videoID,function(callback) {
						res.send(callback);
					});
				})
				.put(function(req,res) {
					// Update a specific video metadata
				})
				.delete(function(req,res) {
					// Delete a specific video
					console.log('Delete video triggered for:',req.params.videoID);
				});

			app.route('/library/byChannel/:channelName')
				.get(function(req,res) {
					db.library.find({'channel':req.params.channelName},function(err,docs){
						res.send(docs);
					});
				});

			app.post('/library/add',function(req,res) {
				// Manually add a video from a Forum URL
			});
			app.get('/settings',function(req,res){
				res.sendFile(__dirname + '/web/html/settings.html');
			});
			app.route('/settings/config')
				.get(function(req,res) {
					configWithoutPass = config;
					configWithoutPass.password = 'xxx';
					res.send(configWithoutPass);
				})
				.post(function(req,res) {
					// Update config
				});
			var localURL = 'http://' + ip.address() + ':8000/';
			console.log('Server up and running at:',localURL);
		});
	});

function videoTypeFolderFun(type) {
	if (type == 'LTT') {
		return config.lttFolderName;
	} else if (type == 'CSF') {
		return config.csfFolderName;
	} else if (type == 'TQ') {
		return config.tqFolderName;
	}
}
function parseTypeForTitle(type){
	if (type == 'LTT') {
		return 'Linus Tech Tips';
	} else if (type == 'CSF') {
		return 'Channel Super Fun';
	} else if (type == 'TQ') {
		return 'Techquickie';
	}
}

function refreshPostList(callback) {
	var interval = 1 * 500;
	var newVideosDatas = new Array();
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
			postPromiseList = new Array();
			requestPost = new Array();
			for (let i = 1; i < 11; i++) {
				requestPost[i] = new Promise(function(resolve,reject){
					setTimeout(function() {
						console.log('Start requesting:', postTitleContainer[i].attribs.href);
						request({url: postTitleContainer[i].attribs.href, jar: cookiejar}, function (error, response, body) {
							var $ = cheerio.load(body);


							// Get all values and save them in a json
							//videoGUID = $('.floatplane-script').data('videoGuid'); // VideoID value
							linkRegEx = new RegExp('.+(player/)');
							videoGUID = $('iframe','.video-container').attr('src').replace(linkRegEx,'');

							request({url:'https://cms.linustechtips.com/get/videos/by_guid/' + videoGUID, jar: cookiejar}, function (error,response,body) {
								values = JSON.parse(body);

								// Parsing values for filename
								bannedFilenameChars = new RegExp(/[^a-zA-Z0-9.() ]/g);
								parsedTitleForFile = values.title.replace(bannedFilenameChars, '');

								channelForFile = parseTypeForTitle(values.channel);

								// Filenames (final and temp.)
								fileName = channelForFile + ' - ' + moment(values.added_date).format('YYYY-MM-DD') + ' - ' + parsedTitleForFile + '.mp4';
								fileNameNotEdited = channelForFile + ' - ' + moment(values.added_date).format('YYYY-MM-DD') + ' - ' + parsedTitleForFile + ' - NOT EDITED.mp4';

								linksAndTitles[i] = {
									videoID:values.id_video, // ID used for this loop
									title:values.title, // Title
									channel:values.channel, // If it's a LTT or CSF or TQ video
									description:values.description,
									filename:fileName, // Final filename
									filenameTest:fileNameNotEdited, // Temp filename
									postURL:postTitleContainer[i].attribs.href, // Forum post link (unused)
									date:moment(values.added_date).format('YYYY-MM-DD'), // Release date
									dateTime:values.added_date,
									timestamp:moment(values.added_date).format('x'),
									guid:values.guid, // Video ID
									thumbnail:'https://cms.linustechtips.com/get/thumbnails/by_guid/' + values.guid,
									dlURL:'', // Video download URL
									downloaded:false,
								};
								if (values.guid !== undefined) {
									// Declare vars
									videoQuality = config.videoQuality;
									getDlUrl = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid=' + values.guid + '&video_quality='+ videoQuality +'&download=1';
									request({url: getDlUrl, jar:cookiejar}, function (error, response, body) {
										linksAndTitles[i].dlURL = body;
										db.library.findOne({'videoID':linksAndTitles[i].videoID},function(err,doc){
											if (doc === null) {
												db.library.insert(linksAndTitles[i],function(err,newDoc){
													console.log(newDoc._id);
													newVideosDatas.push(newDoc);
													resolve(true);
												});
											}
											else {
												resolve(true);
											}
										});

									});
								}
							});
						});
					}, interval * i, i); // This sets an incremental interval depending on postID (to make a synchronious call in native js)
				});
				postPromiseList.push(requestPost[i]);
			}
			Promise.all(postPromiseList).then(function(values) {
				callback(newVideosDatas);
			});
		}
	);
}

function downloadVideos(videoID, callbackList) {
	maxTime = moment().subtract(config.keepTime,'days').format('x');
	downloadedVideos = new Array();

	if (videoID === 'auto') {
		db.library.find({'downloaded':false,'timestamp':{$gte:maxTime}}).exec(function(err,docs) {
			async.eachSeries(docs,function(file,callback){
				// Start downloading file
				videoTypeFolder = videoTypeFolderFun(file.channel);
				request(file.dlURL)
					.on('response', function (res) {
						console.log(file.filenameTest);
						// Create a ProgressBar to know download status
						len = parseInt(res.headers['content-length'], 10);
						bar = new ProgressBar('Downloading: [:bar] :percent :etas',{
							complete: '=',
							incomplete: ' ',
							width: 30,
							total: len
						});

						// Write the incoming flux into an intermediary file
						res.pipe(fs.createWriteStream(config.plexFolder + videoTypeFolder + file.filenameTest));
					})

				// When receving data, make ProgressBar... Progress...
					.on('data', function(chunk) {
						bar.tick(chunk.length);
					})

				// When file finished to download
					.on('end', function(){
						console.log('\n');
						createdDate = file.date + 'T00:00:00';

						// Create a metadata object containing important metadatas
						metadata = {
							title: file.title,
							creation_time: createdDate
						};

						// Set ffmpeg path and arguments then launch it.
						cmd = '"' + ffmpegStatic.path + '"';
						args = ' -i "' + config.plexFolder + videoTypeFolder + file.filenameTest + '" -y -acodec copy -vcodec copy -metadata title="' + file.title + '" -metadata creation_time="' + createdDate + '" "' + config.plexFolder + videoTypeFolder + file.filename + '"';
						exec(cmd + args , function(error,stdout,stderr){
							if (error) {
								// Error while adding metadatas
								console.log('ffmpegError:',error);
								// Delete temporary file
								fs.unlinkSync(config.plexFolder + videoTypeFolder + file.filenameTest);
								// Send callback to take care of the next json file
								callback();
							}
							else {
								// Finished to add metadatas
								console.log('ffmpegSuccess for file:',file.filename);
								// Delete temporary file
								fs.unlinkSync(config.plexFolder + videoTypeFolder + file.filenameTest);
								// Set video as downloaded
								db.library.update({'videoID':file.videoID},{$set:{downloaded:true}},{},function() {
									// Send callback to edit the next video
									downloadedVideos.push(file.videoID);
									callback();
								});
							}
						});
					});
			}, function(err){
				if (err === null) {
					console.log('Finished downloading videos:',downloadedVideos);
					callbackList('Finished downloading videos: ' + downloadedVideos);
				}
			});
		});
	}

	else {
		videoIDFloat = parseFloat(videoID);
		db.library.findOne({'videoID':videoIDFloat}).exec(function(err,doc){
			if(doc.downloaded === true){
				console.log('Video '+ doc.videoID +' already downloaded. Skip it...');
			}
			else{
				// Start downloading file
				videoTypeFolder = videoTypeFolderFun(doc.channel);
				request(doc.dlURL)
					.on('response', function (res) {
						console.log(doc.filenameTest);
						// Create a ProgressBar to know download status
						len = parseInt(res.headers['content-length'], 10);
						bar = new ProgressBar('Downloading: [:bar] :percent :etas',{
							complete: '=',
							incomplete: ' ',
							width: 30,
							total: len
						});

						// Write the incoming flux into an intermediary file
						res.pipe(fs.createWriteStream(config.plexFolder + videoTypeFolder + doc.filenameTest));
					})

				// When receving data, make ProgressBar... Progress...
					.on('data', function(chunk) {
						bar.tick(chunk.length);
					})

				// When file finished to download
					.on('end', function(){
						console.log('\n');
						createdDate = doc.date + 'T00:00:00';

						// Create a metadata object containing important metadatas
						metadata = {
							title: doc.title,
							creation_time: createdDate
						};

						// Set ffmpeg path and arguments then launch it.
						cmd = '"' + ffmpegStatic.path + '"';
						args = ' -i "' + config.plexFolder + videoTypeFolder + doc.filenameTest + '" -y -acodec copy -vcodec copy -metadata title="' + doc.title + '" -metadata creation_time="' + createdDate + '" "' + config.plexFolder + videoTypeFolder + doc.filename + '"';
						exec(cmd + args , function(error,stdout,stderr){
							if (error) {
								// Error while adding metadatas
								console.log('ffmpegError:',error);
								// Delete temporary file
								fs.unlinkSync(config.plexFolder + videoTypeFolder + doc.filenameTest);
							}
							else {
								// Finished to add metadatas
								console.log('ffmpegSuccess for file:',doc.filename);
								// Delete temporary file
								fs.unlinkSync(config.plexFolder + videoTypeFolder + doc.filenameTest);
								// Set video as downloaded
								db.library.update({videoID:doc.videoID},{$set:{downloaded:true}},{},function() {
									downloadedVideos.push(doc.videoID);
									callbackList('Finished downloading videos: ' + downloadedVideos);
								});
							}
						});
					});
			}
		});
	}
}
