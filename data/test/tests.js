var global = this;
$(function() {
	
	/*
	---------------------------------------------------------------------------
		EXT
	---------------------------------------------------------------------------
	*/
	
	module("Ext");
	
	asyncTest("setTimeout with arguments", 1, function() {
		setTimeout(function(arg) {
			equals(arg, "hello");
			start();
		}, 10, "hello");
	});

	asyncTest("setImmediate", 1, function() {
		setImmediate(function() {
			ok(true, "always fine");
			start();
		});
	});



	/*
	---------------------------------------------------------------------------
		CORE
	---------------------------------------------------------------------------
	*/
	
	module("Namespace", {
		teardown : function() {
			delete global.foo;
			delete global.abc;
		}
	});
	
	test("Creating global", function() {
		Core.declare('foo', 3);
		equals(global.foo, 3);
	});

	test("Creating namespace", function() {
		Core.declare('abc.def', 5);
		equals(global.abc.def, 5);
	});
	
	

	/*
	---------------------------------------------------------------------------
		MODULES
	---------------------------------------------------------------------------
	*/
	
	module("Modules", {
		teardown : function() {
			delete global.abc;
		}
	});
	
	test("Creating empty module", function() {
		Module("abc.Module1", {});
		equals(Module.isModule(abc.Module1), true);
		equals(abc.Module1.moduleName, "abc.Module1");
		equals(abc.Module1.toString(), "[Module abc.Module1]");
	});

	test("Module validation", function() {
		equals(Module.isModule({}), false);
		equals(Module.isModule(3), false);
		equals(Module.isModule(null), false);
		equals(Module.isModule({__isModule:true}), false);
	});
	
	test("Creating method module", function() {
		Module("abc.Module2", {
			method1 : function() {},
			method2 : function() {},
			method3 : function() {}
		});
		equals(Module.isModule(abc.Module2), true);
		ok(abc.Module2.method1 instanceof Function);
		ok(abc.Module2.method2 instanceof Function);
		ok(abc.Module2.method3 instanceof Function);
		equals(abc.Module2.method1.displayName, "abc.Module2.method1");
		equals(abc.Module2.method2.displayName, "abc.Module2.method2");
		equals(abc.Module2.method3.displayName, "abc.Module2.method3");
	});
	
	test("Checking module name", function() {
		raises(function() {
			Module("", {});
		});
		raises(function() {
			Module(true, {});
		});
		raises(function() {
			Module(" SpaceVoodoo ", {});
		});
		raises(function() {
			Module("has space", {});
		});
		raises(function() {
			Module("firstLow", {});
		});
		raises(function() {
			Module("two..Dots", {});
		});
	});
	
	
	
	/*
	---------------------------------------------------------------------------
		CLASSES
	---------------------------------------------------------------------------
	*/
	
	module("Classes", {
		teardown : function() {
			Core.clear("abc.Class1");
			Core.clear("abc.Class2");
			Core.clear("abc.Class3");
			Core.clear("conflict.Class1");
			Core.clear("conflict.Include1");
			Core.clear("conflict.Include2");
		}
	});
	
	test("Invalid config", function() {
		raises(function() {
			Class("abc.Class1");
		});
		raises(function() {
			Class("abc.Class2", 42);
		})
		raises(function() {
			Class("abc.Class3", {
				unallowedKey : "foo"
			});
		});
	});

	test("Creating empty class", function() {
		Class("abc.Class1", {});
		equals(Class.isClass(abc.Class1), true);
		equals(abc.Class1.className, "abc.Class1");
		equals(abc.Class1.toString(), "[Class abc.Class1]");
	});

	
	
	
	
	
	
	/**
	 * Two classes which should be mixed into another one define the same member. 
	 * A conflict arises, as both could not be merged into the target class.
	 */
	test("Conflicting member functions", function() {
		Class("conflict.Include1", {
			members : {
				foo : function() {}
			}
		});
		Class("conflict.Include2", {
			members : {
				foo : function() {}
			}
		});

		raises(function() {
			Class("conflict.Join", {
				include : [conflict.Include1, conflict.Include2]
			});
		});
	});
	
	
	/**
	 * Two classes which should be mixed into another one define the same member.
	 * A conflict arises, as both could not be merged into the target class.
	 */
	test("Conflicting member data", function() {
		Class("conflict.Include1", {
			members : {
				foo : 1
			}
		});
		Class("conflict.Include2", {
			members : {
				foo : 2
			}
		});

		raises(function() {
			Class("conflict.Join", {
				include : [conflict.Include1, conflict.Include2]
			});
		});
	});	
	
	
	/**
	 * Two classes which should be mixed into another one define the same member. 
	 * The conflict is prevented as the affected member is also defined locally. So
	 * the author of the including class is aware of the conflict and could call the
	 * original methods if that makes sense.
	 */
	test("Conflicting member functions, correctly merged", function() {
		Class("conflict.Include1", {
			members : {
				foo : function() {}
			}
		});
		Class("conflict.Include2", {
			members : {
				foo : function() {}
			}
		});

		Class("conflict.Join", {
			include : [conflict.Include1, conflict.Include2],
			
			members : {
				// Merge manually
				foo : function() {
					conflict.Include1.prototype.foo.call(this);
					conflict.Include2.prototype.foo.call(this);
					
					doSomethingElse();
				}
			}
		});
		
		ok(true);
	});
	
	
	/**
	 * Two classes which should be mixed into another one define the same member. 
	 * The conflict is tried being prevented as the affected member is also defined locally. But as
	 * it is not a function this is not regarded as solved. The individual included classes might
	 * require that this member is a function!
	 */
	test("Conflicting member functions, not merged correctly", function() {
		Class("conflict.Include1", {
			members : {
				foo : function() {}
			}
		});
		Class("conflict.Include2", {
			members : {
				foo : function() {}
			}
		});

		raises(function() {
			Class("conflict.Join", {
				include : [conflict.Include1, conflict.Include2],
			
				members : {
					// Invalid merge
					foo : null
				}
			});
		});
	});	
	
	
	/**
	 * Two classes which should be mixed into another one define the same member. 
	 * The conflict is tried to being prevented as the affected member is also defined locally. 
	 * But this is not allowed for private members.
	 */
	test("Conflicting member functions with failed private merge", function() {
		Class("conflict.Include1", {
			members : {
				__foo : function() {}
			}
		});
		Class("conflict.Include2", {
			members : {
				__foo : function() {}
			}
		});

		raises(function() {
			Class("conflict.Join", {
				include : [conflict.Include1, conflict.Include2],
			
				members : {
					// Private merge... not allowed
					__foo : function() {
						conflict.Include1.prototype.foo.call(this);
						conflict.Include2.prototype.foo.call(this);
					
						doSomethingElse();
					}
				}
			});
		});
	});	
	
	

	
	
	
});
