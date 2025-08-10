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
                    },
                    updateSelectedVersion(repo, version) {
                        var _a;
                        (_a = this.githubService) === null || _a === void 0 ? void 0 : _a.updateSelectedVersion(repo, version);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBd0M7QUFDeEMsK0JBQTRCO0FBQzVCLDZCQUFxQztBQUNyQyxrRUFBOEQ7QUFFOUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQUM3Qzs7O0dBR0c7QUFDSCx5RkFBeUY7QUFDekYsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEVBQUU7UUFDUCxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xDO0lBQ0QsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsNkNBQTZDLENBQUMsRUFBRSxPQUFPLENBQUM7SUFDL0YsS0FBSyxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUseUNBQXlDLENBQUMsRUFBRSxPQUFPLENBQUM7SUFDeEYsQ0FBQyxFQUFFO1FBQ0MsR0FBRyxFQUFFLE1BQU07UUFDWCxJQUFJLEVBQUUsT0FBTztLQUNoQjtJQUNELE9BQU8sRUFBRSxFQUVSO0lBQ0QsS0FBSztRQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxHQUFHLElBQUEsZUFBUyxFQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU1RSxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRTtnQkFDdkIsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsOENBQThDLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQ2hHLElBQUk7b0JBQ0EsT0FBTzt3QkFDSCxLQUFLLEVBQUUsRUFBVzt3QkFDbEIsT0FBTyxFQUFFLElBQUk7d0JBQ2IsS0FBSyxFQUFFLElBQUk7d0JBQ1gsYUFBYSxFQUFFLElBQTRCO3FCQUM5QyxDQUFDO2dCQUNOLENBQUM7Z0JBQ0QsT0FBTztvQkFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDN0MsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN0QixDQUFDO2dCQUNELE9BQU8sRUFBRTtvQkFDTCxVQUFVOzt3QkFDTixNQUFBLElBQUksQ0FBQyxhQUFhLDBDQUFFLFVBQVUsRUFBRSxDQUFDO29CQUNyQyxDQUFDO29CQUNELEtBQUs7O3dCQUNELE1BQUEsSUFBSSxDQUFDLGFBQWEsMENBQUUsS0FBSyxFQUFFLENBQUM7b0JBQ2hDLENBQUM7b0JBQ0QsZUFBZSxDQUFDLElBQVM7O3dCQUNyQixNQUFBLElBQUksQ0FBQyxhQUFhLDBDQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUMsQ0FBQztvQkFDRCxZQUFZLENBQUMsSUFBUyxFQUFFLFFBQVEsR0FBRyxLQUFLOzt3QkFDcEMsTUFBQSxJQUFJLENBQUMsYUFBYSwwQ0FBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUNyRCxDQUFDO29CQUNELGNBQWMsQ0FBQyxJQUFTOzt3QkFDcEIsTUFBQSxJQUFJLENBQUMsYUFBYSwwQ0FBRSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzdDLENBQUM7b0JBQ0QscUJBQXFCLENBQUMsSUFBUyxFQUFFLE9BQWU7O3dCQUM1QyxNQUFBLElBQUksQ0FBQyxhQUFhLDBDQUFFLHFCQUFxQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDN0QsQ0FBQztpQkFDSjthQUNKLENBQUMsQ0FBQztZQUVILEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0wsQ0FBQztJQUNELFdBQVcsS0FBSyxDQUFDO0lBQ2pCLEtBQUs7UUFDRCxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxFQUFFLENBQUM7WUFDTixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAgfSBmcm9tICd2dWUnO1xyXG5pbXBvcnQgeyBHaXRodWJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZ2l0aHViLXNlcnZpY2UnO1xyXG5cclxuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XHJcbi8qKlxyXG4gKiBAemgg5aaC5p6c5biM5pyb5YW85a65IDMuMyDkuYvliY3nmoTniYjmnKzlj6/ku6Xkvb/nlKjkuIvmlrnnmoTku6PnoIFcclxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcclxuICovXHJcbi8vIEVkaXRvci5QYW5lbC5kZWZpbmUgPSBFZGl0b3IuUGFuZWwuZGVmaW5lIHx8IGZ1bmN0aW9uKG9wdGlvbnM6IGFueSkgeyByZXR1cm4gb3B0aW9ucyB9XHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XHJcbiAgICBsaXN0ZW5lcnM6IHtcclxuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnc2hvdycpOyB9LFxyXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG4gICAgJDoge1xyXG4gICAgICAgIGFwcDogJyNhcHAnLFxyXG4gICAgICAgIHRleHQ6ICcjdGV4dCcsXHJcbiAgICB9LFxyXG4gICAgbWV0aG9kczoge1xyXG5cclxuICAgIH0sXHJcbiAgICByZWFkeSgpIHtcclxuICAgICAgICBpZiAodGhpcy4kLnRleHQpIHtcclxuICAgICAgICAgICAgdGhpcy4kLnRleHQuaW5uZXJIVE1MID0gJ0hlbGxvIENvY29zLic7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7fSk7XHJcbiAgICAgICAgICAgIGFwcC5jb25maWcuY29tcGlsZXJPcHRpb25zLmlzQ3VzdG9tRWxlbWVudCA9ICh0YWcpID0+IHRhZy5zdGFydHNXaXRoKCd1aS0nKTtcclxuXHJcbiAgICAgICAgICAgIGFwcC5jb21wb25lbnQoJ015Q291bnRlcicsIHtcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdnVlL21haW4tcGFuZWwuaHRtbCcpLCAndXRmLTgnKSxcclxuICAgICAgICAgICAgICAgIGRhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwb3M6IFtdIGFzIGFueVtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2l0aHViU2VydmljZTogbnVsbCBhcyBHaXRodWJTZXJ2aWNlIHwgbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5naXRodWJTZXJ2aWNlID0gbmV3IEdpdGh1YlNlcnZpY2UodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaFJlcG9zKCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZldGNoUmVwb3MoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0aHViU2VydmljZT8uZmV0Y2hSZXBvcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0cnkoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0aHViU2VydmljZT8ucmV0cnkoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9uRG93bmxvYWRDbGljayhyZXBvOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5naXRodWJTZXJ2aWNlPy5vbkRvd25sb2FkQ2xpY2socmVwbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZFJlcG8ocmVwbzogYW55LCBpc1VwZGF0ZSA9IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0aHViU2VydmljZT8uZG93bmxvYWRSZXBvKHJlcG8sIGlzVXBkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbERvd25sb2FkKHJlcG86IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdpdGh1YlNlcnZpY2U/LmNhbmNlbERvd25sb2FkKHJlcG8pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlU2VsZWN0ZWRWZXJzaW9uKHJlcG86IGFueSwgdmVyc2lvbjogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0aHViU2VydmljZT8udXBkYXRlU2VsZWN0ZWRWZXJzaW9uKHJlcG8sIHZlcnNpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYmVmb3JlQ2xvc2UoKSB7IH0sXHJcbiAgICBjbG9zZSgpIHtcclxuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xyXG4gICAgICAgIGlmIChhcHApIHtcclxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG59KTtcclxuIl19