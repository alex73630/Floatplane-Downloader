// Config
var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');
var FeedParser = require('feedparser');
var sleep = require('sleep');
var config = require('./config.json');

// Create cookie container
var cookiejar = request.jar();

// Set forum login url
var loginURL = "https://linustechtips.com/main/login/"

// Store forum page

var floatplanePage

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

			// Get Floatplane Club first page and parse it
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

				var posts = []
				// List 24 last posts
				for (let i = 1; i < 25; i++) {
					request({url: postTitleContainer[i].attribs.href, jar: cookiejar}, function (error, response, body) {
						var $ = cheerio.load(body);
						sleep.msleep(200);
						// Get all values and save them in a json
						videoID = $('.floatplane-script').data('videoGuid');

						title = postTitleContainer[i].attribs.title;
						regType = new RegExp(/\w+(?=:)/);
						function parsingType(){
							if (regType.exec(title) === null || regType.exec(title) === undefined){return ''}
							else {
								return regType.exec(title);
							}}
						parsedType = parsingType();

						postURL = postTitleContainer[i].attribs.href;

						dateTime = postTimeContainer[i].attribs.datetime;
						regDate = new RegExp(/\d+-\d+-\d+/);
						parsedDate = regDate.exec(dateTime);
						console.log('---------------------');
						console.log('error:', error); // Print the error if one occurred
						console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
						console.log('*********');
						console.log('videoID:',videoID);
						console.log('title:',title);
						console.log('postURL:',postURL);
						linksAndTitles[i] = {
							postID:i,
							title:title,
							type:parsedType[0], // If it's a LTT or CSF or TQ video
							serie:'Scrapyard Wars',
							season: 5,
							episode: 3,
							postURL:postURL,
							date:parsedDate[0],
							videoID:videoID,
							dlURL:''}
						if (videoID !== undefined) {
							videoQuality = config.videoQuality;
							getDlUrl = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid=' + videoID + '&video_quality='+ videoQuality +'&download=1'
							existInNew = fs.existsSync('json/new/' + linksAndTitles[i].videoID + '.json');
							existInCompleted = fs.existsSync('json/completed/' + linksAndTitles[i].videoID + '.json');

							if (existInNew === false && existInCompleted === false) {
								console.log(linksAndTitles[i].videoID,'File do not exist!');
								request({url: getDlUrl, jar:cookiejar}, function (error, response, body) {
									//console.log(postTitleContainer[i].attribs.title + ' DL URL:', body);
									linksAndTitles[i].dlURL = body;
									filename = 'json/new/' + linksAndTitles[i].title + '.json'
									fs.writeFileSync('json/new/' + linksAndTitles[i].videoID + '.json', JSON.stringify(linksAndTitles[i]));
								})
							}
							else {
								console.log(linksAndTitles[i].videoID,'File exist!');
							}
						}
					})
				}

			}
		);
});
})

/* SIDENOTE
I should rewrite a huge part of this code and use more "callback"/"function calling"

This should make the code easier to understand and to work with (and fix some issues about async calls)

A Git repo would be a great idea.

Steps to do:
- Add more parsing for title/content
- Find a way to save cookies so we don't have to login each time we launch the app (2 GET and 1 POST less)
- Download system ?
- Do some test with a test Plex server
- Make something to remove content that is older than 1 month (30d).
*/
