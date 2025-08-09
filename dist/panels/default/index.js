"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const github_service_1 = require("../../services/github-service");
const panelDataMap = new WeakMap();
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        text: '#text',
    },
    methods: {},
    ready() {
        if (this.$.text) {
            this.$.text.innerHTML = 'Hello Cocos.';
        }
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            app.component('MyCounter', {
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/vue/main-panel.html'), 'utf-8'),
                data() {
                    return {
                        repos: [],
                        loading: true,
                        error: null,
                        githubService: null,
                    };
                },
                created() {
                    this.githubService = new github_service_1.GithubService(this);
                    this.fetchRepos();
                },
                methods: {
                    fetchRepos() {
                        var _a;
                        (_a = this.githubService) === null || _a === void 0 ? void 0 : _a.fetchRepos();
                    },
                    retry() {
                        var _a;
                        (_a = this.githubService) === null || _a === void 0 ? void 0 : _a.retry();
                    },
                    onDownloadClick(repo) {
                        var _a;
                        (_a = this.githubService) === null || _a === void 0 ? void 0 : _a.onDownloadClick(repo);
                    },
                    downloadRepo(repo, isUpdate = false) {
                        var _a;
                        (_a = this.githubService) === null || _a === void 0 ? void 0 : _a.downloadRepo(repo, isUpdate);
                    },
                    cancelDownload(repo) {
                        var _a;
                        (_a = this.githubService) === null || _a === void 0 ? void 0 : _a.cancelDownload(repo);
                    }
                }
            });
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBd0M7QUFDeEMsK0JBQTRCO0FBQzVCLDZCQUFxQztBQUNyQyxrRUFBOEQ7QUFFOUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQUM3Qzs7O0dBR0c7QUFDSCx5RkFBeUY7QUFDekYsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEVBQUU7UUFDUCxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xDO0lBQ0QsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsNkNBQTZDLENBQUMsRUFBRSxPQUFPLENBQUM7SUFDL0YsS0FBSyxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUseUNBQXlDLENBQUMsRUFBRSxPQUFPLENBQUM7SUFDeEYsQ0FBQyxFQUFFO1FBQ0MsR0FBRyxFQUFFLE1BQU07UUFDWCxJQUFJLEVBQUUsT0FBTztLQUNoQjtJQUNELE9BQU8sRUFBRSxFQUVSO0lBQ0QsS0FBSztRQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxHQUFHLElBQUEsZUFBUyxFQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU1RSxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRTtnQkFDdkIsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsOENBQThDLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQ2hHLElBQUk7b0JBQ0EsT0FBTzt3QkFDSCxLQUFLLEVBQUUsRUFBVzt3QkFDbEIsT0FBTyxFQUFFLElBQUk7d0JBQ2IsS0FBSyxFQUFFLElBQUk7d0JBQ1gsYUFBYSxFQUFFLElBQTRCO3FCQUM5QyxDQUFDO2dCQUNOLENBQUM7Z0JBQ0QsT0FBTztvQkFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDN0MsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN0QixDQUFDO2dCQUNELE9BQU8sRUFBRTtvQkFDTCxVQUFVOzt3QkFDTixNQUFBLElBQUksQ0FBQyxhQUFhLDBDQUFFLFVBQVUsRUFBRSxDQUFDO29CQUNyQyxDQUFDO29CQUNELEtBQUs7O3dCQUNELE1BQUEsSUFBSSxDQUFDLGFBQWEsMENBQUUsS0FBSyxFQUFFLENBQUM7b0JBQ2hDLENBQUM7b0JBQ0QsZUFBZSxDQUFDLElBQVM7O3dCQUNyQixNQUFBLElBQUksQ0FBQyxhQUFhLDBDQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUMsQ0FBQztvQkFDRCxZQUFZLENBQUMsSUFBUyxFQUFFLFFBQVEsR0FBRyxLQUFLOzt3QkFDcEMsTUFBQSxJQUFJLENBQUMsYUFBYSwwQ0FBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUNyRCxDQUFDO29CQUNELGNBQWMsQ0FBQyxJQUFTOzt3QkFDcEIsTUFBQSxJQUFJLENBQUMsYUFBYSwwQ0FBRSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzdDLENBQUM7aUJBQ0o7YUFDSixDQUFDLENBQUM7WUFFSCxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNMLENBQUM7SUFDRCxXQUFXLEtBQUssQ0FBQztJQUNqQixLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04sR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwIH0gZnJvbSAndnVlJztcclxuaW1wb3J0IHsgR2l0aHViU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2dpdGh1Yi1zZXJ2aWNlJztcclxuXHJcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xyXG4vKipcclxuICogQHpoIOWmguaenOW4jOacm+WFvOWuuSAzLjMg5LmL5YmN55qE54mI5pys5Y+v5Lul5L2/55So5LiL5pa555qE5Luj56CBXHJcbiAqIEBlbiBZb3UgY2FuIGFkZCB0aGUgY29kZSBiZWxvdyBpZiB5b3Ugd2FudCBjb21wYXRpYmlsaXR5IHdpdGggdmVyc2lvbnMgcHJpb3IgdG8gMy4zXHJcbiAqL1xyXG4vLyBFZGl0b3IuUGFuZWwuZGVmaW5lID0gRWRpdG9yLlBhbmVsLmRlZmluZSB8fCBmdW5jdGlvbihvcHRpb25zOiBhbnkpIHsgcmV0dXJuIG9wdGlvbnMgfVxyXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xyXG4gICAgbGlzdGVuZXJzOiB7XHJcbiAgICAgICAgc2hvdygpIHsgY29uc29sZS5sb2coJ3Nob3cnKTsgfSxcclxuICAgICAgICBoaWRlKCkgeyBjb25zb2xlLmxvZygnaGlkZScpOyB9LFxyXG4gICAgfSxcclxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxyXG4gICAgc3R5bGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9zdHlsZS9kZWZhdWx0L2luZGV4LmNzcycpLCAndXRmLTgnKSxcclxuICAgICQ6IHtcclxuICAgICAgICBhcHA6ICcjYXBwJyxcclxuICAgICAgICB0ZXh0OiAnI3RleHQnLFxyXG4gICAgfSxcclxuICAgIG1ldGhvZHM6IHtcclxuXHJcbiAgICB9LFxyXG4gICAgcmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJC50ZXh0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJC50ZXh0LmlubmVySFRNTCA9ICdIZWxsbyBDb2Nvcy4nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeUNvdW50ZXInLCB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9tYWluLXBhbmVsLmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICAgICAgICAgICAgICBkYXRhKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9zOiBbXSBhcyBhbnlbXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGluZzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdpdGh1YlNlcnZpY2U6IG51bGwgYXMgR2l0aHViU2VydmljZSB8IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0aHViU2VydmljZSA9IG5ldyBHaXRodWJTZXJ2aWNlKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2hSZXBvcygpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgICAgICAgICBmZXRjaFJlcG9zKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdpdGh1YlNlcnZpY2U/LmZldGNoUmVwb3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHJ5KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdpdGh1YlNlcnZpY2U/LnJldHJ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbkRvd25sb2FkQ2xpY2socmVwbzogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0aHViU2VydmljZT8ub25Eb3dubG9hZENsaWNrKHJlcG8pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRSZXBvKHJlcG86IGFueSwgaXNVcGRhdGUgPSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdpdGh1YlNlcnZpY2U/LmRvd25sb2FkUmVwbyhyZXBvLCBpc1VwZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxEb3dubG9hZChyZXBvOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5naXRodWJTZXJ2aWNlPy5jYW5jZWxEb3dubG9hZChyZXBvKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xyXG4gICAgICAgICAgICBwYW5lbERhdGFNYXAuc2V0KHRoaXMsIGFwcCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGJlZm9yZUNsb3NlKCkgeyB9LFxyXG4gICAgY2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgYXBwID0gcGFuZWxEYXRhTWFwLmdldCh0aGlzKTtcclxuICAgICAgICBpZiAoYXBwKSB7XHJcbiAgICAgICAgICAgIGFwcC51bm1vdW50KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufSk7XHJcbiJdfQ==