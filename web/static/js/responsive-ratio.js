function ResponsiveRatio(){
	$('.ResponsiveRatio').each(function(){
		VideoWidth = $(this).attr('data-ResponsiveRatioWidth');
		VideoHeight = $(this).attr('data-ResponsiveRatioHeight');
		CurrWidth = $(this).width();
		CustomRatio = VideoWidth / VideoHeight;
		CalculatedVideoHeight = CurrWidth / CustomRatio;
		CustomVideoHeight = Math.round(CalculatedVideoHeight);
		$(this).css('height', CustomVideoHeight);
	});
}
