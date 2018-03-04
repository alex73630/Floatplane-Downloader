// Config and dependencies
var request = require('request');
var ProgressBar = require('progress');
var fs = require('fs');
var cheerio = require('cheerio');
var https = require('https');
var async = require('async');

var ffmpegStatic = require('ffmpeg-static');
var exec = require('child_process').exec;
process.env.FMPEG_PATH = ffmpegStatic.path;

var config = require('./config.json');

// Create cookie container
var cookiejar = request.jar();

// Set forum login url
var loginURL = "https://linustechtips.com/main/login/"

// Do a first get so we have some values/cookies required to login
request({url: loginURL,jar: cookiejar}, function (error, response, body) {
	// Do some log
	console.log('First login, grabing cookies and csrfKey...')
	console.log('error:', error);
	console.log('statusCode:', response && response.statusCode);

	// Load body and get csrfKey (form input identifier)
	var $ = cheerio.load(body);
	var csrfKeyInput = $('input[name=csrfKey]').val();
	console.log(csrfKeyInput);

	// Start login
	request.post({
	  headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url: loginURL,
		jar: cookiejar,
		form: {login__standard_submitted: '1',
						csrfKey: csrfKeyInput,
						auth: config.auth,
						password: config.password,
						remember_me: '0',
						remember_me_checkbox: '1',
						signin_anonymous: '0'
					}
	}, function(error, response, body){
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);

			// GET FLOATPLANE CLUB FIRST PAGE HERE
			getFloatplanePage();
});
})

// Var to store forum page
var floatplanePage
// Set interval between post requests
var interval = 1 * 500;

// Get Floatplane Club first page and parse it
function getFloatplanePage() {
	request({url: 'https://linustechtips.com/main/forum/91-the-floatplane-club/',jar: cookiejar},
		function (error, response, body) {
			console.log('error:', error); // Print the error if one occurred
			console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

			// Store html to the var
			floatplanePage = ''+ body;

			// Parse html to read DOM values
			var $ = cheerio.load(floatplanePage);

			// Target the postList
			var baseURLtarget = 'https://linustechtips.com/main/forum/91-lmg-floatplane/?page=1';
			var postList = $('.cTopicList');

			// Get values in an array
			var postTitles = postList.children().children('div.ipsDataItem_main');
			var postTitleContainer = postTitles.children('h4').children('span.cTopicTitle').children('a');
			var postTimeContainer = postTitles.children('div').children('time');

			// Create an array to store post infos before saving them in json files
			var linksAndTitles = []

			// Get and list 9 last posts
			for (var i = 1; i < 10; i++) {
				setTimeout(function(num=i) {
					console.log('Start requesting:', postTitleContainer[num].attribs.href);
					request({url: postTitleContainer[num].attribs.href, jar: cookiejar}, function (error, response, body) {
						var $ = cheerio.load(body);

						setTimeout(function (){
							// Get all values and save them in a json
							videoID = $('.floatplane-script').data('videoGuid'); // VideoID value

							// Video Title
							title = postTitleContainer[num].attribs.title;
							regTitle = new RegExp(/(?: ).+/);
							parsedTitle = regTitle.exec(title)[0].slice(1,-1);

							// Video Type
							regType = new RegExp(/\w+(?=:)/);
							function parsingType(){
								if (regType.exec(title) === null || regType.exec(title) === undefined){return 'Unknown'}
								else {
									return regType.exec(title)[0];
								}}
							parsedType = parsingType();

							// Post URL
							postURL = postTitleContainer[num].attribs.href;

							// Video release date
							dateTime = postTimeContainer[num].attribs.datetime;
							regDate = new RegExp(/\d+-\d+-\d+/);
							parsedDate = regDate.exec(dateTime)[0];

							// Parsing values for filename
							parsedTypeForTitle = parseTypeForTitle(parsedType);
							bannedFilenameChars = new RegExp(/[^a-zA-Z0-9.() ]/g);
							parsedTitleForFile = parsedTitle.replace(bannedFilenameChars, '');

							// Filenames (final and temp.)
							fileName = parsedTypeForTitle + ' - ' + parsedDate + ' - ' + parsedTitleForFile + '.mp4'
							fileNameTest = parsedTypeForTitle + ' - ' + parsedDate + ' - ' + parsedTitleForFile + ' - TEST.mp4'

							// Loging values to debug
							console.log('---------------------');
							console.log('error:', error); // Print the error if one occurred
							console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
							console.log('*********');
							console.log('videoID:',videoID);
							console.log('type:',parsedType);
							console.log('title:',parsedTitleForFile);
							console.log('date:',parsedDate);

							// Final object
							linksAndTitles[num] = {
								postID:i, // ID used for this loop
								title:parsedTitle, // Title
								type:parsedType, // If it's a LTT or CSF or TQ video
								filename:fileName, // Final filename
								filenameTest:fileNameTest, // Temp filename
								serie:'Scrapyard Wars', // If this is a specific serie, its name (curently unused)
								season: 5, // If this is a specific serie, its season number (curently unused)
								episode: 3, // If this is a specific serie, its episode number (curently unused)
								postURL:postURL, // Forum post link (unused)
								date:parsedDate, // Release date
								videoID:videoID, // Video ID
								dlURL:'' // Video download URL
							}

							// Check if the post contains a video, create a json file
							if (videoID !== undefined && parsedType !== 'Unknown') {
								// Declare vars
								videoQuality = config.videoQuality;
								getDlUrl = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid=' + videoID + '&video_quality='+ videoQuality +'&download=1';

								// Create vars to test if a json already exist
								existInNew = fs.existsSync('json/new/' + linksAndTitles[num].type + '-' + linksAndTitles[num].date + '-' + linksAndTitles[num].videoID + '.json');
								existInCompleted = fs.existsSync('json/completed/' + linksAndTitles[num].type + '-' + linksAndTitles[num].date + '-' + linksAndTitles[num].videoID + '.json');

								// Check if json exists
								if (existInNew === false && existInCompleted === false) {
									// False: We get the download URL and save values in a json file
									console.log(linksAndTitles[num].videoID,'File do not exist!');
									request({url: getDlUrl, jar:cookiejar}, function (error, response, body) {
										linksAndTitles[num].dlURL = body;
										fs.writeFileSync('json/new/' + linksAndTitles[num].type + '-' + linksAndTitles[num].date + '-' + linksAndTitles[num].videoID + '.json', JSON.stringify(linksAndTitles[num]));
									})
								}
								else {
									// True: We do nothing as the file is already created
									console.log(linksAndTitles[num].videoID,'File exist!');
								}
							}
						},200);
					})
				}, interval * i, i); // This sets an incremental interval depending on postID (to make a synchronious call in native js)
			}
			// Wait 30s and start downloading videos
			// TODO: Make it as a callback when json are all saved.
			setTimeout(function(){
				downloadVideos();
			}, interval * 30);
		}
	);
}

