function sendSettings(){
	promiseFormVal = new Promise(function (resolve,reject) {
		for (let i = 0;i < 6;i++) {
			try {
				if(i === 5){
					resolve(true);
				}
				else if($('#setup-form').foundation('validateForm')[0][i].validity.valid !== true){
					console.log('error');
					throw 'Forum isn\'t validated';
				}
			}
			catch (e) {
				console.error(e);
				reject(false);
				break;
			}
		}
	});

	promiseFormVal.then(
		function(resolve){
			console.log('Form is validated, sending data');
			var formValues = $('#setup-form').serialize();
			var url = window.location.href + '?' + formValues;
			$.ajax({
				url:url,
				type:'POST',
				data:formValues
			})
				.done(function(http) {
					console.log(http);
					window.location=window.location.origin;
				});
		});
}

function getPath() {
	var http = new XMLHttpRequest();
	var url = window.location.origin + '/setup/path';
	http.open('GET',url,true);
	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 201) {
			var path = http.responseText;
			$('#dlPath').val(path);
			console.log(path);
		}
	};
	http.send();
}

function refuseTerms() {
	console.log('refuseTerms() triggered, will close the app');
}

document.getElementById('form-send').addEventListener('click', sendSettings);
window.onload = getPath();
$('#disclaimerModal').foundation('open');
