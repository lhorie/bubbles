$.fn.tpl = function(template, data) {
	var html = template.replace(/\{\{(.+?)\}\}/gim, function(match, key) {
		return data ? data[key] || "" : ""
	})
	this.html(html)
	return this
}
$.fn.center = function() {
	return this.css({
		top: Math.max(0, Math.round((HEIGHT - this.outerHeight(true)) / 2)),
		left: Math.max(0, Math.round((WIDTH - this.outerWidth(true)) / 2))
	})
}
$.fn.bubble = function() {
	return this.addClass("fill").addClass("shake").bind("animationend webkitAnimationEnd MSAnimationEnd", function(e) {
		if (e.originalEvent.animationName == "fill") $(this).removeClass("fill")
		if (e.originalEvent.animationName == "shake") $(this).removeClass("shake").addClass("pop").stop().find("iframe").css({visibility: "hidden"})
		if (e.originalEvent.animationName == "pop") $(this).remove()
	})
}

var BUBBLE, PAGE = 1
var TAP = "ontouchstart" in document.body ? "touchstart" : "click"
function initSearchBubble() {
	BUBBLE = $(".search").center()
	var input = BUBBLE.find("[type=text]").focus()
	var button = BUBBLE.find("[type=submit]").bind(TAP, submitForm)
	var form = BUBBLE.find("form").submit(submitForm)
}
function submitForm(e) {
	e.preventDefault()
	$("[type=text]").blur()
	drift()
	populate(PAGE = 1)
}

var CAMERA, SCENE, PROJECTOR;
var HEIGHT = 0, WIDTH = 0
function initScene() {
	var scrollbarWidth = (function() {
		var dummy = $("<div style='height:80px;overflow:scroll;position:absolute;top:-200px;width:80px;'></div>").appendTo(document.body)
		var width = dummy.prop("offsetWidth") - dummy.prop("clientWidth")
		dummy.remove()
		return width
	})()
	
	CAMERA = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT, 1, 10000);
	CAMERA.position.set(0, 300, 500);

	SCENE = new THREE.Scene();

	SCENE.add(CAMERA);

	PROJECTOR = new THREE.Projector();

	var renderer = new THREE.CanvasRenderer();

	$(document).bind("touchstart", function(e) {
		if (e.target.nodeName.toLowerCase() != "input") e.preventDefault()
	})
	
	$(window).resize(function() {
		HEIGHT = $(window).height()
		WIDTH = $(window).width() - scrollbarWidth
		CAMERA.aspect = WIDTH / HEIGHT
		CAMERA.updateProjectionMatrix()
		renderer.setSize(WIDTH, HEIGHT)
		$("body>.search").center()
	}).resize()
	
	$(renderer.domElement)
		.appendTo(document.body)
		.bind(TAP, poke)
		.bind("keyup", drift)
	
	var radius = 400, theta = 0;
	new function animate() {
		// rotate CAMERA
		theta += 0.4;

		CAMERA.position.x = radius * Math.sin(theta * Math.PI / 360);
		CAMERA.position.y = radius * Math.sin(theta * Math.PI / 360);
		CAMERA.position.z = radius * Math.cos(theta * Math.PI / 360);
		CAMERA.lookAt(SCENE.position);

		CAMERA.updateMatrixWorld();
		renderer.render(SCENE, CAMERA);
		
		requestAnimationFrame(animate);
	}
}
function intersect(x, y) {
	x = (x / WIDTH) * 2 - 1;
	y = - (y / HEIGHT) * 2 + 1;
	var vector = new THREE.Vector3(x, y, 0.5);
	PROJECTOR.unprojectVector(vector, CAMERA);
	
	var ray = new THREE.Ray(CAMERA.position, vector.subSelf(CAMERA.position).normalize());
	return ray.intersectObjects(SCENE.children).shift();
}

function poke(e) {
	e.preventDefault()
	e.stopPropagation()
	drift()
	// find intersections
	var intersected = intersect(e.originalEvent.pageX, e.originalEvent.pageY)
	if (intersected) {
		intersected.object.material.program = drawPoppedBubble;
		BUBBLE = intersected.object.bubble.clone(true)
		BUBBLE.appendTo(document.body)
			.css({
				left: e.originalEvent.pageX - BUBBLE.width() / 2,
				top: e.originalEvent.pageY - BUBBLE.height() / 2
			})
			.stop().animate({top: -BUBBLE.outerHeight(true)}, 20000, queue)
		if (PARTICLES.filter(function(p) {return p.material.program != drawPoppedBubble}).length == 0) populate(PAGE = PAGE + 1)
	}
}
function drift(e) {
	if (e) e.stopPropagation()
	BUBBLE.not(".pop").unbind(TAP).stop(true).animate({top: -BUBBLE.outerHeight(true)}, 1000, queue)
	BUBBLE = $()
}
function queue() {
	if (!$(this).is(".large")) {
		//stack bubble on side panel
		var scrollTop = $("body").scrollTop()
		var isTop = scrollTop < $(this).outerHeight(true)
		if (isTop) {
			$("#bubbles").css({top: this.offsetTop + 20}).stop().animate({top: 10})
			$(this).prependTo("#bubbles").css({position: "relative", top: 0, left: 0})
		}
		else {
			$(this).prependTo("#bubbles").css({position: "relative", top: 0, left: 0})
			$("body").scrollTop($(this).outerHeight(true) + scrollTop)
		}
	}
	else $(this).remove()
}

