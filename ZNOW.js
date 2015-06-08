/**
 * ZNOW JavaScript Framework v0.3.1
 * Copyright 2014, Icarus So, Peter Denev
 * Licensed under the MIT or GPL Version 2 licenses.
 * Date: June 08 2015
 *
 * Copyright (C) 2014 by Icarus So
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function (root, factory) { // UMD from https://github.com/umdjs/umd/blob/master/returnExports.js
    if(typeof define === 'function' && define.amd) {
        define('ZNOW', [], factory);
    }else if (typeof exports === 'object') {
        module.exports = factory();
    } else { // Browser globals
        root.ZNOW = factory();
        for(var property in root.ZNOW) {
        	root[property]=root.ZNOW[property];
        }
    }
}(this, function () {

	if (typeof console === "undefined" || typeof console.warn === "undefined"){
		console={};
		console.warn=function(){};
	}	

	var __ZNOW__abastract=function(){/*ABSTRACT*/}
	var ABSTRACT=function(){ return __ZNOW__abastract;};

	var READ=function(val){ return{ 'val':val===undefined?null:val, '__read':true} };

	var CONST=function(val){ return{ 'val':val===undefined?null:val, '__const':true} };

	var EVENT=function(){ /*EVENT_LISTENER*/};

	var FINAL=function(f){
		f.__final=true;
		return f;
	}

	/*Deprecated*/ var VIRTUAL=function(f){
		f.__virtual=true;
		return f;
	}

	var genEventStr=function(name){
		var newName='';
		var prefix=/^[_|$]*/.exec(name)[0];
		newName='$'+prefix+'on'+name.charAt(prefix.length).toUpperCase()+name.substr(prefix.length+1);
		return newName;
	}

	var genMethodSet=function(module, rtn){
		var methodSet={};
		for(var prop in module){
			if(/^static./.test(prop)) continue;
			if(!(module[prop] instanceof Function)) continue;
			if(/^__/.test(prop)) continue;
			
			if(module[prop]==ABSTRACT()){
				methodSet[prop]=ABSTRACT();
				continue;
			}
			if(module[prop]==EVENT ){
				methodSet[genEventStr(prop)]=function(prop){
					return function(){
						var _args=arguments;
						var _continue=true;
						this['$$'+prop].forEach(function(callback){
							if(!_continue) return;
							_continue = !(callback.apply(this, _args)===false);
						})
						return _continue;
					}
				}(prop);
				continue;
			}
			
			methodSet[prop]=function(prop){
				return function(){ return module[prop].apply(this, arguments);}
			}(prop);
			if(module[prop].__final) methodSet[prop].__final=true;
		}
		
		if(!methodSet['init'] && !methodSet['$init']  && !methodSet['_init'] ){
			methodSet['init']=function(){
				if(rtn.__baseClass) this.super.apply(this, arguments);
			}
		}
		
		if(rtn.__baseClass){
			var baseMethodSet=rtn.__baseClass.__methodSet;
			for(var prop in baseMethodSet){
				if(!(baseMethodSet[prop] instanceof Function)) continue;
				if(prop[0]=='_') continue;
				if(methodSet.hasOwnProperty(prop) && baseMethodSet[prop].__final){
					throw new Error('WARN:: final mehtod cannot be overrided '+prop);
				};
				if(methodSet.hasOwnProperty(prop)) continue;
				if(/^[_|$]?init$/.test(prop)) continue;
			
				console.log('base', prop, baseMethodSet[prop]);
				if(module[prop]==ABSTRACT()){
					methodSet[prop]=ABSTRACT();
					continue;
				}
				
				if(baseMethodSet[prop] == ABSTRACT()){
					methodSet[prop] = ABSTRACT();
				}else{
					methodSet[prop]=function(prop){
						return function(){ return baseMethodSet[prop].apply(this, arguments);}
					}(prop);
				}
			}
		}
		
		for(var prop in methodSet){
			methodSet[prop]['_']=rtn;
		}	
		return methodSet;
	}

	var genAttrTemp=function(module){
		var attrTemp=function(baseAttrSet){
			for(var prop in module){
				if(/^static./.test(prop)) continue;
				if(module[prop] instanceof Function && module[prop]!=EVENT ) continue;
				if(/^__/.test(prop)) continue;
				if(module[prop].__read){
					this[prop]=module[prop].val;
					this['__read'+prop]=true;
					continue;
				}
				if(module[prop].__const){
					this[prop]=module[prop].val;
					this['__const'+prop]=true;
					continue;				
				}
				if(module[prop]==EVENT ){
					this['$$'+prop]=[];
					continue;
				}
				this[prop]=module[prop];
			}
			if(baseAttrSet){
				for(var prop in baseAttrSet){
					if(prop[0]=='_') continue;
					if(module[prop]) continue;				
					Object.defineProperty(this, prop, {
						get:function(prop){
							return function(){
								return baseAttrSet[prop];
							}
						}(prop),
						set:function(prop){
							return function(value){
								if(baseAttrSet['__read'+prop] && prop[0]=='$'){
									console.warn('WARN:: accessing read only attr '+prop);
									return;
								}
								return (baseAttrSet[prop]=value);
							}
						}(prop)
					})
				}
			}
		}
		return attrTemp;
	}

	var canAccess=function(caller, sign, prop){
		if(!caller) return false;
		if(caller['_']){
			var _class=caller['_'];
			if(prop[0]=='_'){
				return _class==sign;
			}
			do{
				if(_class==sign) return caller['_'];
				_class=_class.__baseClass;
			}while(_class)
			return false;
		}
		return canAccess(caller.caller, sign, prop);
	}

	var genStaticPropSet=function(module, rtn){
		var propSet={};
		var eventArr=[];
		for(var prop in module){
			if(!/^static./.test(prop)) continue;
			var propName=prop.substr(7);
			if(module[prop].__const){
				propSet[propName]=module[prop].val;
				propSet['__const'+propName]=true;
			}else if(module[prop].__read){
				propSet[propName]=module[prop].val;
				propSet['__read'+propName]=true;			
			}else if(module[prop]==EVENT){
				eventArr.push(propName);
			}else if(module[prop]==ABSTRACT()){
				throw new Error('static method cannot be abstract '+propName);
			}else{
				propSet[propName]=module[prop];
			}
			if(propSet[propName] instanceof Function) propSet[propName]['_']=rtn;
		}
		
		for(var i=0; i<eventArr.length; i++){
			var propName=eventArr[i];
			
			propSet['$$'+propName]=[];
			propSet[genEventStr(propName)]=function(propName){
				return function(){
					var _args=arguments;
					var _continue=true;
					this['$$'+propName].forEach(function(callback){
						if(!_continue) return;
						_continue = !(callback.apply(this, _args)===false);
					})
					return _continue;
				}
			}(propName);
			propSet[genEventStr(propName)]['_']=rtn
		}
		
		propSet.on=function(eventStr, callback, first){
			if( this['$$'+eventStr] && this['$$'+eventStr].indexOf(callback)==-1){
				if (first) this['$$'+eventStr].unshift(callback)
				else this['$$'+eventStr].push(callback);
				return callback;
			}
			return false;
		};
		propSet.on['_']=rtn;
		
		propSet.off=function(eventStr, callback){
			if( this['$$'+eventStr] && this['$$'+eventStr].indexOf(callback)!=-1){
				var index=this['$$'+eventStr].indexOf(callback);
				this['$$'+eventStr].splice(index, 1);
				return true;
			}
			return false;
		};
		propSet.off['_']=rtn;	
		
		if(rtn.__baseClass){
			var basePropSet=rtn.__baseClass.__staticSet;
			var baseClass = rtn.__baseClass;
			for(var prop in basePropSet){
				if(basePropSet[prop] instanceof Function && propSet.hasOwnProperty(prop) && baseClass[prop].__final){
					throw new Error('WARN:: final static method cannot be overrided '+prop);
				}
				if(propSet.hasOwnProperty(prop)) continue;
				if(basePropSet[prop] instanceof Function){
					propSet[prop]=function(prop){
						return function(){ return baseClass[prop].apply(this, arguments)};
					}(prop);
					propSet[prop]['_']=rtn;
				}else{
					Object.defineProperty(propSet, prop, {
						get:function(prop){
							return function(){ return baseClass[prop]; }
						}(prop),
						set:function(prop){
							return function(value){ return (baseClass[prop]=value)};
						}(prop)
					})
				}
			}
		}
		
		for(var prop in propSet){
			if(propSet[prop] instanceof Function){
				rtn[prop]=function(prop){
					return function(){
						if(!/^[_|$]/.test(prop) || canAccess(arguments.callee.caller, rtn, prop)){
							return propSet[prop].apply(this, arguments);
						}else{
							console.warn('WARN:: cannnot access static method '+prop);
						}
					}
				}(prop);
				if(propSet[prop].__final) rtn[prop].__final=true;
			}else{
				Object.defineProperty(rtn, prop, {
					get:function(prop){
						return function(){
							if(!/^[_|$]/.test(prop) || canAccess(arguments.callee.caller, rtn, prop)){
								return propSet[prop];
							}else{
								console.warn('WARN:: cannnot access static attribute '+prop);
							}					
						}
					}(prop),
					set:function(prop){
						if(propSet['__const'+prop]){
							return function(){
								console.warn('WARN:: cannot change const static attribute '+prop);
							}
						}
						if(propSet['__read'+prop]){
							return function(value){
								var caller=canAccess(arguments.callee.caller, rtn, prop);
								if(!caller){
									console.warn('WARN:: cannot change readonly attribute '+prop);								
								}else if(prop[0]=='$' && caller!=rtn){
									console.warn('WARN:: cannot change readonly attribute '+prop);								
								}else{
									return (propSet[prop]=value);
								}
							}
						}
						return function(value){
							if(!/^[_|$]/.test(prop) || canAccess(arguments.callee.caller, rtn, prop)){
								return (propSet[prop]=value);
							}else{
								console.warn('WARN:: cannnot access static attribute '+prop);
							}					
						}				
					}(prop)
				})
			}
		}
		return propSet;
	}

	var getClassArr=function(ptClass){
		var arr=[];
		do{
			arr.push(ptClass);
			ptClass=ptClass.__baseClass
		}while(ptClass);
		return arr.reverse();
	}

	var genAttrSet=function(classArr){
		var arr=[];
		arr[0]=new (classArr[0].__attrTemp)();
		for(var i=1; i<classArr.length; i++){
			arr[i]=new classArr[i].__attrTemp(arr[i-1]);
		}
			
		for(var i=0; i<arr.length; i++){
			var attrSet=arr[i];
			for(var prop in attrSet){
				if(Array.isArray(attrSet[prop])){
					attrSet[prop]=attrSet[prop].slice();
				}else if(attrSet[prop] instanceof Object){
					if(Object.keys(attrSet[prop]).length == 0){
						attrSet[prop]={};
					}
				}
			}
		}
		
		return arr;
	}

	var getMethodSetArr=function(classArr){
		/*
		var arr=[];
		for(var i=0; i<classArr.length; i++){
			arr.push(classArr[i].__methodSet);
		}
		return arr;
		*/
		return classArr.map(function(ptClass){ return ptClass.__methodSet;});
	}

	var getExtendedModule=function(methodSetArr, attrSetArr){
		var extendedModule={};
		for(var i=methodSetArr.length-1;i>=0; i--){
			var methodSet=methodSetArr[i];
			var attrSet=attrSetArr[i];
			
			for(var prop in methodSet){
				if(extendedModule.hasOwnProperty(prop)) continue;
				extendedModule[prop]=methodSet[prop];
			}
			
			for(var prop in attrSet){
				if(extendedModule.hasOwnProperty(prop)) continue;
				extendedModule[prop]=attrSet[prop]
			}
		}
		return extendedModule;
	}

	var checkCaller=function(caller, classArr, depth){
		depth = typeof depth!=='undefined' ? depth : 0;
		if(!caller) return -1;
		if(caller['_']){
			return classArr.indexOf(caller['_']);
		}
		if(depth>20) return -1; //prevent infinite loop (ex. when AMD)
		return checkCaller(caller.caller, classArr, ++depth);
	
	}

	var checkAbstractExpt=function(index, prop, methodSetArr){
		while(methodSetArr[index][prop]==ABSTRACT()){
			index++;
		}
		return index;
	}

	var checkVirtualExpt=function(index, prop, methodSetArr){
		while(methodSetArr[index][prop].__virtual && index<methodSetArr.length){
			index++;
		}
		return index;
	}

	var allVirtualExpt=function(index, prop, methodSetArr){
		//console.warn('allVirtualExpt');
		if(prop[0]!='_') return methodSetArr.length-1;
		return index;
	}

	var genAccessor=function(extendedModule, methodSetArr, attrSetArr, classArr){
		var accessor=function(){
			var index=checkCaller(arguments.callee.caller, classArr);
			var f=arguments[0];
			f['_']=classArr[index];
			return f;
		};
		accessor.__initialized=false;
		
		for(var prop in extendedModule){
			if(extendedModule[prop] instanceof Function){
				accessor[prop]=function(prop){
					return function(){
						var index=checkCaller(arguments.callee.caller, classArr);
						if(index==-1){
							// public access
							if(prop[0]=='_' || prop[0]=='$'){
								console.warn('WARN:: public accessing private or protected method '+prop);
							}else{
								var index=methodSetArr.length-1;
								return methodSetArr[index][prop].apply(accessor, arguments);
							}
						}else{
							if(methodSetArr[index].hasOwnProperty(prop)){
								//index=checkAbstractExpt(index, prop, methodSetArr);
								//index=checkVirtualExpt(index, prop, methodSetArr);
								index=allVirtualExpt(index, prop, methodSetArr);
								return methodSetArr[index][prop].apply(accessor, arguments);
							}else{
								// instance has no such method
								if(prop[0]=='_' || prop[0]=='$'){
									console.warn('WARN:: base accessing extended private or protected method '+prop);							
								}else{
									var index=methodSetArr.length-1;
									return methodSetArr[index][prop].apply(accessor, arguments);							
								}
							}
						}
					}
				}(prop)
			}else{
				Object.defineProperty(accessor, prop, {
					get:function(prop){
						return function(){
							var index=checkCaller(arguments.callee.caller, classArr);
							if(index==-1){
								// public access
								if(prop[0]=='_' || prop[0]=='$'){
									console.warn('WARN:: public accessing private or protected method '+prop);	
								}else{
									var index=attrSetArr.length-1;
									return attrSetArr[index][prop];
								}
							}else{
								if(attrSetArr[index].hasOwnProperty(prop)){
									return attrSetArr[index][prop];
								}else{
									// instance has no such attribute
									if(prop[0]=='_' || prop[0]=='$'){
										console.warn('WARN:: base accessing extended private or protected attribute '+prop);							
									}else{
										var index=methodSetArr.length-1;
										return attrSetArr[index][prop];						
									}							
								}
							}
						}
					}(prop),
					set:function(prop){
						return function(value){
							var index=checkCaller(arguments.callee.caller, classArr);
							if(index==-1){
								// public access
								if(prop[0]=='_' || prop[0]=='$'){
									console.warn('WARN:: public accessing private or protected method '+prop);	
								}else{
									var index=attrSetArr.length-1;
									if(attrSetArr[index]['__read'+prop]){
										console.warn('WARN:: public accessing read only attribute '+prop);
										return;
									}
									if(accessor.__initialized && attrSetArr[index]['__const'+prop]){
										console.warn('WARN:: cannot change cost attribute '+prop);
										return;
									}
									return (attrSetArr[index][prop]=value);
								}
							}else{
								if(accessor.__initialized && attrSetArr[index]['__const'+prop]){
									console.warn('WARN:: cannot change cost attribute '+prop);
									return;
								}
								if(attrSetArr[index].hasOwnProperty(prop)){
									return (attrSetArr[index][prop]=value);
								}else{
									// instance has no such attribute
									if(prop[0]=='_' || prop[0]=='$'){
										console.warn('WARN:: base accessing extended private or protected attribute '+prop);							
									}else{
										var index=methodSetArr.length-1;
										if(attrSetArr[index]['__read'+prop]){
											console.warn('WARN:: accessing read only attribute '+prop);
											return;
										}
										return (attrSetArr[index][prop]=value);				
									}							
								}
							}
						}		
					}(prop)
				})
			}	
		}
		
		var _super=function(){
			var index=checkCaller(arguments.callee.caller, classArr);
			initClass(methodSetArr, index-1, accessor, arguments);
		};
		
		for(var prop in extendedModule){
			if(extendedModule[prop] instanceof Function){
				_super[prop]=function(prop){
					return function(){
						var index=checkCaller(arguments.callee.caller, classArr);					
						if(methodSetArr[index].hasOwnProperty(prop)){
							if(methodSetArr[index-1][prop]==ABSTRACT()){
								index=checkAbstractExpt(index-1, prop, methodSetArr);
								return methodSetArr[index][prop].apply(accessor, arguments);
							}
							return methodSetArr[index-1][prop].apply(accessor, arguments);
						}else{
							console.warn('WARN:: super does not have such method '+prop);		
						}
					}
				}(prop)
			}else{
				Object.defineProperty(_super, prop, {
					get:function(prop){
						return function(){
							var index=checkCaller(arguments.callee.caller, classArr);						
							if(attrSetArr[index].hasOwnProperty(prop)){
								return attrSetArr[index-1][prop];
							}else{
								console.warn('WARN:: super does not have such attr '+prop);							
							}
						}
					}(prop),
					set:function(prop){
						return function(value){
							var index=checkCaller(arguments.callee.caller, classArr);						
							if(attrSetArr[index].hasOwnProperty(prop)){
								if(attrSetArr[index-1]['__read'+prop]){
									console.warn('WARN:: accessing read only attribute '+prop);
									return;
								}
								if(accessor.__initialized && attrSetArr[index]['__const'+prop]){
									console.warn('WARN:: cannot change cost attribute '+prop);
									return;
								}
								return (attrSetArr[index-1][prop]=value);
							}else{
								console.warn('WARN:: super does not have such attr '+prop);							
							}							
						}		
					}(prop)
				})
			}	
		}	
		
		Object.defineProperty(accessor, 'super', {
			get:function(){
				var index=checkCaller(arguments.callee.caller, classArr);
				if(index==-1){
					console.warn('WARN:: public access super');
				}else if(index==0){
					console.warn('WARN:: no super for this class');			
				}else{
					return _super;
				}
			}
		})
		
		accessor.on=function(eventStr, callback, first){
			if( this['$$'+eventStr] && this['$$'+eventStr].indexOf(callback)==-1){
				if (first) this['$$'+eventStr].unshift(callback)
				else this['$$'+eventStr].push(callback);
				return callback;
			}
			return false;
		};
		accessor.on['_']=classArr[0];
		
		accessor.off=function(eventStr, callback){
			if( this['$$'+eventStr] && this['$$'+eventStr].indexOf(callback)!=-1){
				var index=this['$$'+eventStr].indexOf(callback);
				this['$$'+eventStr].splice(index, 1);
				return true;
			}
			return false;
		};
		accessor.off['_']=classArr[0];	
		
		accessor.class=classArr[classArr.length-1];
		accessor.instanceOf=function(checkClass){
			return classArr.indexOf(checkClass) != -1;
		}
		
		return accessor;
	}

	var initClass=function(methodSetArr, index, accessor, arguments, classArr){
		var i;
		if(classArr){i=checkCaller(arguments.callee.caller, classArr);}
		if(methodSetArr[index].hasOwnProperty('init')){
			methodSetArr[index].init.apply(accessor, arguments);
		}else if(methodSetArr[index].hasOwnProperty('$init')){
			if(i == -1){
				throw new Error('accessing protected constructor');			
			}else methodSetArr[index].$init.apply(accessor, arguments);
		}else if(methodSetArr[index].hasOwnProperty('_init')){
			if(i ==-1){
				throw new Error('accessing private constructor');
			}else methodSetArr[index]._init.apply(accessor, arguments);
		} 
		accessor.__initialized=true;
	}

	var checkSafeInstance=function(extendedModule, intf){
		for(var prop in extendedModule){
			if(extendedModule[prop] == ABSTRACT()){
				throw new Error('WARN:: some methods have not been implemented '+prop);
			}
		}
		
		for(var prop in intf){
			if(!extendedModule[prop]) throw new Error('some methods have not been implemented '+prop);
		}
	}

	var checkSafeClass=function(methodSetArr, intf){
		var registeredMethodSet={};
		for(var i=0; i<methodSetArr.length; i++){
			var methodSet=methodSetArr[i];
			for(var prop in methodSet){
				registeredMethodSet[prop]=true;
			}
		}
		
		
		for(var prop in intf){
			if(!registeredMethodSet[prop]) throw new Error('some methods have not been implemented '+prop);
		}
		
	}

	var getCombinedIntf=function(intfArr){
		if(! (intfArr instanceof Array)) intfArr = [intfArr];
		var combinedIntf={};
		for(var i=0; i<intfArr.length; i++){
			var tIntf = intfArr[i];
			for(var prop in tIntf){
				combinedIntf[prop]=tIntf[prop];
			}
		}
		return combinedIntf;
	}

	var cloneModule=function(module){
		var nModule = {};
		for(var prop in module){
			nModule[prop]=module[prop];
		}
		return nModule;
	}

	var getConstructorName=function(init_f){ //beta
		if(init_f.hasOwnProperty('_') && init_f._.hasOwnProperty('__module')){
			var init_methods = ['init','$init','_init'];
			for(var k in init_methods){
				if(init_f._.__module.hasOwnProperty(init_methods[k])){
					return init_f._.__module[init_methods[k]].name;
				}
			}
		}
		return '__ANONYMOUS_ZNOW_CLASS__';		
	}

	var Class=function(module){
		var rtn=function(){
			if(!(this instanceof rtn)){ 
				var f=arguments[0];
				if(f instanceof Function){
					f['_']=rtn;
					return f;
				}
				throw new Error('Class must be initialized with new operator');
			}
			var attrSetArr = genAttrSet(classArr);
			var extendedModule = getExtendedModule(methodSetArr, attrSetArr);
			checkSafeInstance(extendedModule, rtn.__intf);
			var accessor = genAccessor(extendedModule, methodSetArr, attrSetArr, classArr);
			
			initClass(methodSetArr, methodSetArr.length-1, accessor, arguments, classArr);
			
			return accessor;
		}
		if(module.__baseClass) rtn.__baseClass = module.__baseClass;
		rtn.__methodSet=genMethodSet(module, rtn);
		rtn.__attrTemp=genAttrTemp(module);
		rtn.__module=module;
		rtn.__staticSet = genStaticPropSet(module, rtn);
		rtn.__intf=module.__intf;
		
		var classArr=getClassArr(rtn);
		var methodSetArr = getMethodSetArr(classArr);
		checkSafeClass(methodSetArr, rtn.__intf);
		rtn.constructorName = getConstructorName(methodSetArr[0].init);
		return rtn;
	}

	Class.extends=function(baseClass){
		var rtn=function(module){
			var nModule = cloneModule(module);
			nModule.__baseClass=baseClass;
			return Class(nModule);
		}
		rtn.implements=function(intfArr){
			return function(module){			
				var nModule = cloneModule(module);
				nModule.__baseClass=baseClass;
				nModule.__intf=getCombinedIntf(intfArr);
				return Class(nModule);
			}
		}	
		return rtn;
	}

	Class.implements=function(intfArr){	
		var combinedIntf=getCombinedIntf(intfArr);
		return function(module){
			module.__intf=combinedIntf;
			return Class(module);
		}
	}

	Class.pretends=function(baseClass){
		var rtn=function(mModule){
			var nModule = cloneModule(baseClass.__module);
			for(var prop in mModule){
				nModule[prop] = mModule[prop];
			}
			return Class(nModule);
		}
		rtn.implements=function(intfArr){
			return function(mModule){		
				var nModule = cloneModule(baseClass.__module);
				for(var prop in mModule){
					nModule[prop] = mModule[prop];
				}
				nModule.__intf=getCombinedIntf(intfArr);
				return Class(nModule);		
			}
		}
		return rtn;
	}

	var Interface=function(intf){
		var rtn={};
		for(var prop in intf){
			if(prop[0]=='_') throw new Error('Interface cannot delare private methods; invalid method '+prop);
			if(intf[prop] != ABSTRACT() && intf[prop]!=EVENT) throw new Error('Interface methods must be abstract; invalidmethod '+prop);
			rtn[prop] = ABSTRACT();
		}
		return rtn;
	}
	Interface.extends=function(intfArr){
		if(! (intfArr instanceof Array)) intfArr = [intfArr];
		
		return function(intf){
			intfArr.push(intf);
			var combinedIntf={};
			for(var i=0; i<intfArr.length; i++){
				var tIntf = intfArr[i];
				for(var prop in tIntf){
					combinedIntf[prop]=tIntf[prop];
				}
			}
			return Interface(combinedIntf);
		}
	}

	var global_stack = {};
	global_stack.ABSTRACT=ABSTRACT;
	global_stack.READ=READ;
	global_stack.CONST=CONST;
	global_stack.EVENT=EVENT;
	global_stack.FINAL=FINAL;
	global_stack.Class=Class;
	global_stack.Interface=Interface;

	return global_stack;

}));