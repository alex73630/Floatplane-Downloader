// Config
var request = require('request');
var ProgressBar = require('progress');
var fs = require('fs');
var cheerio = require('cheerio');
var sleep = require('sleep');
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

// Do a first get so we have some values/cookies to do the login
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

// Store forum page
var floatplanePage

var interval = 1 * 500;
// Get Floatplane Club first page and parse it
function getFloatplanePage() {
	request({url: 'https://linustechtips.com/main/forum/91-the-floatplane-club/',jar: cookiejar},
		function (error, response, body) {
			console.log('error:', error); // Print the error if one occurred
			console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

			floatplanePage = ''+ body;
			var $ = cheerio.load(floatplanePage);

			var baseURLtarget = 'https://linustechtips.com/main/forum/91-the-floatplane-club/?page=1';
			var postList = $('div.ipsBox[data-baseurl="' + baseURLtarget + '"]').children('ol');
			var postTitles = postList.children().children('div.ipsDataItem_main');
			var postTitleContainer = postTitles.children('h4').children('div').children('a');
			var postTimeContainer = postTitles.children('div').children('time');

			var linksAndTitles = []

			// List 24 last posts
			for (let i = 1; i < 10; i++) {
				setTimeout(function() {
					console.log('Start requesting:', postTitleContainer[i].attribs.href);
					request({url: postTitleContainer[i].attribs.href, jar: cookiejar}, function (error, response, body) {
						var $ = cheerio.load(body);
						sleep.msleep(200);

						// Get all values and save them in a json
						videoID = $('.floatplane-script').data('videoGuid');

						title = postTitleContainer[i].attribs.title;
						regType = new RegExp(/\w+(?=:)/);
						function parsingType(){
							if (regType.exec(title) === null || regType.exec(title) === undefined){return 'Unknown'}
							else {
								return regType.exec(title)[0];
							}}
						parsedType = parsingType();

						regTitle = new RegExp(/(?: ).+/);
						parsedTitle = regTitle.exec(title)[0].slice(1,-1);

						postURL = postTitleContainer[i].attribs.href;

						dateTime = postTimeContainer[i].attribs.datetime;
						regDate = new RegExp(/\d+-\d+-\d+/);
						parsedDate = regDate.exec(dateTime)[0];

						console.log('---------------------');
						console.log('error:', error); // Print the error if one occurred
						console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
						console.log('*********');
						console.log('videoID:',videoID);
						console.log('type:',parsedType);
						console.log('title:',parsedTitle);
						console.log('date:',parsedDate);

						linksAndTitles[i] = {
							postID:i,
							title:parsedTitle,
							type:parsedType, // If it's a LTT or CSF or TQ video
							serie:'Scrapyard Wars',
							season: 5,
							episode: 3,
							postURL:postURL,
							date:parsedDate,
							videoID:videoID,
							dlURL:''}

						if (videoID !== undefined && parsedType !== 'Unknown') {
							videoQuality = config.videoQuality;
							getDlUrl = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid=' + videoID + '&video_quality='+ videoQuality +'&download=1';
							//filename =  linksAndTitles[i].type + '-' + linksAndTitles[i].date + '-' + linksAndTitles[i].videoID + '.json';

							// Create vars to test if a json already exist
							existInNew = fs.existsSync('json/new/' + linksAndTitles[i].type + '-' + linksAndTitles[i].date + '-' + linksAndTitles[i].videoID + '.json');
							existInCompleted = fs.existsSync('json/completed/' + linksAndTitles[i].type + '-' + linksAndTitles[i].date + '-' + linksAndTitles[i].videoID + '.json');

							if (existInNew === false && existInCompleted === false) {
								console.log(linksAndTitles[i].videoID,'File do not exist!');
								request({url: getDlUrl, jar:cookiejar}, function (error, response, body) {
									linksAndTitles[i].dlURL = body;
									fs.writeFileSync('json/new/' + linksAndTitles[i].type + '-' + linksAndTitles[i].date + '-' + linksAndTitles[i].videoID + '.json', JSON.stringify(linksAndTitles[i]));
								})
							}
							else {
								console.log(linksAndTitles[i].videoID,'File exist!');
							}
						}
					})
				}, interval * i, i);
			}
			setTimeout(function(){
				downloadVideos();
			}, interval * 30);
		}
	);
}

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

function downloadVideos() {
	var jsonReg = new RegExp(/(.json)/);
	jsonNewDir = 'json/new/';
	jsonCompletedDir = 'json/completed/'
	console.log('function downloadVideos() called!');
	fs.readdir(jsonNewDir, function(err, files){
		console.log(files);
		async.eachSeries(files, function(file,callback){
			if (jsonReg.test(file) === true) {
				fileJson = JSON.parse(fs.readFileSync(jsonNewDir + file));

				parsedTypeForTitle = parseTypeForTitle(fileJson.type);
				videoTypeFolder = videoTypeFolderFun(fileJson.type);

				request(fileJson.dlURL)
				.on('response', function (res) {
					console.log(parsedTypeForTitle + ' - ' + fileJson.title + ' - ' + fileJson.date + '.mp4')
   				len = parseInt(res.headers['content-length'], 10);
					bar = new ProgressBar('Downloading: [:bar] :percent :etas',{
						complete: '=',
						incomplete: ' ',
						width: 30,
						total: len
					})

					res.pipe(fs.createWriteStream(config.plexFolder + videoTypeFolder + parsedTypeForTitle + '\ -\ ' + fileJson.title + '\ -\ ' + fileJson.date + '\ -\ TEST.mp4'))
				})
				.on('data', function(chunk) {
					bar.tick(chunk.length);
				})
				.on('end', function(){
    			console.log('\n');
					createdDate = fileJson.date + 'T00:00:00';
					metadata = {
						title: fileJson.title,
						show: parsedTypeForTitle,
						creation_time: createdDate
					}
					cmd = '"' + ffmpegStatic.path + '"';
					args = ' -i "' + config.plexFolder + videoTypeFolder + parsedTypeForTitle + '\ -\ ' + fileJson.title + '\ -\ ' + fileJson.date + '\ -\ TEST.mp4" ' + ' -y -acodec copy -vcodec copy -metadata title="' + fileJson.title + '" -metadata show="' + parsedTypeForTitle + '" "' + config.plexFolder + videoTypeFolder + parsedTypeForTitle + ' - ' + fileJson.title + ' - ' + fileJson.date + '.mp4"'
					exec(cmd + args , function(error,stdout,stderr){
						if (error) {
							console.log('ffmpegError:',error);
						}
						fs.unlinkSync(config.plexFolder + videoTypeFolder + parsedTypeForTitle + ' - ' + fileJson.title + ' - ' + fileJson.date + ' - TEST.mp4')
					})
					fs.renameSync(jsonNewDir + file, jsonCompletedDir + file);
					callback();
				});
			} else {
				callback();
			}
		}, function(err){
			if(err){console.error('async',err)}
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
