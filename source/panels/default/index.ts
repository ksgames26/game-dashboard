import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App } from 'vue';
import { GithubService } from '../../services/github-service';

const panelDataMap = new WeakMap<any, App>();
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
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        text: '#text',
    },
    methods: {

    },
    ready() {
        if (this.$.text) {
            this.$.text.innerHTML = 'Hello Cocos.';
        }
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

            app.component('MyCounter', {
                template: readFileSync(join(__dirname, '../../../static/template/vue/main-panel.html'), 'utf-8'),
                data() {
                    return {
                        repos: [] as any[],
                        loading: true,
                        error: null,
                        githubService: null as GithubService | null,
                    };
                },
                created() {
                    this.githubService = new GithubService(this);
                    this.fetchRepos();
                },
                methods: {
                    fetchRepos() {
                        this.githubService?.fetchRepos();
                    },
                    retry() {
                        this.githubService?.retry();
                    },
                    onDownloadClick(repo: any) {
                        this.githubService?.onDownloadClick(repo);
                    },
                    downloadRepo(repo: any, isUpdate = false) {
                        this.githubService?.downloadRepo(repo, isUpdate);
                    },
                    cancelDownload(repo: any) {
                        this.githubService?.cancelDownload(repo);
                    },
                    updateSelectedVersion(repo: any, version: string) {
                        this.githubService?.updateSelectedVersion(repo, version);
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
