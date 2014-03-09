/**
 * Component Loader  
 * 
 * - All components on the site are registered using this object
 * - Automatically initializes components that exist on current page
 * 
 * To create a component the markup needs to have a class name  
 * using the format component-{component name}
 * 
 *  Example: <div class="js-component-header" >
 *  
 * To register a component the register function needs to be called
 * with a parameters for {component name} and { initiation funciton }
 *  
 *  Example: componentLoader.register("header", Components.Header);
 *  
 *  
 * @author Hjörtur Hilmarsson
 * @author David Lindkvist
 * @author Marco Barbosa
 * @author Paul Lewis
 * 
 * @version 1.1.0
 * 
 * @uses js/jquery-1.4.3.js
 * 
 * @method
 * componentLoader.initializeComponents();
 * - To detect and load components on the page
 * 
 * @method
 * componentLoader.register();
 * - To register a component
 * 
 * @method
 * componentLoader.checkForNewComponents
 * - To detect new components injected after page load
 * 
 */

/*global jQuery: true  */	

/**
 * Global instance of the component loader
 **/
componentLoader = (function ($) {
	'use strict';
	// this scope
	var api = {};

	/**
	 * Hash that stores all components on a page
	 **/
	var _componentsHash = {};
	
	
	/**
	 * Hash of all the components and their
	 * api generators. Used when we want
	 * to instantiate components after
	 * the initial page render.
	 */
	var _availableComponents = [];
	
	/**
	 * Hash of registered instances of components
	 * to be called outside of the instance
	 * preferably by flash
	 */
	var _registeredComponents = {};
	
	
	/**
	 * Array of components that have registered
	 * for notifications on the basis that could
	 * not render when initialized
	 */
	var _registeredForNotifications = [];
	
	
	/**
	 * Scans for components on a page and add each
	 * instance to the component hash
	 * 
	 * Components are specified in the markup with a class name  
	 * using the format component-{component name}
	 * 
	 *  Example: <div class="js-component-header" >
	 *  
	 * @author Hjörtur Hilmarsson
	 * @author Paul Lewis
	 * @author David Lindkvist
	 * @author Marco Barbosa
	 * 
	 * @param {Object} The context from which to begin the search (optional)
	 **/
	function scan( context ) {
		
		context = context || document.body;
		
		var COMPONENT_PREFIX = "js-component-";
			
		// loops through all component instances on page
		$("[class*='"+ COMPONENT_PREFIX +"']", context).each(function() {
		
			var sName = "";
			var element = $(this);
			
			// check this hasn't already been added to
			// the array of elements
			if (!element.data("componentized")) {
			
				// find the name of the component instance
				var aClassList = element.attr("class").split(" ");
				$.each(aClassList, function(){
				
					var iIndex = this.indexOf(COMPONENT_PREFIX);
					
					// if component instance exists
					if (iIndex > -1) {
						sName = this.slice(COMPONENT_PREFIX.length);
						
						var elementInstanceArray = [];
						
						// if component already exists inside hash
						// get the its instance array
						if (_componentsHash[sName]) {
							elementInstanceArray = _componentsHash[sName];
						}
						
						elementInstanceArray.push(element);
						_componentsHash[sName] = elementInstanceArray;
						
						return;
					}
					
				});
			}
		}); 
	}
	
	/**
	 * Rescans from the context provided
	 * for any components 
	 * 
	 * @param {Object} The context from which to start scanning
	 */
	api.checkForNewComponents = function (context) 
	{
		context = context || document.body;
		
		// look for new components
		scan(context);
		
		// and init them if you find any
		api.initializeComponents();
	};
	
	
	/**
	 * Initializes any components in the page
	 * that have yet to be initialized
	 */
	api.initializeComponents = function () {
		
		// go through all the available components
		for (var c = 0; c < _availableComponents.length; c++) {
		
			// grab the component
			var component = _availableComponents[c],
			    sName     = component.name,
			    oFunction = component.func;
		
			// checks if component exist the page
			if (_componentsHash[sName]) {
			
				// get the instance array for the component
				var elementInstanceArray = _componentsHash[sName];
				
				// loop through all instances
				$.each(elementInstanceArray, function(index, element) {
				
					var $element = $(element);
				
					// execute instance of component
					if (oFunction !== undefined && !$element.data('componentized')) {
					
						// flag this as componentized so we don't
						// do it a second time
						$element.data('componentized', true);
					
						// create the component
						var componentAPI = new oFunction(element);

						// create a random id for the component
						// we also add some characters in front of the id 
						// because ie needs all ids of elements to start 
						// with a character
						var componentId = null;
						
						// ensure we don't get any collisions
						do {
							componentId = "i14" + Math.floor(Math.random() * 10000000);
						}
						while (_registeredComponents[componentId]);
						
						// assign the id and context
						componentAPI.id = componentId;
						componentAPI.context = element;
						
						if (!$.isPlainObject(componentAPI)) {
							throw ("Component " + sName + " does not return an api");
						}
						
						// add to hash of registered components
						// to be able to call later from flash
						_registeredComponents[componentId] = componentAPI;
						
						// initialize the component
						if ($.isFunction(componentAPI.init)) {
							componentAPI.init();
						}
						
						// render the component if it is visible
						// otherwise save it for later use
						if ($.isFunction(componentAPI.render)) {
							if (element.is(":visible")) {
								componentAPI.render();
							} else { 
								_registeredForNotifications.push(componentAPI);
							}
						}
					}
				});
			}
		}
	};

	/**
	 * This function is used by components to register.
	 * 
	 * The function checks if component exists on the page and
	 * executes the component once for each instance that it finds
	 *  
	 * @param {String} sName - The component name
	 * @param {Object} oFunction - Function that initalizes the component
	 */
	api.register = function (sName, oFunction) {
		
		if(typeof(_availableComponents[sName]) === "undefined") {
			_availableComponents.push({name:sName, func:oFunction});
		} else {
			throw("There is already a registered component named "+sName);
		}
	};
	
	/**
	 * Helper function to find a instance
	 * of a component using its Id
	 * 
	 * @param {Number} componentId - The component id
	 * 
	 */
	api.findInstanceById = function (componentId) {
		
	
		return _registeredComponents[componentId];
		
	};
	
	/**
	 * Helper function that creates a string to execute a 
	 * function of a component instance, inside Flash
	 * 
	 * @param {String} functionName - The component name
	 * @param {Number} componentId - The component id
	 * 
	 */
	api.getFunctionString = function (functionName, componentId) {
		
		return "ComponentLoader.findInstanceById('" + componentId + "')." + functionName;
		
	};
	
	
	/**
	 * Notifies all components that there's been a change
	 * in render state and to try drawing again
	 */
	api.notifying = false;
	api.notifyAll = function () {
		
		// prevent recursive notification loops
		if (!api.notifying) {
		
			api.notifying = true;
		
			var toRemove = [];
			
			$.each(_registeredForNotifications, function(index, componentAPI){
				
				// if the item accepted the notify
				// then remove it from the array
				if ($.isFunction(componentAPI.render) && componentAPI.context.is(":visible"))
				{
					componentAPI.render();
					toRemove.push(index);
				}
			});
			
			while (toRemove.length) {
				_registeredForNotifications.splice(toRemove.pop(), 1);
			}
		
			api.notifying = false;
		}
	};
	
	
	// scan the document
	scan();
	
	// returns 
	// outer members
	return api;
	
}(jQuery));


/*
 * Register global Components namespace
 */
components = {};

