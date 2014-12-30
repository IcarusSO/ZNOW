ZNOW
====
Although JavaScript supports object-oriented programming, it is in prototype-based form. ZNOW is a framework allows programmers to write JavaScript in class-based object oriented style. Use prototype or class-based style is the option of the programmer, and not be restricted by the language itself anymore.
http://icarusso.github.io/ZNOW

Encapsulation
---
```
var ClasA=Class({
	getA1:function(){
		return this._a;
	},
	_a:'a1'
})
var ClassA2=Class.extends(ClassA)({
	getA2:function(){
		return this._a
	},
	_a:'a2'
})

var obj=new ClassA2();
obj.getA1(); //> a1
obj.getA2(); //> a2
obj._a; //> Undefined
```

Abstraction
---
```
var BaseA=Class({
	foo:ABSTRACT()
})
var ConcreteA=Class.extends(BaseA)({
	foo:function(){
		return true;
	}
})
var BA=new BaseA(); //> Throw error
var CA=new ConcreteA();
```

Inheritance
---
```
var ClassA=Class({
	foo1:function(){
		return 'foo1';
	},
	$foo2:function(){
		return 'foo2';
	}
})
var ClassB=Class.extends(ClassA)({
	foo3:function(){
		return this.super.$foo2() + 'foo3';
	}
})
```
http://icarusso.github.io/ZNOW