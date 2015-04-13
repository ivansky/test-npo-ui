'use strict';

var App = (function($, Snap){

	var Events = (function(){

		var EventScope = $({});

		return {
			on: on,
			trigger: trigger
		};

		function on(){
			EventScope.on.apply(EventScope, arguments);
		}

		function trigger(){
			EventScope.trigger.apply(EventScope, arguments);
		}

	})();

	var Instance;

	var SVG;

	var Floors = [];

	var Settings = {
		current: 0,
		floors: [],
		containers: [
			'floorContainer'
		]
	};

	function LoadError(message, cause){
		this.message = message;
		this.cause = cause;
		this.name = 'LoadError';
		if(cause.stack) this.stack = cause.stack;
	}

	function LoadImage(src, callback){
		var img = new Image();
		img.src = src;
		img.onload = function(){
			callback.call(img, src);
		}
	}

	function LoadRooms(IndexFloor, __callback){
		if(!Floors[IndexFloor]) return;

		var callback = __callback || function(){};

		$.each(Floors[IndexFloor].rooms, function(Index, Room){

			Room.checked = false;

			switch(Room.type){
				case "rect":
					Room.object = SVG.rect(Room.x, Room.y, Room.width, Room.height);
					break;

				case "polygon":
					Room.object = SVG.polyline(Room.points);
					break;
				default: return; break;
			}

			if(Room.object){

				Room.object.attr({
					fill: "#5bc0de",
					"fill-opacity": 0
				}).click(function(){
					Events.trigger("roomClicked", [Room, this]);
				}).hover(function(){
					Events.trigger("roomMouseEnter", [Room, this]);
				},function(){
					Events.trigger("roomMouseLeave", [Room, this]);
				});

			}

			Events.trigger("roomLoaded", [Room, Index]);

			if(Index >= Floors[IndexFloor].rooms.length - 1){
				Events.trigger("roomsLoaded", [Floors[IndexFloor].rooms, Floors[IndexFloor]]);
				callback();
			}

		});
	}

	function LoadFloor(IndexFloor){

		if(!Floors[IndexFloor] || !Settings.floorContainer) return;

		Events.trigger("floorLoadIn", [Floors[IndexFloor], IndexFloor]);

		SVG.clear();

		Settings.floorContainer.css({backgroundImage:''}).removeClass('has-bg');;

		LoadImage(Floors[IndexFloor].image, function(){
			Settings.floorContainer.css({
				backgroundImage: 'url('+this.src+')'
			}).addClass('has-bg');
		});

		if(!Floors[IndexFloor].loaded){
			$.getJSON(Floors[IndexFloor].data).done(function(RoomsData){

				$.each(RoomsData, function(Index, Room){

					$.extend(Room, {
						checked: false,
						object: false
					});

					Floors[IndexFloor].rooms.push(Room);

					if (Index == RoomsData.length - 1){
						Floors[IndexFloor].loaded = true;

						LoadRooms(IndexFloor);
					}
				});

			})
			.fail(function(jqxhr, textStatus, error){
					throw new LoadError("Config can't load. Request Failed: " + textStatus + ", " + error);
			});

		}else{
			LoadRooms(IndexFloor);
		}

		Settings.current = IndexFloor;

	}

	function LoadConfig(ConfigPath, __callback){

		var callback = __callback || function(){},
			__Settings = Settings;

		$.getJSON(ConfigPath).done(function(ConfigData){

			$.extend(__Settings, ConfigData);

			$.each(ConfigData.floors, function(Index, Floor){

				$.extend(Floor, {
					loaded: false,
					rooms: []
				});

				Floors.push(Floor);

				if (Index == ConfigData.floors.length - 1){
					Events.trigger("floorsLoaded", [Floors]);
					callback();
				}
			});

		})
		.fail(function(jqxhr, textStatus, error){
			throw new LoadError("Config can't load. Request Failed: " + textStatus + ", " + error);
		});
	}

	function init(){

		return {

			load: function(__config){

				var config = __config || {};

				$.extend(Settings, config);

				$.each(Settings.containers, function(Index, Attribute){
					if(typeof Settings[Attribute] === "string"){
						Settings[Attribute] = $(Settings[Attribute]);

						Events.trigger("loadedContainer", Attribute, Settings[Attribute]);
					}

					if (Index == Settings.containers.length - 1){

						SVG = Snap($(config.floorContainer).find('svg').get(0));

						LoadConfig(config.config, function(){

							LoadFloor(0);

						});

					}
				});

			},

			events: function(){
				return Events;
			},

			setFloor: function(Index){

				LoadFloor(Index);

			}

		};

	}

	return {
		getInstance: function () {

			if ( !Instance ) {
				Instance = init();
			}

			return Instance;
		}
	};

})(jQuery, Snap);

window.App = App;