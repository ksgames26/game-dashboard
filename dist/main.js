"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
// @ts-ignore
const package_json_1 = __importDefault(require("../package.json"));
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    async downloadTools() {
        Editor.Panel.open(package_json_1.default.name);
    },
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
function load() { }
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQWlCQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBdkI1QixhQUFhO0FBQ2IsbUVBQTBDO0FBRTFDOzs7R0FHRztBQUNVLFFBQUEsT0FBTyxHQUE0QztJQUM1RCxLQUFLLENBQUMsYUFBYTtRQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHNCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztDQUNKLENBQUM7QUFFRjs7O0dBR0c7QUFDSCxTQUFnQixJQUFJLEtBQUssQ0FBQztBQUUxQjs7O0dBR0c7QUFDSCxTQUFnQixNQUFNLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1pZ25vcmVcclxuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XHJcblxyXG4vKipcclxuICogQGVuIFJlZ2lzdHJhdGlvbiBtZXRob2QgZm9yIHRoZSBtYWluIHByb2Nlc3Mgb2YgRXh0ZW5zaW9uXHJcbiAqIEB6aCDkuLrmianlsZXnmoTkuLvov5vnqIvnmoTms6jlhozmlrnms5VcclxuICovXHJcbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hbnk6IGFueSkgPT4gYW55IH0gPSB7XHJcbiAgICBhc3luYyBkb3dubG9hZFRvb2xzKCkge1xyXG4gICAgICAgIEVkaXRvci5QYW5lbC5vcGVuKHBhY2thZ2VKU09OLm5hbWUpO1xyXG4gICAgfSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAZW4gTWV0aG9kIFRyaWdnZXJlZCBvbiBFeHRlbnNpb24gU3RhcnR1cFxyXG4gKiBAemgg5omp5bGV5ZCv5Yqo5pe26Kem5Y+R55qE5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHsgfVxyXG5cclxuLyoqXHJcbiAqIEBlbiBNZXRob2QgdHJpZ2dlcmVkIHdoZW4gdW5pbnN0YWxsaW5nIHRoZSBleHRlbnNpb25cclxuICogQHpoIOWNuOi9veaJqeWxleaXtuinpuWPkeeahOaWueazlVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHsgfVxyXG4iXX0=