var videoLibrary = new Array();
function addItemList(item) {
	var regexParagraph = new RegExp(/<\/?p>/g);
	var regexParagraphJump = new RegExp(/&nbsp;/g);
	channelName = channelNameParser(item.channel);
	downloadStatus = downloadStatusParser(item.downloaded);
	parsedDescription = item.description.replace(regexParagraphJump,'');
	htmlStructure =
		'<div class="list-item" id="'+ item.videoID +'" data-animate="fade-in fade-out">'+
			'<div class="thumbnail-container ResponsiveRatio" data-ResponsiveRatioWidth="16" data-ResponsiveRatioHeight="9" style="background-image:url(\''+ item.thumbnail +'\')"></div>'+
			'<div class="right-container">'+
				'<div class="info-container">'+
					'<p class="title">'+ item.title +'</p>'+
					'<p class="channel"><i class="fa fa-user-circle" aria-hidden="true"></i>	'+ channelName.channelName +'</p>'+
					'<p class="release-date"><i class="fa fa-clock-o" aria-hidden="true"></i>	'+ item.date +'</p>'+
					'<p class="downloaded"><i class="fa fa-download" aria-hidden="true"></i>	'+ downloadStatus.status +'</p>'+
				'</div>'+
				'<div class="description-shadow"></div>'+
				'<div class="description-container">'+
				'<p>'+parsedDescription +'</p>'+
				'</div>'+
				'<div class="buttons-container">'+
					'<a onclick="OpenModal(\'modal-'+ item.videoID +'\')"><i class="fa fa-info fa-lg info" aria-hidden="true"></i></a>'+
					'<a><i class="fa fa-pencil fa-lg edit" aria-hidden="true"></i></a>'+
					'<a onclick="'+ downloadStatus.onclickFun +'('+ item.videoID +')"><i class="fa '+ downloadStatus.icon +' fa-lg '+ downloadStatus.buttonType +'" aria-hidden="true"></i></a>'+
				'</div>'+
			'</div>';
	$('.library-list-container').append(htmlStructure);

	modalStructure =
	'<div class="reveal large" id="modal-'+item.videoID+'" data-reveal>'+
		'<form>'+
			'<div class="grid-x grid-padding-x">'+
				'<div class="small-12 cell">'+
					'<label>Title'+
						'<input type="text" placeholder="Title" value="'+item.title+'">'+
					'</label>'+
				'</div>'+
				'<div class="small-12 cell">'+
					'<label>Description'+
					'<textarea placeholder="Description">'+item.description+'</textarea>'+
					'</label>'+
				'</div>'+
				'<div class="medium-12 large-7 cell">'+
					'Detailed infos'+
					'<table>'+
						'<tbody>'+
							'<tr>'+
								'<td>ID</td>'+
								'<td>'+item.videoID+'</td>'+
							'</tr>'+
							'<tr>'+
								'<td>GUID</td>'+
								'<td>'+item.guid+'</td>'+
							'</tr>'+
							'<tr>'+
								'<td>Release Date</td>'+
								'<td>'+item.date+'</td>'+
							'</tr>'+
							'<tr>'+
								'<td>Downloaded</td>'+
								'<td>'+downloadStatus.status+'</td>'+
							'</tr>'+
							'<tr>'+
								'<td>Forum link</td>'+
								'<td><a href="'+item.postURL+'" target="_blank">'+item.postURL+'</a></td>'+
							'</tr>'+
						'</tbody>'+
					'</table>'+
				'</div>'+
				'<div class="medium-12 large-5 cell">'+
					'Thumbnail'+
					'<div class="modal-thumbnail-container ResponsiveRatio" data-ResponsiveRatioWidth="16" data-ResponsiveRatioHeight="9" style="background-image:url('+item.thumbnail+');">'+
					'</div>'+
					'<label>Channel'+
						'<select>'+
							'<option id="NA-opt" value="NA">Not set</option>'+
							'<option id="LTT-opt" value="LTT">Linus Tech Tips</option>'+
							'<option id="TQ-opt" value="TQ">Techquickie</option>'+
							'<option id="CSF-opt" value="CSF">Channel Super Fun</option>'+
						'</select>'+
					'</label>'+
				'</div>'+
				'<div class="small-12 cell" style="border-top: solid 1px rgba(0,0,0,0.15);padding-top: 10px;">'+
					'<button type="button" class="button">Save</button>'+
				'</div>'+
			'</div>'+
		'</form>'+
		'<button class="close-button" onclick="CloseModal(\'modal-'+ item.videoID +'\')" aria-label="Close reveal" type="button">'+
			'<span aria-hidden="true">&times;</span>'+
		'</button>'+
	'</div>';
	$('.modal-container').append(modalStructure);
	$('#'+channelName.dropdownOpt,'#modal-'+item.videoID).attr('selected','selected');
	$(document).foundation();
	ResponsiveRatio();
}

function itemParser(){
	url = window.location.origin + '/library/all/';
	jQuery.get(url,{},function(callback){
		console.log(callback);
		callback.forEach(elem => {
			addItemList(elem);
			videoLibrary.push(elem);
		});
	});
}

function refreshLibrary() {
	url = window.location.origin + '/library/refresh/';
	jQuery.get(url,{},function(callback){
		console.log(callback);
		callback.forEach(elem => {
			addItemList(elem);
			videoLibrary.push(elem);
		});
	});
}

function channelNameParser(type){
	if (type == 'LTT') {
		return {channelName:'Linus Tech Tips',dropdownOpt:'LTT-opt'};
	} else if (type == 'CSF') {
		return {channelName:'Channel Super Fun',dropdownOpt:'CSF-opt'};
	} else if (type == 'TQ') {
		return {channelName:'Techquickie',dropdownOpt:'TQ-opt'};
	}
}
function downloadStatusParser(status) {
	if (status === false){
		return {status:'No',icon:'fa-download',buttonType:'download',onclickFun:'downloadVideo'};
	}
	else if (status === true) {
		return {status:'Yes',icon:'fa-trash',buttonType:'delete',onclickFun:'deleteVideo'};
	}
}

function OpenModal(modalID) {
	modalToOpen = '#' + modalID;
	$(modalToOpen).foundation('open');
	$(modalToOpen).toggleClass('show',true);
	ResponsiveRatio();
}
function CloseModal(modalID) {
	modalToOpen = '#' + modalID;
	$(modalToOpen).toggleClass('show',false);
	setTimeout(function () {
		$(modalToOpen).foundation('close');
	}, 300);
}

function downloadVideo(videoID) {
	var http = new XMLHttpRequest();
	var url = window.location.href + '/byVideoId/' + videoID;
	http.open('POST', url, true);
	http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 201) {
			console.log(http.responseText);
		}
	};
	http.send();
}
function deleteVideo(videoID) {
	var http = new XMLHttpRequest();
	var url = window.location.href + '/byVideoId/' + videoID;
	http.open('DELETE', url, true);
	http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 201) {
			console.log(http.responseText);
		}
	};
	http.send();
}
itemParser();
