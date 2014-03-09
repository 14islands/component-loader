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

    var context              = context || document.body,
        COMPONENT_PREFIX     = "js-component-",
        aComponents          = context.querySelectorAll("[class*='"+ COMPONENT_PREFIX +"']"),
        aClassList           = [],
        iIndex               = -1,
        elementInstanceArray = [],
        sName                = "";

    // loops through all component instances on page
    [].forEach.call( aComponents, function(element) {

      sName = "";

      // check this hasn't already been added to
      // the array of elements
      if (!element.getAttribute("data-componentized")) {

        // find the name of the component instance
        aClassList = element.getAttribute("class").split(" ");

        aClassList.forEach(function(sClass) {

          iIndex = sClass.indexOf(COMPONENT_PREFIX);

          // if component instance exists
          if (iIndex > -1) {
            elementInstanceArray = [];
            sName = sClass.slice(COMPONENT_PREFIX.length);

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
   * Checks if the given component is visible on the page.
   *
   * @see http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
   *
   * @param  {Object}  element HTML element to be checked.
   *
   * @return {Boolean}         True/False for visibility.
   */
  function isVisible(element) {
    var oStyle = window.getComputedStyle(element);

    if (oStyle.display !== 'none' &&
        oStyle.visibility !== 'hidden' &&
        element.offsetParent !== null) {

      return true;

    }

    return false;

  }

  /**
   * Rescans from the context provided
   * for any components
   *
   * @param {Object} The context from which to start scanning
   */
  api.checkForNewComponents = function (context) {
    var context = context || document.body;

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
    var component            = null,
        sName                = null,
        oFunction            = null,
        oStyle               = null,
        c                    = 0,
        cLen                 = _availableComponents.length,
        elementInstanceArray = null,
        componentAPI         = null,
        componentId          = null;

    // go through all the available components
    for (c = 0; c < cLen; c++) {

      // grab the component
      component = _availableComponents[c];
      sName     = component.name;
      oFunction = component.func;
      oStyle    = null;

      // checks if component exist the page
      if (_componentsHash[sName]) {

        // get the instance array for the component
        elementInstanceArray = _componentsHash[sName];

        // loop through all instances
        elementInstanceArray.forEach(function(element, index) {

          // execute instance of component
          if (oFunction !== undefined && !element.getAttribute('data-componentized')) {

            // flag this as componentized so we don't
            // do it a second time
            element.setAttribute('data-componentized', true);

            // create the component
            componentAPI = new oFunction(element);

            // create a random id for the component
            // we also add some characters in front of the id
            // because ie needs all ids of elements to start
            // with a character
            componentId = null;

            // ensure we don't get any collisions
            do {
              componentId = "i14" + Math.floor(Math.random() * 10000000);
            }
            while (_registeredComponents[componentId]);

            // assign the id and context
            componentAPI.id = componentId;
            componentAPI.context = element;

            if (!componentAPI || typeof componentAPI !== "object") {
              throw ("Component " + sName + " does not return an api");
            }

            // add to hash of registered components
            // to be able to call later from flash
            _registeredComponents[componentId] = componentAPI;

            // initialize the component
            if (typeof componentAPI.init === "function") {
              componentAPI.init();
            }

            // render the component if it is visible
            // otherwise save it for later use
            if (typeof componentAPI.render === "function") {
              if ( isVisible(element) ) {
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

    var toRemove = null;

    // prevent recursive notification loops
    if (!api.notifying) {

      api.notifying = true;

      toRemove = [];

      _registeredForNotifications.forEach(function(componentAPI, index) {

        // if the item accepted the notify
        // then remove it from the array
        if (typeof componentAPI.render === "function" &&
          isVisible(componentAPI.context)) {

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