var PARTICLES = []
var tweets = 30, videos = 30, images = 30, boxSize = 400
var twitterBubble = new Image()
twitterBubble.src = "images/bubbletwitter.png"
var youtubeBubble = new Image()
youtubeBubble.src = "images/bubbleyoutube.png"
var flickrBubble = new Image()
flickrBubble.src = "images/bubbleflickr.png"
function populate(page) {
	PARTICLES.forEach(function(particle) {
		particle.fadeOut(function() {SCENE.remove(particle)})
	})
	PARTICLES = []

	var query = $("[name=query]").val() || "sxsw",
		twitter = "http://search.twitter.com/search.json?q=" + query + "&rpp=" + tweets + "&page=" + page + "&callback=?",
		youtube = "https://gdata.youtube.com/feeds/api/videos?q=" + query + "&max-results=" + videos + "&start-index=" + (videos * (page - 1) + 1) + "&alt=jsonc&v=2&callback=?",
		flickr = "http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=d34615bcc71b41e5ddaf5212cec71f77" +
			"&format=json&jsoncallback=?&extras=description,tags,url_sq,url_m&per_page=" + images + "&page=" + page +"&text=" + query
		
	$.getJSON(twitter, function(tweets) {
		addParticles(tweets.results, drawTwitterBubble, renderTweet)
	}),
	$.getJSON(youtube, function(videos) {
		addParticles(videos.data.items, drawYoutubeBubble, renderVideo)
	}),
	$.getJSON(flickr, function(images) {
		addParticles(images.photos.photo, drawFlickrBubble, renderImage)
	})
}
function addParticles(data, draw, render) {
	data.forEach(function(item) {
		var material = new THREE.ParticleCanvasMaterial({
			color: Math.random() * 0x666666,
			program: genProgram(draw)
		})
		var particle = new THREE.Particle(material);
		
		particle.position.x = Math.random() * boxSize - (boxSize / 2);
		particle.position.y = Math.random() * boxSize - (boxSize / 2);
		particle.position.z = Math.random() * boxSize - (boxSize / 2);
		particle.scale.x = particle.scale.y = Math.random() * 10 + 10;
		
		particle.fadeOut = fadeOut
		
		render(item, particle)
				
		SCENE.add(particle)
		PARTICLES.push(particle)
	})
}
function fadeOut(fn) {
	this.material.onFadeOut = fn
}
function swing(p) {
	return (-Math.cos(p*Math.PI) / 2) + 0.5;
}
function genProgram(draw) {
	var startDelay, endDelay
	startDelay = endDelay = Math.round(Math.random() * 20) + 1
	var i = 0
	return function(context) {
		if (!this.onFadeOut) {
			if (startDelay) startDelay--
			else i = Math.min(1, i + 0.1)
		}
		else {
			if (endDelay) endDelay--
			else i = Math.max(0, i - 0.1)
			if (i == 0) this.onFadeOut()
		}
		draw.call(this, context, swing(i))
	}
}
function drawTwitterBubble(context, step) {
	context.rotate(Math.PI);
	context.globalAlpha = step * 0.6
	context.drawImage(twitterBubble, -1, -1, 2, 2);
}
function drawYoutubeBubble(context, step) {
	context.globalAlpha = step * 0.6
	context.drawImage(youtubeBubble, -1, -1, 2, 2);
}
function drawFlickrBubble(context, step) {
	context.globalAlpha = step * 0.5
	context.drawImage(flickrBubble, -1, -1, 2, 2);
}
function drawPoppedBubble(context) {
	if (!this.onFadeOut) {
		context.globalAlpha = 1
		context.lineWidth = 0.01;
		context.beginPath();
		context.arc(0, 0, 1, 0, Math.PI * 2, true);
		context.closePath();
		context.stroke();
	}
	else this.onFadeOut()
}

function renderTweet(tweet, particle) {
	tweet.text = tweet.text.replace(/(http:.+?(?: |$))/, "<a href='$1' target='_blank'>$1</a> ")
	particle.bubble = $("<div class='bubble'></div>")
		.tpl("<img src='{{profile_image_url}}' /><span class='rest'>{{text}} - {{from_user_name}}</span>", tweet)
		.bubble()
}
function renderVideo(video, particle) {
	video.thumbnail = video.thumbnail.sqDefault
	particle.bubble = $("<div class='bubble'></div>")
		.tpl("<a href='#'><img src='{{thumbnail}}' /></a><span class='rest'>{{title}} <a href='#'>Watch video</a></span>", video)
		.bubble()
		.find("a")
			.bind(TAP, function(e) {
				e.preventDefault()
				e.stopPropagation()
				drift()
				BUBBLE = $("<div class='large bubble'></div>")
					.tpl("<iframe width='640' height='385' src='http://www.youtube.com/embed/{{id}}' frameborder='0'></iframe>", video)
					.bubble()
					.appendTo(document.body)
					.center()
			})
			.end()
}
function renderImage(image, particle) {
	image.description = (image.description._content.match(/.+?(\.|$)/gim) || [""])[0]
	particle.bubble = $("<div class='bubble'></div>")
		.tpl("<a href='#'><img src='{{url_sq}}' /></a><span class='rest'>{{description}} <a href='#'>See image</a></span>", image)
		.bubble()
		.find("a")
			.bind(TAP, function(e) {
				e.preventDefault()
				e.stopPropagation()
				drift()
				BUBBLE = $("<div class='large bubble'></div>")
					.tpl("<img src='{{url_m}}' style='height:{{height_m}}px;width:{{width_m}}px' />", image)
					.bubble()
					.appendTo(document.body)
					.center()
			})
			.end()
}

initSearchBubble()
initScene()
