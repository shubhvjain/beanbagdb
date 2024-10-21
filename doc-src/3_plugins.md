# How to use plugins

```
// MyPlugin.js
const MyPlugin = {
  // This function will be bound to the class instance (passed as 'thisArg')
  on_load: async function(instance) {
    console.log("Plugin loaded with instance:", instance);
    // You can access instance properties and methods here
    instance.someMethod();
  },

  // Another plugin function
  doSomething: function(instance, arg) {
    console.log("Plugin doing something with arg:", arg);
    // Access the class instance here as 'instance'
    instance.someMethod();
  }
};

export default MyPlugin;

```