function sendSettings(){
	var formValues = $('#setup-form').serialize();
	var http = new XMLHttpRequest();
	var url = window.location.href + '?' + formValues;
	http.open('POST', url, true);
	http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 201) {
			console.log(http.responseText);
		}
	};
	http.send(formValues);
}
