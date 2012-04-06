Ti.Geolocation.purpose = 'Tracking down criminal scum';
var DetailWindow = function(/*Object*/ _bounty, /*Tab object reference*/ containingTab) {
	var db = require('lib/db');
	
	var win = Ti.UI.createWindow({
		title:_bounty.title,
		barColor: '#6d0a0c',
		backgroundColor: 'transparent',
		backgroundImage: 'images/grain.png',
		layout:'vertical'
	});

	win.add(Ti.UI.createLabel({
		text:(_bounty.captured) ? L('busted') : L('still_at_large'),
		top:10,
		textAlign:'center',
		font: {
			fontWeight:'bold',
			fontSize:18
		},
		color: '#fff',
		height:Ti.UI.SIZE
	}));
	
	var imgView = Ti.UI.createImageView({
		image:(_bounty.url) ? _bounty.url : '/images/burglar.png',
		height:80,
		width:60,
		top:10
	});
	win.add(imgView);
	
	var photoButton = Ti.UI.createButton({
		title:L('photo'),
		top:10,
		height:Ti.UI.SIZE,
		width:200
	});
	photoButton.addEventListener('click', function() {
		if(Ti.Media.isCameraSupported) {
			Ti.Media.showCamera({
				success:function(event) {
					var image = event.media;
					imgView.image = image;
					
					//save for future use
					var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'photo'+_bounty.id+'.png');
					f.write(image);
					db.addPhoto(_bounty.id,f.nativePath);
				},
				cancel:function() {},
				error:function(error) {
					var a = Ti.UI.createAlertDialog({title:L('camera_error')});
					if (error.code == Ti.Media.NO_CAMERA) {
						a.setMessage(L('camera_error_details'));
					}
					else {
						a.setMessage('Unexpected error: ' + error.code);
					}
					a.show();
				},
				saveToPhotoGallery:true,
				allowEditing:true,
				mediaTypes:[Ti.Media.MEDIA_TYPE_PHOTO]
			});
		} else {
			Ti.Media.openPhotoGallery({
				success:function(event) {
					var image = event.media;
					imgView.image = image;
					
					//save for future use
					var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'photo'+_bounty.id+'.png');
					f.write(image);
					db.addPhoto(_bounty.id,f.nativePath);
				},
				cancel:function() {},
				error:function(error) {
					var a = Ti.UI.createAlertDialog({title:L('camera_error')});
					if (error.code == Ti.Media.NO_CAMERA) {
						a.setMessage(L('camera_error_details'));
					}
					else {
						a.setMessage('Unexpected error: ' + error.code);
					}
					a.show();
				},
				saveToPhotoGallery:true,
				allowEditing:true,
				mediaTypes:[Ti.Media.MEDIA_TYPE_PHOTO]
			});
		}
	});
	win.add(photoButton);
	
	if (!_bounty.captured) {
		var captureButton = Ti.UI.createButton({
			title:L('capture'),
			top:10,
			height:Ti.UI.SIZE,
			width:200
		});
		captureButton.addEventListener('click', function() {
			if (Ti.Geolocation.locationServicesEnabled) {
				if(Ti.Platform.osname === 'android') {
					Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_HIGH;
				} else {
					Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;
				}
				Ti.Geolocation.getCurrentPosition(function(e) {
					if(!e.error) {
						var lng = e.coords.longitude;
						var lat = e.coords.latitude;
						db.bust(_bounty.id, lat, lng);
	
						var net = require('lib/network');
						net.bustFugitive(Ti.Platform.id, function(_data) {
							Ti.UI.createAlertDialog({
								message:_data.message
							}).show();
	
							//on android, give a bit of a delay before closing the window...
							if (Ti.Platform.osname == 'android') {
								setTimeout(function() {
									win.close();
								},2000);
							}
							else {
								win.close();
							}
						});
					} else {
						Ti.UI.createAlertDialog({
							title:L('geo_error'), 
							message:'Geolocation failed. Do you have a location set on your Android emulator?'
						}).show();
					}
				});
			}
			else {
				Ti.UI.createAlertDialog({
					title:L('geo_error'), 
					message:L('geo_error_details')
				}).show();
			}
		});
		win.add(captureButton);
	}
	else {
		var mapButton = Ti.UI.createButton({
			title:L('map_button'),
			top:10,
			height:Ti.UI.SIZE,
			width:200
		});
		mapButton.addEventListener('click', function() {
			var MapWin = require('ui/common/MapWindow');
			var map = new MapWin(_bounty);
			map.open({modal:true});
		});
		win.add(mapButton);
	}
	
	var deleteButton = Ti.UI.createButton({
		title:L('delete'),
		top:10,
		height:Ti.UI.SIZE,
		width:200
	});
	deleteButton.addEventListener('click', function() {
		db.del(_bounty.id);
		win.close();
	});
	win.add(deleteButton);

	if (_bounty.captured) {
		var bragButton = Ti.UI.createButton({
			title:L('login2brag'),
			top:10,
			height:Ti.UI.SIZE,
			width:200
		});
		// Require the ACS modules
		var acs = require('lib/acs');
		if(acs.isLoggedIn()) {
			// if logged in, the button's title is "Brag"
			bragButton.title = L('brag');
		}
		bragButton.addEventListener('click', function() {
			if (acs.isLoggedIn() == false) {
				// if not logged in, show the login window
				var LoginWin = require('ui/common/LoginWindow');
				var loginwindow = new LoginWin;
				containingTab.open(loginwindow);
				// we must use a callback, because ACS functions are asynchronous
				loginwindow.addEventListener('close', function(){
					if(acs.isLoggedIn()) {
						bragButton.title = L('brag');
						addListBragsButton();
					}
				});
			} else {
				// otherwise, show the message window
				var msgWin = require('ui/common/messageWindow').messageWindow(_bounty.title, imgView.toBlob());
				containingTab.open(msgWin);
			}
		});
		win.add(bragButton);			

		var listBragsButtonAdded = false;
		
		function addListBragsButton() {
			if(!listBragsButtonAdded) {
				// if logged in, add a "list brags" button to the window
				if(acs.isLoggedIn()) {
					var listBragsButton = Ti.UI.createButton({
						title:L('listbrags'),
						top:10,
						height:Ti.UI.SIZE,
						width:200
					});
					listBragsButton.addEventListener('click', function() {
							// open the brags list window
							var BragsWindow = require('ui/common/BragsWindow');
							containingTab.open(new BragsWindow);
					});
					win.add(listBragsButton);
					listBragsButtonAdded = true;		
				}
			}
		}
		addListBragsButton();

	}
	
	return win;
};
module.exports = DetailWindow;