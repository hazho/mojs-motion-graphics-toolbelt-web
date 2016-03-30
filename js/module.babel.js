import h from './h'

/*
  Base class for module. Extends and parses defaults.
*/
class Module {
  constructor ( o = {} ) {
    this._o     = o;
    this._index = this._o.index || 0;
    this._declareDefaults();
    this._extendDefaults();
    this._vars();
    this._render();
  }
  /*
    Method to declare defaults.
    @private
  */
  _declareDefaults () {
    this._defaults = { };
  }
  /*
    Method to declare module's variables.
    @private
  */
  _vars () {
    this._progress = 0;
    this._strokeDasharrayBuffer = [];
  }
  /*
    Method to render on initialization.
    @private
  */
  _render () { }
  /*
    Method to set property on the module.
    @private
    @param {String, Object} Name of the property to set
                            or object with properties to set.
    @param {Any} Value for the property to set. Could be
                  undefined if the first param is object.
  */
  _setProp ( attr, value ) {
    if ( typeof attr === 'object' ) {
      for ( var key in attr ) { this._assignProp( key, attr[key] ); }
    } else { this._assignProp( attr, value ); }
  }
  /*
    Method to assign single property's value.
    @private
    @param {String} Property name.
    @param {Any}    Property value.
  */
  _assignProp ( key, value ) {
    this._props[key] = value;
  }
  /*
    Method to show the main div el.
    @private
  */
  _show () {
    if (this._isShown || (this.el == null)) { return; }
    this.el.style.display = 'block';
    this._isShown = true;
  }
  /*
    Method to hide the main div el.
    @private
  */
  _hide () {
    if ((this._isShown === false) || (this.el == null)) { return; }
    this.el.style.display = 'none';
    return this._isShown = false;
  }
  /*
    Method to parse option string.
    Searches for stagger and rand values and parses them.
    Leaves the value unattended otherwise.
    @param {Any} Option value to parse.
    @returns {Number} Parsed options value.
  */
  _parseOptionString (value) {
    if (typeof value === 'string') {
      if (value.match(/stagger/)) {
        value = h.parseStagger(value, this._index);
      }
    }
    if (typeof value === 'string') {
      if (value.match(/rand/)) {
        value = h.parseRand(value);
      }
    }
    return value;
  }
  /*
    Method to parse postion option.
    @param {String} Property name.
    @returns {String} Parsed options value.
  */
  _parsePositionOption (key) {
    var value = this._props[key];
    if (h.unitOptionMap[key]) { value = h.parseUnit(value).string; }
    return value;
  }
  /*
    Method to parse strokeDash.. option.
    @param {String} Property name.
    @returns {String} Parsed options value.
  */
  _parseStrokeDashOption (key) {
    var value  = this._props[key],
        result = value;
    // parse numeric/percent values for strokeDash.. properties
    if ( (key === 'strokeDasharray') || (key === 'strokeDashoffset') ) {
      var result = [];
      switch (typeof value) {
        case 'number':
          result.push(h.parseUnit(value));
          break;
        case 'string':
          var array = this._props[key].split(' ');
          for (var i = 0; i < array.length; i++ ) {
            result.push(h.parseUnit(array[i]));
          }
          break;
      }
    }
    return result;
  }
  /*
    Method to check if the property is delta property.
    @private
    @param {Any} Parameter value to check.
    @returns {Boolean}
  */
  _isDelta ( optionsValue ) {
    var isObject = h.isObject( optionsValue );
    isObject = isObject && !optionsValue.unit;
    return !(!isObject || h.isArray(optionsValue) || h.isDOM(optionsValue));
  }
  /*
    Method to get delta from property and set
    the property's start value to the props object.
    @private
    @param {String} Key name to get delta for.
    @param {Object} Option value to get the delta for.
  */
  _getDelta ( key, optionsValue ) {
    var delta;
    if ((key === 'left' || key === 'top') && !this._o.ctx) {
      h.warn(`Consider to animate x/y properties instead of left/top,
        as it would be much more performant`, optionsValue);
    }
    // skip delta calculation for a property if it is listed
    // in skipPropsDelta object
    if ( this._skipPropsDelta && this._skipPropsDelta[key] ) { return; }
    // get delta
    delta = h.parseDelta(key, optionsValue, this._index);
    // if successfully parsed - save it
    if (delta.type != null) { this._deltas[key] = delta; }
    // set props to start value of the delta
    this._props[key] = delta.start;
  }
  /*
    Method to copy `_o` options to `_props` object
    with fallback to `_defaults`.
  */
  _extendDefaults ( ) {
    this._props  = {};
    this._deltas = {};
    for (var key in this._defaults) {
      // skip property if it is listed in _skipProps
      if (this._skipProps && this._skipProps[key]) { continue; }
      // copy the properties to the _o object
      var value = ( this._o[key] != null ) ? this._o[key] : this._defaults[key];
      // parse option
      this._parseOption( key, value );
    }
  }
  /*
    Method to tune new oprions to _o and _props object.
    @private
    @param {Object} Options object to tune to.
  */
  _tuneNewOptions (o) {
    // hide the module before tuning it's options
    // cuz the user could see the change
    this._hide();
    for (var key in o) {
      // skip property if it is listed in _skipProps
      if (this._skipProps && this._skipProps[key]) { continue; }
      // copy the properties to the _o object
      // delete the key from deltas
      o && (delete this._deltas[key]);
      // rewrite _o record
      this._o[key] = o[key];
      // save the options to _props
      this._parseOption( key, o[key] );
    }
  }
  /*
    Method to parse option value.
    @param {String} Option name.
    @param {Any} Option value.
  */
  _parseOption ( name, value ) {
    // if delta property
    if ( this._isDelta( value ) && name !== 'callbacksContext' ) {
      this._getDelta( name, value ); return;
    }
    // parse stagger and rand values
    this._assignProp( name, this._parseOptionString(value) );
    // parse units for position properties
    this._assignProp( name, this._parsePositionOption(name) );
    // parse numeric/percent values for strokeDash.. properties
    this._assignProp( name, this._parseStrokeDashOption(name) );
  }
  /*
    Method to calculate current progress of the deltas.
    @private
    @param {Number} Progress to calculate - [0..1].
  */
  _calcCurrentProps ( p ) {
    for (var key in this._deltas) {
      var value = this._deltas[key];
      if ( value.type === 'array' ) {
        this._strokeDasharrayBuffer.length = 0;
        for ( var i = 0; i < value.delta.length; i++ ) {
          var item = value.delta[i],
              dash = value.start[i].value + p * item.value;
          this._strokeDasharrayBuffer.push({ value: dash, unit: item.unit });
        }
        this._props[key] = this._strokeDasharrayBuffer;
      } else if ( value.type === 'number' ) {
        this._props[key] = value.start + value.delta * p;
      } else if ( value.type === 'unit' ) {
        this._props[key] =
          `${value.start.value + p*value.delta}${value.end.unit}`;
      } else if ( value.type === 'color' ) {
        var r = parseInt(value.start.r + p * value.delta.r, 10),
            g = parseInt(value.start.g + p * value.delta.g, 10),
            b = parseInt(value.start.b + p * value.delta.b, 10),
            a = parseInt(value.start.a + p * value.delta.a, 10);
        this._props[key] = `rgba(${r},${g},${b},${a})`;
      }
    }
  }
  /*
    Method to calculate current progress and probably draw it in children.
    @private
    @param {Number} Progress to set - [0..1].
  */
  _setProgress ( progress ) {
    this._progress = progress;
    this._calcCurrentProps(progress);
  }
}

export default Module;