// Functions to parse type values to get corresponding ones

function parseTypeForTitle(type){
	if (type == "LTT") {
		return "Linus Tech Tips"
	} else if (type == "CSF") {
		return "Channel Super Fun"
	} else if (type == "TQ") {
		return "Techquickie"
	}
}
function videoTypeFolderFun(type) {
	if (type == "LTT") {
		return config.lttFolderName
	} else if (type == "CSF") {
		return config.csfFolderName
	} else if (type == "TQ") {
		return config.tqFolderName
	}
}

// Download videos functions
function downloadVideos() {
	// Set a RegExp to only get json
	var jsonReg = new RegExp(/(.json)/);
	// json folders
	jsonNewDir = 'json/new/';
	jsonCompletedDir = 'json/completed/'
	jsonFailedDir = 'json/failed/'


	console.log('function downloadVideos() called!');

	// Read filetree of new json directory
	fs.readdir(jsonNewDir, function(err, files){
		// Log filetree
		console.log(files);

		// Start scaning each files, one per one
		async.eachSeries(files, function(file,callback){
			// If it's a json, read it
			if (jsonReg.test(file) === true) {
				// Parse json as a object
				fileJson = JSON.parse(fs.readFileSync(jsonNewDir + file));

				// Select where to download file depending of the video type
				videoTypeFolder = videoTypeFolderFun(fileJson.type);

				// Start downloading file
				request(fileJson.dlURL)
				.on('response', function (res) {
					console.log(fileJson.filenameTest)
					// Create a ProgressBar to know download status
   				len = parseInt(res.headers['content-length'], 10);
					bar = new ProgressBar('Downloading: [:bar] :percent :etas',{
						complete: '=',
						incomplete: ' ',
						width: 30,
						total: len
					})

					// Write the incoming flux into an intermediary file
					res.pipe(fs.createWriteStream(config.plexFolder + videoTypeFolder + fileJson.filenameTest))
				})

				// When receving data, make ProgressBar... Progress...
				.on('data', function(chunk) {
					bar.tick(chunk.length);
				})

				// When file finished to download
				.on('end', function(){
    			console.log('\n');
					createdDate = fileJson.date + 'T00:00:00';

					// Create a metadata object containing important metadatas
					metadata = {
						title: fileJson.title,
						show: parsedTypeForTitle,
						creation_time: createdDate
					}

					// Set ffmpeg path and arguments then launch it.
					cmd = '"' + ffmpegStatic.path + '"';
					args = ' -i "' + config.plexFolder + videoTypeFolder + fileJson.filenameTest + '" -y -acodec copy -vcodec copy -metadata title="' + fileJson.title + '" -metadata show="' + parsedTypeForTitle + '" "' + config.plexFolder + videoTypeFolder + fileJson.filename + '"';
					exec(cmd + args , function(error,stdout,stderr){
						if (error) {
							// Error while adding metadatas
							console.log('ffmpegError:',error);
							// Delete temporary file
							fs.unlinkSync(config.plexFolder + videoTypeFolder + fileJson.filenameTest);
							// Move "new" json to "failed" json folder
							fs.renameSync(jsonNewDir + file, jsonFailedDir + file);
							// Send callback to take care of the next json file
							callback();
						}
						else {
							// Finished to add metadatas
							console.log('ffmpegSuccess for file:',fileJson.filename);
							// Delete temporary file
							fs.unlinkSync(config.plexFolder + videoTypeFolder + fileJson.filenameTest);
							// Move "new" json to "completed" json folder
							fs.renameSync(jsonNewDir + file, jsonCompletedDir + file);
							// Send callback to take care of the next json file
							callback();
						}
					})
				});
			} else {
				// File is not a json, skip it.
				// Send callback to take care of the next json file
				callback();
			}
		}, function(err){
			// Function in case of error
			if(err){console.error('async',err)}
			// End of this function
			console.log('function downloadVideos() finished!');
		})
	}
)
};

/* SIDENOTE
I should rewrite a huge part of this code and use more "callback"/"function calling"

This should make the code easier to understand and to work with (and fix some issues about async calls)

A Git repo would be a great idea.

Steps to do:
- Add more parsing for title/content (Question marks and " can't be used as filename, at least on Win)
- Find a way to save cookies so we don't have to login each time we launch the app (2 GET and 1 POST less)
- Download system ?
- Do some test with a test Plex server
- Make something to remove content that is older than 1 month (30d).
*/
