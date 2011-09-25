/*
Copyright (c) 2011 Arjun Upadhyaya <arjun@arjunupadhyaya.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*********************************************************************
Javascript Asynchronous Anchor image loader ( background image loader)
Version 0.1: Arjun Upadhyaya
Based on the excellent jquery plugin for lazy loading (jail.js) by Sebastiano Armeli Battana
*********************************************************************/
"use strict";
(function($){
	var $window = $(window);

	$.fn.asynchAnchorBckImageLoader = $.fn.jaal = function(options) {	
		// Configuration
		options = $.extend({
			timeout : 10,
			effect : false,
			speed : 400,
			selector: null,
			offset : 0,
			event : 'load+scroll',
			callback : jQuery.noop,
			callbackAfterEachImage : jQuery.noop,
			placeholder : false,
			container : window
		}, options);

		var ancBckimages = this;
		
		$.jaal.initialStack = this;


		// Store the selector into 'triggerEl' data for the images selected
		this.data('triggerEl', (options.selector) ? $(options.selector) : $window);
		
		// Use a placeholder in case it is specified       // not required for background images
	/*	if (options.placeholder !== false) {
			images.each(function(){
				$(this).attr("src", options.placeholder);
			});
		}
	*/	
		// When the event is not specified the images will be loaded with a delay
		if(/^load/.test(options.event)) {
				
			$.asynchAnchorBckImageLoader.later.call(this, options);
		} else {
			$.asynchAnchorBckImageLoader.onEvent.call(this, options, ancBckimages);
		}

		return this;
	};

	// Methods cointaing the logic
	$.asynchAnchorBckImageLoader = $.jaal = {
	
		// Remove any elements that have been loaded from the jQuery stack.
		// This should speed up subsequent calls by not having to iterate over the loaded elements.
		_purgeStack : function(stack) {
			//console.log(stack);
			// number of images not loaded
			var i = 0;

			while(true) {
				if(i === stack.length) {
					break;
				} else {
					if(stack[i].getAttribute('data-style')) {
						i++;
					}
					else {
						stack.splice(i, 1);
					}
				}
			}
		},

		// Load the image - after the event is triggered on the image itself - no need
		// to check for visibility
		_loadOnEvent : function(e) {
			var $img = $(this),
			options = e.data.options,
			images = e.data.images;

			// Load images
			$.asynchAnchorBckImageLoader._loadImage(options, $img);

			// Image has been loaded so there is no need to listen anymore
			$img.unbind( options.event, $.asynchAnchorBckImageLoader._loadOnEvent );

			$.asynchImageLoader._purgeStack( images );
			
			if (!!options.callback) {
				$.asynchAnchorBckImageLoader._purgeStack( $.jaal.initialStack );
				$.asynchAnchorBckImageLoader._launchCallback($.jaal.initialStack, options);
			}
		}, 

		// Load the image - after the event is triggered by a DOM element different
		// from the images (options.selector value) or the event is "scroll" - 
		// visibility of the images is checked
		_bufferedEventListener : function(e) {
			var images = e.data.images,
			options = e.data.options,
			triggerEl = images.data('triggerEl');
			clearTimeout(images.data('poller'));
			images.data('poller', setTimeout(function() {
				images.each(function _imageLoader(){
					$.asynchAnchorBckImageLoader._loadImageIfVisible(options, this, triggerEl);
				});

				$.asynchAnchorBckImageLoader._purgeStack( images );
				
				if (!!options.callback) {
					$.asynchAnchorBckImageLoader._purgeStack( $.jaal.initialStack );
					$.asynchAnchorBckImageLoader._launchCallback($.jaal.initialStack, options);
				}
				
			}, options.timeout));
			
		},

		// Images loaded triggered by en event (event different from "load" or "load+scroll")
		onEvent : function(options, images) {
			images = images || this;

			if (options.event === 'scroll' || options.selector) {
				var triggerEl = images.data('triggerEl');

				if(images.length > 0) {

					// Bind the event to the selector specified in the config obj
					triggerEl.bind( options.event, { images:images, options:options }, $.asynchAnchorBckImageLoader._bufferedEventListener );
					
					if (options.event === 'scroll' || !options.selector) {
						$window.resize({ images:images, options:options }, $.asynchAnchorBckImageLoader._bufferedEventListener );
					}
					return;
				} else {
					if (!!triggerEl) {
						triggerEl.unbind( options.event, $.asynchAnchorBckImageLoader._bufferedEventListener );
					}
				}
			} else {
				// Bind the event to the images
				images.bind(options.event, { options:options, images:images }, $.asynchImageLoader._loadOnEvent);
			}
		},

		// Method called when event : "load" or "load+scroll" (default)
		later : function(options) {
			var bckImages = this;
			
			// If the 'load' event is specified, immediately load all the visible images and remove them from the stack
		/*	if (options.event === 'load') {
				images.each(function(){
					$.asynchAnchorBckImageLoader._loadImageIfVisible(options, this, bckImages.data('triggerEl'));
				});
			}*/        // not required
			$.asynchAnchorBckImageLoader._purgeStack(bckImages);
			
			$.asynchAnchorBckImageLoader._launchCallback(bckImages, options);
			
			// After [timeout] has elapsed, load the remaining images if they are visible OR (if no event is specified)
			setTimeout(function() {

				if (options.event === 'load') {
					images.each(function(){
						$.asynchAnchorBckImageLoader._loadImage(options, $(this));
					});
				} else {
					// Method : "load+scroll"
					bckImages.each(function(){
						$.asynchAnchorBckImageLoader._loadImageIfVisible(options, this, bckImages.data('triggerEl'));
					});
				}

				$.asynchAnchorBckImageLoader._purgeStack( bckImages );
				
				$.asynchAnchorBckImageLoader._launchCallback(bckImages, options);

				if (options.event === 'load+scroll') {
					options.event = 'scroll';
					$.asynchAnchorBckImageLoader.onEvent( options, bckImages );
				}
			}, options.timeout);
		},
		
		_launchCallback : function(images, options) {
			if (images.length === 0 && !$.jaal.isCallback) {
					//Callback call
					options.callback.call(this, options);
					$.jaal.isCallback = true;
			}
		},

		// Function that checks if the images have been loaded
		_loadImageIfVisible : function(options, image, triggerEl) {
			var $img = $(image),
			container = (/scroll/i.test(options.event)) ? triggerEl : $window;
			//console.log($img);
			if ($.asynchAnchorBckImageLoader._isInTheScreen (container, $img, options.offset)) {
				$.asynchAnchorBckImageLoader._loadAnchImage(options, $img);
			}
			
		},

		// Function that returns true if the image is visible inside the "window" (or specified container element)
		_isInTheScreen : function($ct, $img, optionOffset) {
			var is_ct_window  = $ct[0] === window,
				ct_offset  = (is_ct_window ? { top:0, left:0 } : $ct.offset()),
				ct_top     = ct_offset.top + ( is_ct_window ? $ct.scrollTop() : 0),
				ct_left    = ct_offset.left + ( is_ct_window ? $ct.scrollLeft() : 0),
				ct_right   = ct_left + $ct.width(),
				ct_bottom  = ct_top + $ct.height(),
				img_offset = $img.offset(),
				img_width = $img.width(),
				img_height = $img.height();
			
			return (ct_top - optionOffset) <= (img_offset.top + img_height) &&
				(ct_bottom + optionOffset) >= img_offset.top &&
					(ct_left - optionOffset)<= (img_offset.left + img_width) &&
						(ct_right + optionOffset) >= img_offset.left;
		},

		// Main function --> Load the images copying the "data-style" attribute into the "style" attribute
		_loadAnchImage : function(options, $img) {
			$img.hide();
			$img.attr("style", $img.attr("data-style"));
			$img.removeAttr('data-style');

			// Images loaded with some effect if existing
			if(options.effect) {
				if (options.speed) {
					$img[options.effect](options.speed);
				} else {
					$img[options.effect]();
				}
			} else {
				$img.show();
			}
			
			// Callback after each background image is loaded
			options.callbackAfterEachImage.call(this, $img, options);
		}
	};
}(jQuery));
