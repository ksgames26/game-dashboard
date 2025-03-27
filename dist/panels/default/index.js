"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const https = __importStar(require("https"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
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
    methods: {
        hello() {
            if (this.$.text) {
                this.$.text.innerHTML = 'hello';
                console.log('[cocos-panel-html.default]: hello');
            }
        },
    },
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
                        error: null
                    };
                },
                created() {
                    this.fetchRepos();
                },
                methods: {
                    async fetchRepos() {
                        try {
                            this.loading = true;
                            this.error = null;
                            const response = await Editor.Network.get('https://api.github.com/users/ksgames26/repos');
                            const data = JSON.parse(response.toString());
                            // 只获取 game- 开头的仓库
                            this.repos = data
                                .filter((repo) => repo.name.startsWith('game-'))
                                .map((repo) => {
                                var _a;
                                console.log(`Repository ${repo.name}:`, repo);
                                return {
                                    name: repo.name,
                                    description: repo.description || 'No description',
                                    url: repo.html_url, // GitHub API 返回的 html_url 是仓库的网页 URL
                                    clone_url: repo.clone_url, // 添加 clone_url，可以用于 git clone
                                    language: repo.language || 'Unknown',
                                    license: ((_a = repo.license) === null || _a === void 0 ? void 0 : _a.name) || 'No license',
                                    created_at: new Date(repo.created_at).toLocaleDateString(),
                                    updated_at: new Date(repo.updated_at).toLocaleDateString(),
                                    last_commit: repo.pushed_at || repo.updated_at,
                                    downloading: false,
                                    progress: 0,
                                    installed: false,
                                    has_update: false
                                };
                            });
                            // 检查仓库是否已安装
                            await this.checkInstalledRepos();
                            this.loading = false;
                        }
                        catch (error) {
                            this.error = {
                                message: 'Failed to fetch repositories',
                                error: error.message
                            };
                            this.loading = false;
                        }
                    },
                    // 检查哪些仓库已安装以及是否有更新
                    async checkInstalledRepos() {
                        // 获取项目路径下的extensions目录
                        const extensionsDir = path.join(Editor.Project.path, 'extensions');
                        for (const repo of this.repos) {
                            // 检查目标目录是否存在
                            const targetDir = path.join(extensionsDir, repo.name);
                            // 检查是否已安装
                            repo.installed = fs.existsSync(targetDir);
                            if (repo.installed) {
                                console.log(`Repository ${repo.name} is installed`);
                                // 检查是否有更新（通过检查 package.json 中的 last_commit 信息）
                                try {
                                    // 尝试读取 package.json
                                    const packageJsonPath = path.join(targetDir, 'package.json');
                                    if (fs.existsSync(packageJsonPath)) {
                                        // 读取 package.json 文件
                                        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                                        const packageJson = JSON.parse(packageJsonContent);
                                        // 获取本地 last_commit 信息
                                        const localLastCommit = packageJson.last_commit;
                                        if (localLastCommit) {
                                            console.log(`${repo.name} - Local last commit: ${localLastCommit}, Remote last commit: ${repo.last_commit}`);
                                            // 转换为 Date 对象进行比较
                                            const localDate = new Date(localLastCommit);
                                            const remoteDate = new Date(repo.last_commit);
                                            // 如果远程提交时间晚于本地提交时间，表示有更新
                                            repo.has_update = remoteDate > localDate;
                                            console.log(`${repo.name} has update: ${repo.has_update}`);
                                        }
                                        else {
                                            // 如果 package.json 中没有 last_commit 信息，使用文件修改时间
                                            console.log(`${repo.name} - No last_commit found in package.json, using file stats`);
                                            const stats = await fs.stat(packageJsonPath);
                                            const localLastModified = new Date(stats.mtime);
                                            const remoteLastCommit = new Date(repo.last_commit);
                                            // 如果本地修改时间早于远程最后提交时间，表示有更新
                                            repo.has_update = localLastModified < remoteLastCommit;
                                            console.log(`${repo.name} - Local modified: ${localLastModified}, Remote commit: ${remoteLastCommit}`);
                                            console.log(`${repo.name} has update: ${repo.has_update}`);
                                        }
                                    }
                                }
                                catch (error) {
                                    console.error(`Failed to check for updates for ${repo.name}:`, error);
                                }
                            }
                        }
                    },
                    retry() {
                        this.fetchRepos();
                    },
                    // 处理下载按钮点击
                    async onDownloadClick(repo) {
                        // 如果正在下载，不执行任何操作
                        if (repo.downloading) {
                            return;
                        }
                        // 如果已安装且有更新，询问是否更新
                        if (repo.installed && repo.has_update) {
                            // 根据官方文档使用 Editor.Dialog.info 并传递 buttons 参数
                            const result = await Editor.Dialog.info(`${repo.name} is already installed but has updates. Do you want to update it?`, {
                                buttons: ['confirm', 'cancel'],
                                title: 'Update Repository',
                            });
                            console.log('Dialog result:', result);
                            // 用户确认更新
                            if (result.response === 0) {
                                await this.downloadRepo(repo, true);
                            }
                        }
                        // 如果已安装但无更新，提示已安装
                        else if (repo.installed && !repo.has_update) {
                            Editor.Dialog.info(`${repo.name} is already installed and up to date.`, {
                                buttons: ['ok'],
                                title: 'Repository Installed'
                            });
                        }
                        // 未安装，直接下载
                        else {
                            await this.downloadRepo(repo);
                        }
                    },
                    async downloadRepo(repo, isUpdate = false) {
                        console.log(`${isUpdate ? 'Updating' : 'Downloading'} repository:`, repo);
                        repo.downloading = true;
                        repo.progress = 0;
                        try {
                            // 获取项目路径下的extensions目录
                            const extensionsDir = path.join(Editor.Project.path, 'extensions');
                            const targetDir = path.join(extensionsDir, repo.name);
                            console.log(`Target directory: ${targetDir}`);
                            // 检查目标目录是否存在，如果存在则先删除
                            if (fs.existsSync(targetDir)) {
                                console.log(`Target directory exists, removing: ${targetDir}`);
                                await fs.remove(targetDir);
                            }
                            // 创建目标目录
                            await fs.ensureDir(targetDir);
                            // 检查 URL 是否有效
                            if (!repo.url) {
                                throw new Error(`Repository URL is undefined for ${repo.name}`);
                            }
                            // 解析 URL，确保格式正确
                            // 格式应为: https://github.com/ksgames26/game-core
                            const urlParts = repo.url.split('/');
                            if (urlParts.length < 5) {
                                throw new Error(`Invalid GitHub URL format: ${repo.url}`);
                            }
                            const owner = urlParts[3]; // 通常是 'ksgames26'
                            const repoName = urlParts[4]; // 通常是 'game-core' 等
                            // 使用普通的 GitHub 下载链接而不是 API 端点
                            // GitHub API 需要认证才能避免速率限制导致的 403 错误
                            const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
                            console.log(`Owner: ${owner}, Repo: ${repoName}`);
                            console.log(`Downloading ZIP from: ${zipUrl}`);
                            // 更新进度到10%
                            repo.progress = 0.1;
                            // 使用进度更新模拟下载进度
                            const updateProgress = () => {
                                if (repo.progress < 0.9) {
                                    repo.progress += 0.05;
                                    repo.progressTimer = setTimeout(updateProgress, 500);
                                }
                            };
                            // 开始进度更新
                            updateProgress();
                            // 下载ZIP文件
                            const zipFilePath = path.join(targetDir, 'repo.zip');
                            const zipFile = fs.createWriteStream(zipFilePath);
                            await new Promise((resolve, reject) => {
                                // 添加请求选项，包括 User-Agent 头
                                const options = {
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                    }
                                };
                                https.get(zipUrl, options, (response) => {
                                    // 处理重定向
                                    if (response.statusCode === 301 || response.statusCode === 302) {
                                        const redirectUrl = response.headers.location;
                                        if (!redirectUrl) {
                                            reject(new Error('Redirect location not found'));
                                            return;
                                        }
                                        console.log(`Redirecting to: ${redirectUrl}`);
                                        https.get(redirectUrl, options, (redirectResponse) => {
                                            if (redirectResponse.statusCode !== 200) {
                                                reject(new Error(`Failed to download ZIP file: ${redirectResponse.statusCode}`));
                                                return;
                                            }
                                            redirectResponse.pipe(zipFile);
                                            zipFile.on('finish', () => {
                                                zipFile.close();
                                                resolve();
                                            });
                                        }).on('error', (err) => {
                                            fs.unlink(zipFilePath, () => { });
                                            reject(err);
                                        });
                                        return;
                                    }
                                    if (response.statusCode !== 200) {
                                        reject(new Error(`Failed to download ZIP file: ${response.statusCode}`));
                                        return;
                                    }
                                    response.pipe(zipFile);
                                    zipFile.on('finish', () => {
                                        zipFile.close();
                                        resolve();
                                    });
                                }).on('error', (err) => {
                                    fs.unlink(zipFilePath, () => { });
                                    reject(err);
                                });
                            });
                            // 停止进度更新
                            if (repo.progressTimer) {
                                clearTimeout(repo.progressTimer);
                                repo.progressTimer = null;
                            }
                            // 更新进度到90%
                            repo.progress = 0.9;
                            // 使用外部命令解压 ZIP 文件
                            console.log('Extracting ZIP file:', zipFilePath);
                            try {
                                // 创建临时提取目录
                                const extractDir = path.join(targetDir, '_temp_extract');
                                await fs.ensureDir(extractDir);
                                // 使用 child_process 执行解压命令
                                const { exec } = require('child_process');
                                // 在 Windows 上使用 PowerShell 解压
                                const isWindows = process.platform === 'win32';
                                let unzipCommand;
                                if (isWindows) {
                                    // Windows - 使用 PowerShell 的 Expand-Archive
                                    unzipCommand = `powershell -command "Expand-Archive -Path '${zipFilePath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}'"`;
                                }
                                else {
                                    // macOS/Linux - 使用 unzip 命令
                                    unzipCommand = `unzip "${zipFilePath}" -d "${extractDir}"`;
                                }
                                console.log('Executing unzip command:', unzipCommand);
                                await new Promise((resolve, reject) => {
                                    exec(unzipCommand, (error, stdout, stderr) => {
                                        if (error) {
                                            console.error('Unzip error:', error);
                                            console.error('Stderr:', stderr);
                                            reject(new Error(`Failed to extract ZIP: ${error.message}`));
                                            return;
                                        }
                                        console.log('Unzip stdout:', stdout);
                                        resolve();
                                    });
                                });
                                // 移动文件到目标目录
                                const extractedItems = await fs.readdir(extractDir);
                                // GitHub ZIP 通常包含一个根目录
                                // 检查是否有单一目录且名称以仓库名开头
                                let sourceDir = extractDir;
                                if (extractedItems.length === 1) {
                                    const firstItem = path.join(extractDir, extractedItems[0]);
                                    const stats = await fs.stat(firstItem);
                                    if (stats.isDirectory()) {
                                        sourceDir = firstItem;
                                    }
                                }
                                console.log(`Moving files from ${sourceDir} to ${targetDir}`);
                                // 移动所有文件到目标目录
                                const files = await fs.readdir(sourceDir);
                                for (const file of files) {
                                    const srcPath = path.join(sourceDir, file);
                                    const destPath = path.join(targetDir, file);
                                    console.log(`Moving: ${srcPath} -> ${destPath}`);
                                    await fs.move(srcPath, destPath, { overwrite: true });
                                }
                                // 删除临时目录
                                await fs.remove(extractDir);
                                console.log('Removed temp directory:', extractDir);
                            }
                            catch (error) {
                                console.error('Failed to extract ZIP:', error);
                                throw new Error(`Failed to extract ZIP file: ${error.message}`);
                            }
                            // 删除ZIP文件
                            await fs.remove(zipFilePath);
                            // 更新进度到95%
                            repo.progress = 0.95;
                            // 更新 package.json，添加 last_commit 信息
                            try {
                                const packageJsonPath = path.join(targetDir, 'package.json');
                                if (fs.existsSync(packageJsonPath)) {
                                    console.log(`Updating package.json with last_commit info: ${repo.last_commit}`);
                                    // 读取现有 package.json
                                    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                                    const packageJson = JSON.parse(packageJsonContent);
                                    // 添加 last_commit 信息
                                    packageJson.last_commit = repo.last_commit;
                                    // 写回文件
                                    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
                                    console.log(`Updated package.json with last_commit info`);
                                }
                            }
                            catch (error) {
                                console.error('Failed to update package.json:', error);
                                // 继续执行，这不是致命错误
                            }
                            // 安装依赖并构建
                            try {
                                console.log(`Installing dependencies and building in ${targetDir}...`);
                                // 使用 child_process 执行命令
                                const { exec } = require('child_process');
                                // 安装依赖
                                console.log('Running npm install...');
                                await new Promise((resolve, reject) => {
                                    exec('npm install', { cwd: targetDir }, (error, stdout, stderr) => {
                                        if (error) {
                                            console.error('npm install error:', error);
                                            console.error('Stderr:', stderr);
                                            // 不中断流程，继续执行
                                            resolve();
                                            return;
                                        }
                                        console.log('npm install stdout:', stdout);
                                        resolve();
                                    });
                                });
                                // 构建项目
                                console.log('Running npm run build...');
                                await new Promise((resolve, reject) => {
                                    exec('npm run build', { cwd: targetDir }, (error, stdout, stderr) => {
                                        if (error) {
                                            console.error('npm run build error:', error);
                                            console.error('Stderr:', stderr);
                                            // 不中断流程，继续执行
                                            resolve();
                                            return;
                                        }
                                        console.log('npm run build stdout:', stdout);
                                        resolve();
                                    });
                                });
                                console.log('Dependencies installed and build completed');
                            }
                            catch (error) {
                                console.error('Failed to install dependencies or build:', error);
                                // 继续执行，这不是致命错误
                            }
                            // 注册和启用扩展
                            try {
                                // 先获取已注册的扩展列表
                                const packages = Editor.Package.getPackages();
                                const packageInfo = packages.find(pkg => pkg.name === repo.name);
                                let path = '';
                                if (!packageInfo) {
                                    console.log(`Registering extension: ${repo.name}`);
                                    path = Editor.Package.getPath(repo.name);
                                    if (!path) {
                                        // 获取项目路径
                                        const projectPath = Editor.Project.path;
                                        // 获取extensions目录
                                        const extensionsDir = (0, path_1.join)(projectPath, 'extensions', repo.name);
                                        Editor.Package.register(extensionsDir);
                                        path = extensionsDir;
                                    }
                                    else {
                                        // 注册扩展
                                        Editor.Package.register(path);
                                        console.log(`Extension registered: ${repo.name}`);
                                    }
                                }
                                else {
                                    path = packageInfo.path;
                                    console.log(`Extension ${repo.name} is already registered`);
                                }
                                console.log(`Enabling extension: ${repo.name}`);
                                // 启用扩展
                                Editor.Package.enable(path);
                                console.log(`Extension enabled: ${repo.name}`);
                            }
                            catch (error) {
                                console.error('Failed to register or enable extension:', error);
                            }
                            // 更新进度到100%
                            repo.progress = 1;
                            console.log(`Successfully downloaded ${repo.name} to ${targetDir}`);
                            // 完成下载，延迟一会再重置状态
                            setTimeout(() => {
                                repo.downloading = false;
                                // 更新安装状态
                                repo.installed = true;
                                repo.has_update = false;
                                Editor.Task.addNotice({
                                    title: "Successfully downloaded",
                                    message: `Successfully downloaded: ${repo.name}`,
                                    source: "Game Dashboard",
                                    type: "success",
                                });
                            }, 1000);
                        }
                        catch (error) {
                            console.error('Download failed:', error);
                            repo.downloading = false;
                            // 停止进度更新
                            if (repo.progressTimer) {
                                clearTimeout(repo.progressTimer);
                                repo.progressTimer = null;
                            }
                            // 显示错误通知
                            Editor.Dialog.error(`Failed to download ${repo.name}: ${error.message}`);
                        }
                    },
                    // 取消下载方法
                    async cancelDownload(repo) {
                        if (repo.downloading) {
                            // 清理资源
                            if (repo.progressTimer) {
                                clearTimeout(repo.progressTimer);
                                repo.progressTimer = null;
                            }
                            // 重置状态
                            repo.downloading = false;
                            repo.progress = 0;
                            console.log('Download canceled:', repo.name);
                            // 获取可能已创建的临时目录
                            const extensionsDir = path.join(Editor.Project.path, 'extensions');
                            const targetDir = path.join(extensionsDir, repo.name);
                            // 尝试删除已下载的内容
                            try {
                                if (fs.existsSync(targetDir)) {
                                    await fs.remove(targetDir);
                                    console.log(`Removed directory: ${targetDir}`);
                                }
                            }
                            catch (err) {
                                console.warn(`Failed to remove directory: ${targetDir}`, err);
                            }
                            // 显示通知
                            Editor.Message.broadcast('scene', 'status-bar:warning', {
                                message: `Download canceled: ${repo.name}`
                            });
                        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBd0M7QUFDeEMsK0JBQTRCO0FBQzVCLDZCQUFxQztBQUNyQyw2Q0FBK0I7QUFDL0IsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUU3QixNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFDO0FBQzdDOzs7R0FHRztBQUNILHlGQUF5RjtBQUN6RixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLFNBQVMsRUFBRTtRQUNQLElBQUksS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEM7SUFDRCxRQUFRLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSw2Q0FBNkMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUMvRixLQUFLLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx5Q0FBeUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUN4RixDQUFDLEVBQUU7UUFDQyxHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxPQUFPO0tBQ2hCO0lBQ0QsT0FBTyxFQUFFO1FBQ0wsS0FBSztZQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO2dCQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7WUFDckQsQ0FBQztRQUNMLENBQUM7S0FDSjtJQUNELEtBQUs7UUFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsR0FBRyxJQUFBLGVBQVMsRUFBQyxFQUFFLENBQUMsQ0FBQztZQUMxQixHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFNUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3ZCLFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDhDQUE4QyxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUNoRyxJQUFJO29CQUNBLE9BQU87d0JBQ0gsS0FBSyxFQUFFLEVBQVc7d0JBQ2xCLE9BQU8sRUFBRSxJQUFJO3dCQUNiLEtBQUssRUFBRSxJQUFJO3FCQUNkLENBQUM7Z0JBQ04sQ0FBQztnQkFDRCxPQUFPO29CQUNILElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQztnQkFDRCxPQUFPLEVBQUU7b0JBQ0wsS0FBSyxDQUFDLFVBQVU7d0JBQ1osSUFBSSxDQUFDOzRCQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDOzRCQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQzs0QkFFbEIsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDOzRCQUMxRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDOzRCQUM3QyxrQkFBa0I7NEJBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSTtpQ0FDWixNQUFNLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lDQUNwRCxHQUFHLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRTs7Z0NBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztnQ0FDOUMsT0FBTztvQ0FDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7b0NBQ2YsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLElBQUksZ0JBQWdCO29DQUNqRCxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxxQ0FBcUM7b0NBQ3pELFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLDhCQUE4QjtvQ0FDekQsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksU0FBUztvQ0FDcEMsT0FBTyxFQUFFLENBQUEsTUFBQSxJQUFJLENBQUMsT0FBTywwQ0FBRSxJQUFJLEtBQUksWUFBWTtvQ0FDM0MsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsRUFBRTtvQ0FDMUQsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsRUFBRTtvQ0FDMUQsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFVBQVU7b0NBQzlDLFdBQVcsRUFBRSxLQUFLO29DQUNsQixRQUFRLEVBQUUsQ0FBQztvQ0FDWCxTQUFTLEVBQUUsS0FBSztvQ0FDaEIsVUFBVSxFQUFFLEtBQUs7aUNBQ3BCLENBQUM7NEJBQ04sQ0FBQyxDQUFDLENBQUM7NEJBRVAsWUFBWTs0QkFDWixNQUFNLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDOzRCQUVqQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzt3QkFDekIsQ0FBQzt3QkFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDOzRCQUNsQixJQUFJLENBQUMsS0FBSyxHQUFHO2dDQUNULE9BQU8sRUFBRSw4QkFBOEI7Z0NBQ3ZDLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTzs2QkFDdkIsQ0FBQzs0QkFDRixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzt3QkFDekIsQ0FBQztvQkFDTCxDQUFDO29CQUVELG1CQUFtQjtvQkFDbkIsS0FBSyxDQUFDLG1CQUFtQjt3QkFDckIsdUJBQXVCO3dCQUN2QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO3dCQUVuRSxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDNUIsYUFBYTs0QkFDYixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBRXRELFVBQVU7NEJBQ1YsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUUxQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQ0FDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLGVBQWUsQ0FBQyxDQUFDO2dDQUVwRCwrQ0FBK0M7Z0NBQy9DLElBQUksQ0FBQztvQ0FDRCxvQkFBb0I7b0NBQ3BCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO29DQUU3RCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQzt3Q0FDakMscUJBQXFCO3dDQUNyQixNQUFNLGtCQUFrQixHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7d0NBQ3ZFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQzt3Q0FFbkQsc0JBQXNCO3dDQUN0QixNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDO3dDQUVoRCxJQUFJLGVBQWUsRUFBRSxDQUFDOzRDQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUkseUJBQXlCLGVBQWUseUJBQXlCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDOzRDQUU3RyxrQkFBa0I7NENBQ2xCLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDOzRDQUM1QyxNQUFNLFVBQVUsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7NENBRTlDLHlCQUF5Qjs0Q0FDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDOzRDQUV6QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksZ0JBQWdCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO3dDQUMvRCxDQUFDOzZDQUFNLENBQUM7NENBQ0osOENBQThDOzRDQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksMkRBQTJELENBQUMsQ0FBQzs0Q0FFckYsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDOzRDQUM3QyxNQUFNLGlCQUFpQixHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzs0Q0FDaEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7NENBRXBELDJCQUEyQjs0Q0FDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQzs0Q0FFdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLHNCQUFzQixpQkFBaUIsb0JBQW9CLGdCQUFnQixFQUFFLENBQUMsQ0FBQzs0Q0FDdkcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLGdCQUFnQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQzt3Q0FDL0QsQ0FBQztvQ0FDTCxDQUFDO2dDQUNMLENBQUM7Z0NBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQ0FDYixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0NBQzFFLENBQUM7NEJBQ0wsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsS0FBSzt3QkFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ3RCLENBQUM7b0JBRUQsV0FBVztvQkFDWCxLQUFLLENBQUMsZUFBZSxDQUFDLElBQVM7d0JBQzNCLGlCQUFpQjt3QkFDakIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7NEJBQ25CLE9BQU87d0JBQ1gsQ0FBQzt3QkFFRCxtQkFBbUI7d0JBQ25CLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBQ3BDLDZDQUE2Qzs0QkFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLGtFQUFrRSxFQUFFO2dDQUNwSCxPQUFPLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO2dDQUM5QixLQUFLLEVBQUUsbUJBQW1COzZCQUM3QixDQUFDLENBQUM7NEJBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQzs0QkFFdEMsU0FBUzs0QkFDVCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0NBQ3hCLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBR3hDLENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxrQkFBa0I7NkJBQ2IsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDOzRCQUMxQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLHVDQUF1QyxFQUFFO2dDQUNwRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0NBQ2YsS0FBSyxFQUFFLHNCQUFzQjs2QkFDaEMsQ0FBQyxDQUFDO3dCQUNQLENBQUM7d0JBQ0QsV0FBVzs2QkFDTixDQUFDOzRCQUNGLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEMsQ0FBQztvQkFDTCxDQUFDO29CQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBUyxFQUFFLFFBQVEsR0FBRyxLQUFLO3dCQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGFBQWEsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUUxRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQzt3QkFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7d0JBRWxCLElBQUksQ0FBQzs0QkFDRCx1QkFBdUI7NEJBQ3ZCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7NEJBQ25FLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFFdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsU0FBUyxFQUFFLENBQUMsQ0FBQzs0QkFFOUMsc0JBQXNCOzRCQUN0QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQ0FDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsU0FBUyxFQUFFLENBQUMsQ0FBQztnQ0FDL0QsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUMvQixDQUFDOzRCQUVELFNBQVM7NEJBQ1QsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUU5QixjQUFjOzRCQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0NBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7NEJBQ3BFLENBQUM7NEJBRUQsZ0JBQWdCOzRCQUNoQiwrQ0FBK0M7NEJBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNyQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0NBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDOzRCQUM5RCxDQUFDOzRCQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjs0QkFDN0MsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9COzRCQUVsRCw4QkFBOEI7NEJBQzlCLG9DQUFvQzs0QkFDcEMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLEtBQUssSUFBSSxRQUFRLGdDQUFnQyxDQUFDOzRCQUV2RixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxXQUFXLFFBQVEsRUFBRSxDQUFDLENBQUM7NEJBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLE1BQU0sRUFBRSxDQUFDLENBQUM7NEJBRS9DLFdBQVc7NEJBQ1gsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUM7NEJBRXBCLGVBQWU7NEJBQ2YsTUFBTSxjQUFjLEdBQUcsR0FBRyxFQUFFO2dDQUN4QixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxFQUFFLENBQUM7b0NBQ3RCLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDO29DQUN0QixJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0NBQ3pELENBQUM7NEJBQ0wsQ0FBQyxDQUFDOzRCQUVGLFNBQVM7NEJBQ1QsY0FBYyxFQUFFLENBQUM7NEJBRWpCLFVBQVU7NEJBQ1YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7NEJBQ3JELE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQzs0QkFFbEQsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQ0FDeEMseUJBQXlCO2dDQUN6QixNQUFNLE9BQU8sR0FBRztvQ0FDWixPQUFPLEVBQUU7d0NBQ0wsWUFBWSxFQUFFLGlIQUFpSDtxQ0FDbEk7aUNBQ0osQ0FBQztnQ0FFRixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQ0FDcEMsUUFBUTtvQ0FDUixJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssR0FBRyxFQUFFLENBQUM7d0NBQzdELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO3dDQUM5QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7NENBQ2YsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQzs0Q0FDakQsT0FBTzt3Q0FDWCxDQUFDO3dDQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLFdBQVcsRUFBRSxDQUFDLENBQUM7d0NBRTlDLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUU7NENBQ2pELElBQUksZ0JBQWdCLENBQUMsVUFBVSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dEQUN0QyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsZ0NBQWdDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztnREFDakYsT0FBTzs0Q0FDWCxDQUFDOzRDQUVELGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs0Q0FFL0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO2dEQUN0QixPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0RBQ2hCLE9BQU8sRUFBRSxDQUFDOzRDQUNkLENBQUMsQ0FBQyxDQUFDO3dDQUNQLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTs0Q0FDbkIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7NENBQ2xDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3Q0FDaEIsQ0FBQyxDQUFDLENBQUM7d0NBRUgsT0FBTztvQ0FDWCxDQUFDO29DQUVELElBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3Q0FDOUIsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGdDQUFnQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO3dDQUN6RSxPQUFPO29DQUNYLENBQUM7b0NBRUQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQ0FFdkIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO3dDQUN0QixPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7d0NBQ2hCLE9BQU8sRUFBRSxDQUFDO29DQUNkLENBQUMsQ0FBQyxDQUFDO2dDQUNQLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQ0FDbkIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0NBQ2xDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDaEIsQ0FBQyxDQUFDLENBQUM7NEJBQ1AsQ0FBQyxDQUFDLENBQUM7NEJBRUgsU0FBUzs0QkFDVCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQ0FDckIsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQ0FDakMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7NEJBQzlCLENBQUM7NEJBRUQsV0FBVzs0QkFDWCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQzs0QkFFcEIsa0JBQWtCOzRCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxDQUFDOzRCQUVqRCxJQUFJLENBQUM7Z0NBQ0QsV0FBVztnQ0FDWCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztnQ0FDekQsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dDQUUvQiwwQkFBMEI7Z0NBQzFCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7Z0NBRTFDLDhCQUE4QjtnQ0FDOUIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7Z0NBQy9DLElBQUksWUFBWSxDQUFDO2dDQUVqQixJQUFJLFNBQVMsRUFBRSxDQUFDO29DQUNaLDJDQUEyQztvQ0FDM0MsWUFBWSxHQUFHLDhDQUE4QyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsdUJBQXVCLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7Z0NBQzFKLENBQUM7cUNBQU0sQ0FBQztvQ0FDSiw0QkFBNEI7b0NBQzVCLFlBQVksR0FBRyxVQUFVLFdBQVcsU0FBUyxVQUFVLEdBQUcsQ0FBQztnQ0FDL0QsQ0FBQztnQ0FFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLFlBQVksQ0FBQyxDQUFDO2dDQUV0RCxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO29DQUN4QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBVSxFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTt3Q0FDOUQsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0Q0FDUixPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQzs0Q0FDckMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7NENBQ2pDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQywwQkFBMEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQzs0Q0FDN0QsT0FBTzt3Q0FDWCxDQUFDO3dDQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO3dDQUNyQyxPQUFPLEVBQUUsQ0FBQztvQ0FDZCxDQUFDLENBQUMsQ0FBQztnQ0FDUCxDQUFDLENBQUMsQ0FBQztnQ0FFSCxZQUFZO2dDQUNaLE1BQU0sY0FBYyxHQUFHLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQ0FFcEQsdUJBQXVCO2dDQUN2QixxQkFBcUI7Z0NBQ3JCLElBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQztnQ0FDM0IsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29DQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDM0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29DQUN2QyxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO3dDQUN0QixTQUFTLEdBQUcsU0FBUyxDQUFDO29DQUMxQixDQUFDO2dDQUNMLENBQUM7Z0NBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsU0FBUyxPQUFPLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0NBRTlELGNBQWM7Z0NBQ2QsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO29DQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQ0FDM0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7b0NBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxPQUFPLE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQztvQ0FDakQsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQ0FDMUQsQ0FBQztnQ0FFRCxTQUFTO2dDQUNULE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQ0FDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxVQUFVLENBQUMsQ0FBQzs0QkFDdkQsQ0FBQzs0QkFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO2dDQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFDO2dDQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQzs0QkFDcEUsQ0FBQzs0QkFFRCxVQUFVOzRCQUNWLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQzs0QkFFN0IsV0FBVzs0QkFDWCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzs0QkFFckIsb0NBQW9DOzRCQUNwQyxJQUFJLENBQUM7Z0NBQ0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0NBQzdELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO29DQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztvQ0FFaEYsb0JBQW9CO29DQUNwQixNQUFNLGtCQUFrQixHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7b0NBQ3ZFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztvQ0FFbkQsb0JBQW9CO29DQUNwQixXQUFXLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7b0NBRTNDLE9BQU87b0NBQ1AsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7b0NBQ25GLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztnQ0FDOUQsQ0FBQzs0QkFDTCxDQUFDOzRCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0NBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztnQ0FDdkQsZUFBZTs0QkFDbkIsQ0FBQzs0QkFFRCxVQUFVOzRCQUNWLElBQUksQ0FBQztnQ0FDRCxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxTQUFTLEtBQUssQ0FBQyxDQUFDO2dDQUV2RSx3QkFBd0I7Z0NBQ3hCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7Z0NBRTFDLE9BQU87Z0NBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dDQUN0QyxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO29DQUN4QyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsS0FBVSxFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTt3Q0FDbkYsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0Q0FDUixPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDOzRDQUMzQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQzs0Q0FDakMsYUFBYTs0Q0FDYixPQUFPLEVBQUUsQ0FBQzs0Q0FDVixPQUFPO3dDQUNYLENBQUM7d0NBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQzt3Q0FDM0MsT0FBTyxFQUFFLENBQUM7b0NBQ2QsQ0FBQyxDQUFDLENBQUM7Z0NBQ1AsQ0FBQyxDQUFDLENBQUM7Z0NBRUgsT0FBTztnQ0FDUCxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7Z0NBQ3hDLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7b0NBQ3hDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxLQUFVLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO3dDQUNyRixJQUFJLEtBQUssRUFBRSxDQUFDOzRDQUNSLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7NENBQzdDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDOzRDQUNqQyxhQUFhOzRDQUNiLE9BQU8sRUFBRSxDQUFDOzRDQUNWLE9BQU87d0NBQ1gsQ0FBQzt3Q0FFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxDQUFDO3dDQUM3QyxPQUFPLEVBQUUsQ0FBQztvQ0FDZCxDQUFDLENBQUMsQ0FBQztnQ0FDUCxDQUFDLENBQUMsQ0FBQztnQ0FFSCxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7NEJBQzlELENBQUM7NEJBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQ0FDYixPQUFPLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dDQUNqRSxlQUFlOzRCQUNuQixDQUFDOzRCQUVELFVBQVU7NEJBQ1YsSUFBSSxDQUFDO2dDQUNELGNBQWM7Z0NBQ2QsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQ0FDOUMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUVqRSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7Z0NBQ2QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29DQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO29DQUVuRCxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDO29DQUUxQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7d0NBQ1IsU0FBUzt3Q0FDVCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzt3Q0FFeEMsaUJBQWlCO3dDQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFBLFdBQUksRUFBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3Q0FDakUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7d0NBRXZDLElBQUksR0FBRyxhQUFhLENBQUM7b0NBQ3pCLENBQUM7eUNBQU0sQ0FBQzt3Q0FDSixPQUFPO3dDQUNQLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO3dDQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztvQ0FDdEQsQ0FBQztnQ0FDTCxDQUFDO3FDQUFNLENBQUM7b0NBQ0osSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0NBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxDQUFDO2dDQUNoRSxDQUFDO2dDQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dDQUNoRCxPQUFPO2dDQUNQLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQzs0QkFDbkQsQ0FBQzs0QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dDQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3BFLENBQUM7NEJBRUQsWUFBWTs0QkFDWixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzs0QkFFbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxDQUFDLElBQUksT0FBTyxTQUFTLEVBQUUsQ0FBQyxDQUFDOzRCQUVwRSxpQkFBaUI7NEJBQ2pCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0NBQ1osSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7Z0NBRXpCLFNBQVM7Z0NBQ1QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Z0NBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2dDQUV4QixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQ0FDbEIsS0FBSyxFQUFFLHlCQUF5QjtvQ0FDaEMsT0FBTyxFQUFFLDRCQUE0QixJQUFJLENBQUMsSUFBSSxFQUFFO29DQUNoRCxNQUFNLEVBQUUsZ0JBQWdCO29DQUN4QixJQUFJLEVBQUUsU0FBUztpQ0FDbEIsQ0FBQyxDQUFBOzRCQUNOLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFFYixDQUFDO3dCQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7NEJBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDOzRCQUV6QixTQUFTOzRCQUNULElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dDQUNyQixZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dDQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQzs0QkFDOUIsQ0FBQzs0QkFFRCxTQUFTOzRCQUNULE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO3dCQUM3RSxDQUFDO29CQUNMLENBQUM7b0JBRUQsU0FBUztvQkFDVCxLQUFLLENBQUMsY0FBYyxDQUFDLElBQVM7d0JBQzFCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRCQUNuQixPQUFPOzRCQUNQLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dDQUNyQixZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dDQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQzs0QkFDOUIsQ0FBQzs0QkFFRCxPQUFPOzRCQUNQLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDOzRCQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzs0QkFFbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBRTdDLGVBQWU7NEJBQ2YsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQzs0QkFDbkUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUV0RCxhQUFhOzRCQUNiLElBQUksQ0FBQztnQ0FDRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQ0FDM0IsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29DQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixTQUFTLEVBQUUsQ0FBQyxDQUFDO2dDQUNuRCxDQUFDOzRCQUNMLENBQUM7NEJBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQ0FDWCxPQUFPLENBQUMsSUFBSSxDQUFDLCtCQUErQixTQUFTLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDbEUsQ0FBQzs0QkFFRCxPQUFPOzRCQUNQLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRTtnQ0FDcEQsT0FBTyxFQUFFLHNCQUFzQixJQUFJLENBQUMsSUFBSSxFQUFFOzZCQUM3QyxDQUFDLENBQUM7d0JBQ1AsQ0FBQztvQkFDTCxDQUFDO2lCQUNKO2FBQ0osQ0FBQyxDQUFDO1lBRUgsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDTCxDQUFDO0lBQ0QsV0FBVyxLQUFLLENBQUM7SUFDakIsS0FBSztRQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNOLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBjcmVhdGVBcHAsIEFwcCB9IGZyb20gJ3Z1ZSc7XHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XHJcbi8qKlxyXG4gKiBAemgg5aaC5p6c5biM5pyb5YW85a65IDMuMyDkuYvliY3nmoTniYjmnKzlj6/ku6Xkvb/nlKjkuIvmlrnnmoTku6PnoIFcclxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcclxuICovXHJcbi8vIEVkaXRvci5QYW5lbC5kZWZpbmUgPSBFZGl0b3IuUGFuZWwuZGVmaW5lIHx8IGZ1bmN0aW9uKG9wdGlvbnM6IGFueSkgeyByZXR1cm4gb3B0aW9ucyB9XHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XHJcbiAgICBsaXN0ZW5lcnM6IHtcclxuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnc2hvdycpOyB9LFxyXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG4gICAgJDoge1xyXG4gICAgICAgIGFwcDogJyNhcHAnLFxyXG4gICAgICAgIHRleHQ6ICcjdGV4dCcsXHJcbiAgICB9LFxyXG4gICAgbWV0aG9kczoge1xyXG4gICAgICAgIGhlbGxvKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kLnRleHQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJC50ZXh0LmlubmVySFRNTCA9ICdoZWxsbyc7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW2NvY29zLXBhbmVsLWh0bWwuZGVmYXVsdF06IGhlbGxvJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgfSxcclxuICAgIHJlYWR5KCkge1xyXG4gICAgICAgIGlmICh0aGlzLiQudGV4dCkge1xyXG4gICAgICAgICAgICB0aGlzLiQudGV4dC5pbm5lckhUTUwgPSAnSGVsbG8gQ29jb3MuJztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcclxuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcclxuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xyXG5cclxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTXlDb3VudGVyJywge1xyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvbWFpbi1wYW5lbC5odG1sJyksICd1dGYtOCcpLFxyXG4gICAgICAgICAgICAgICAgZGF0YSgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBvczogW10gYXMgYW55W10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRpbmc6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2hSZXBvcygpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBmZXRjaFJlcG9zKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgRWRpdG9yLk5ldHdvcmsuZ2V0KCdodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL2tzZ2FtZXMyNi9yZXBvcycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVzcG9uc2UudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlj6rojrflj5YgZ2FtZS0g5byA5aS055qE5LuT5bqTXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcG9zID0gZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHJlcG86IGFueSkgPT4gcmVwby5uYW1lLnN0YXJ0c1dpdGgoJ2dhbWUtJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocmVwbzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfTpgLCByZXBvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHJlcG8ubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiByZXBvLmRlc2NyaXB0aW9uIHx8ICdObyBkZXNjcmlwdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHJlcG8uaHRtbF91cmwsIC8vIEdpdEh1YiBBUEkg6L+U5Zue55qEIGh0bWxfdXJsIOaYr+S7k+W6k+eahOe9kemhtSBVUkxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb25lX3VybDogcmVwby5jbG9uZV91cmwsIC8vIOa3u+WKoCBjbG9uZV91cmzvvIzlj6/ku6XnlKjkuo4gZ2l0IGNsb25lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZTogcmVwby5sYW5ndWFnZSB8fCAnVW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWNlbnNlOiByZXBvLmxpY2Vuc2U/Lm5hbWUgfHwgJ05vIGxpY2Vuc2UnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZF9hdDogbmV3IERhdGUocmVwby5jcmVhdGVkX2F0KS50b0xvY2FsZURhdGVTdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5ldyBEYXRlKHJlcG8udXBkYXRlZF9hdCkudG9Mb2NhbGVEYXRlU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbW1pdDogcmVwby5wdXNoZWRfYXQgfHwgcmVwby51cGRhdGVkX2F0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRpbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YWxsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzX3VwZGF0ZTogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xku5PlupPmmK/lkKblt7Llronoo4VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hlY2tJbnN0YWxsZWRSZXBvcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVycm9yID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gZmV0Y2ggcmVwb3NpdG9yaWVzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5ZOq5Lqb5LuT5bqT5bey5a6J6KOF5Lul5Y+K5piv5ZCm5pyJ5pu05pawXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgY2hlY2tJbnN0YWxsZWRSZXBvcygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W6aG555uu6Lev5b6E5LiL55qEZXh0ZW5zaW9uc+ebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdleHRlbnNpb25zJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJlcG8gb2YgdGhpcy5yZXBvcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l55uu5qCH55uu5b2V5piv5ZCm5a2Y5ZyoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXREaXIgPSBwYXRoLmpvaW4oZXh0ZW5zaW9uc0RpciwgcmVwby5uYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKblt7Llronoo4VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uaW5zdGFsbGVkID0gZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvLmluc3RhbGxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBpcyBpbnN0YWxsZWRgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJ5pu05paw77yI6YCa6L+H5qOA5p+lIHBhY2thZ2UuanNvbiDkuK3nmoQgbGFzdF9jb21taXQg5L+h5oGv77yJXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCd6K+V6K+75Y+WIHBhY2thZ2UuanNvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAncGFja2FnZS5qc29uJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDor7vlj5YgcGFja2FnZS5qc29uIOaWh+S7tlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluacrOWcsCBsYXN0X2NvbW1pdCDkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsTGFzdENvbW1pdCA9IHBhY2thZ2VKc29uLmxhc3RfY29tbWl0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NhbExhc3RDb21taXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IC0gTG9jYWwgbGFzdCBjb21taXQ6ICR7bG9jYWxMYXN0Q29tbWl0fSwgUmVtb3RlIGxhc3QgY29tbWl0OiAke3JlcG8ubGFzdF9jb21taXR9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOi9rOaNouS4uiBEYXRlIOWvueixoei/m+ihjOavlOi+g1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF0ZSA9IG5ldyBEYXRlKGxvY2FsTGFzdENvbW1pdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3RlRGF0ZSA9IG5ldyBEYXRlKHJlcG8ubGFzdF9jb21taXQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzov5znqIvmj5DkuqTml7bpl7TmmZrkuo7mnKzlnLDmj5DkuqTml7bpl7TvvIzooajnpLrmnInmm7TmlrBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLmhhc191cGRhdGUgPSByZW1vdGVEYXRlID4gbG9jYWxEYXRlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IGhhcyB1cGRhdGU6ICR7cmVwby5oYXNfdXBkYXRlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpwgcGFja2FnZS5qc29uIOS4reayoeaciSBsYXN0X2NvbW1pdCDkv6Hmga/vvIzkvb/nlKjmlofku7bkv67mlLnml7bpl7RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IC0gTm8gbGFzdF9jb21taXQgZm91bmQgaW4gcGFja2FnZS5qc29uLCB1c2luZyBmaWxlIHN0YXRzYCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMuc3RhdChwYWNrYWdlSnNvblBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsTGFzdE1vZGlmaWVkID0gbmV3IERhdGUoc3RhdHMubXRpbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbW90ZUxhc3RDb21taXQgPSBuZXcgRGF0ZShyZXBvLmxhc3RfY29tbWl0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5pys5Zyw5L+u5pS55pe26Ze05pep5LqO6L+c56iL5pyA5ZCO5o+Q5Lqk5pe26Ze077yM6KGo56S65pyJ5pu05pawXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5oYXNfdXBkYXRlID0gbG9jYWxMYXN0TW9kaWZpZWQgPCByZW1vdGVMYXN0Q29tbWl0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IC0gTG9jYWwgbW9kaWZpZWQ6ICR7bG9jYWxMYXN0TW9kaWZpZWR9LCBSZW1vdGUgY29tbWl0OiAke3JlbW90ZUxhc3RDb21taXR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSBoYXMgdXBkYXRlOiAke3JlcG8uaGFzX3VwZGF0ZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBjaGVjayBmb3IgdXBkYXRlcyBmb3IgJHtyZXBvLm5hbWV9OmAsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHJ5KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoUmVwb3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyDlpITnkIbkuIvovb3mjInpkq7ngrnlh7tcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBvbkRvd25sb2FkQ2xpY2socmVwbzogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOato+WcqOS4i+i9ve+8jOS4jeaJp+ihjOS7u+S9leaTjeS9nFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5kb3dubG9hZGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzlt7Llronoo4XkuJTmnInmm7TmlrDvvIzor6Lpl67mmK/lkKbmm7TmlrBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG8uaW5zdGFsbGVkICYmIHJlcG8uaGFzX3VwZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qC55o2u5a6Y5pa55paH5qGj5L2/55SoIEVkaXRvci5EaWFsb2cuaW5mbyDlubbkvKDpgJIgYnV0dG9ucyDlj4LmlbBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5EaWFsb2cuaW5mbyhgJHtyZXBvLm5hbWV9IGlzIGFscmVhZHkgaW5zdGFsbGVkIGJ1dCBoYXMgdXBkYXRlcy4gRG8geW91IHdhbnQgdG8gdXBkYXRlIGl0P2AsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zOiBbJ2NvbmZpcm0nLCAnY2FuY2VsJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdVcGRhdGUgUmVwb3NpdG9yeScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRGlhbG9nIHJlc3VsdDonLCByZXN1bHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOeUqOaIt+ehruiupOabtOaWsFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXNwb25zZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZG93bmxvYWRSZXBvKHJlcG8sIHRydWUpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5bey5a6J6KOF5L2G5peg5pu05paw77yM5o+Q56S65bey5a6J6KOFXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHJlcG8uaW5zdGFsbGVkICYmICFyZXBvLmhhc191cGRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbyhgJHtyZXBvLm5hbWV9IGlzIGFscmVhZHkgaW5zdGFsbGVkIGFuZCB1cCB0byBkYXRlLmAsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zOiBbJ29rJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdSZXBvc2l0b3J5IEluc3RhbGxlZCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacquWuieijhe+8jOebtOaOpeS4i+i9vVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZG93bmxvYWRSZXBvKHJlcG8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgZG93bmxvYWRSZXBvKHJlcG86IGFueSwgaXNVcGRhdGUgPSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtpc1VwZGF0ZSA/ICdVcGRhdGluZycgOiAnRG93bmxvYWRpbmcnfSByZXBvc2l0b3J5OmAsIHJlcG8pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPlumhueebrui3r+W+hOS4i+eahGV4dGVuc2lvbnPnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbnNEaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ2V4dGVuc2lvbnMnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldERpciA9IHBhdGguam9pbihleHRlbnNpb25zRGlyLCByZXBvLm5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUYXJnZXQgZGlyZWN0b3J5OiAke3RhcmdldERpcn1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xnm67moIfnm67lvZXmmK/lkKblrZjlnKjvvIzlpoLmnpzlrZjlnKjliJnlhYjliKDpmaRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldERpcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVGFyZ2V0IGRpcmVjdG9yeSBleGlzdHMsIHJlbW92aW5nOiAke3RhcmdldERpcn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUodGFyZ2V0RGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rnm67moIfnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLmVuc3VyZURpcih0YXJnZXREaXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpSBVUkwg5piv5ZCm5pyJ5pWIXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlcG8udXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZXBvc2l0b3J5IFVSTCBpcyB1bmRlZmluZWQgZm9yICR7cmVwby5uYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOino+aekCBVUkzvvIznoa7kv53moLzlvI/mraPnoa5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOagvOW8j+W6lOS4ujogaHR0cHM6Ly9naXRodWIuY29tL2tzZ2FtZXMyNi9nYW1lLWNvcmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcnRzID0gcmVwby51cmwuc3BsaXQoJy8nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1cmxQYXJ0cy5sZW5ndGggPCA1KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIEdpdEh1YiBVUkwgZm9ybWF0OiAke3JlcG8udXJsfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG93bmVyID0gdXJsUGFydHNbM107IC8vIOmAmuW4uOaYryAna3NnYW1lczI2J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVwb05hbWUgPSB1cmxQYXJ0c1s0XTsgLy8g6YCa5bi45pivICdnYW1lLWNvcmUnIOetiVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqOaZrumAmueahCBHaXRIdWIg5LiL6L296ZO+5o6l6ICM5LiN5pivIEFQSSDnq6/ngrlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdpdEh1YiBBUEkg6ZyA6KaB6K6k6K+B5omN6IO96YG/5YWN6YCf546H6ZmQ5Yi25a+86Ie055qEIDQwMyDplJnor69cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHppcFVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtvd25lcn0vJHtyZXBvTmFtZX0vYXJjaGl2ZS9yZWZzL2hlYWRzL21hc3Rlci56aXBgO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBPd25lcjogJHtvd25lcn0sIFJlcG86ICR7cmVwb05hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRpbmcgWklQIGZyb206ICR7emlwVXJsfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOi/m+W6puWIsDEwJVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzcyA9IDAuMTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKjov5vluqbmm7TmlrDmqKHmi5/kuIvovb3ov5vluqZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVByb2dyZXNzID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvLnByb2dyZXNzIDwgMC45KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgKz0gMC4wNTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gc2V0VGltZW91dCh1cGRhdGVQcm9ncmVzcywgNTAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOW8gOWni+i/m+W6puabtOaWsFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUHJvZ3Jlc3MoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkuIvovb1aSVDmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHppcEZpbGVQYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgJ3JlcG8uemlwJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB6aXBGaWxlID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oemlwRmlsZVBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmt7vliqDor7fmsYLpgInpobnvvIzljIXmi6wgVXNlci1BZ2VudCDlpLRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlci1BZ2VudCc6ICdNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTIwLjAuMC4wIFNhZmFyaS81MzcuMzYnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBodHRwcy5nZXQoemlwVXJsLCBvcHRpb25zLCAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aSE55CG6YeN5a6a5ZCRXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDEgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMzAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdFVybCA9IHJlc3BvbnNlLmhlYWRlcnMubG9jYXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0VXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignUmVkaXJlY3QgbG9jYXRpb24gbm90IGZvdW5kJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVkaXJlY3RpbmcgdG86ICR7cmVkaXJlY3RVcmx9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHR0cHMuZ2V0KHJlZGlyZWN0VXJsLCBvcHRpb25zLCAocmVkaXJlY3RSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWRpcmVjdFJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBGYWlsZWQgdG8gZG93bmxvYWQgWklQIGZpbGU6ICR7cmVkaXJlY3RSZXNwb25zZS5zdGF0dXNDb2RlfWApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RSZXNwb25zZS5waXBlKHppcEZpbGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLm9uKCdmaW5pc2gnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkub24oJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnVubGluayh6aXBGaWxlUGF0aCwgKCkgPT4geyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkIFpJUCBmaWxlOiAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9YCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5waXBlKHppcEZpbGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgemlwRmlsZS5vbignZmluaXNoJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgemlwRmlsZS5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5vbignZXJyb3InLCAoZXJyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnVubGluayh6aXBGaWxlUGF0aCwgKCkgPT4geyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlgZzmraLov5vluqbmm7TmlrBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvLnByb2dyZXNzVGltZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQocmVwby5wcm9ncmVzc1RpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnByb2dyZXNzVGltZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOi/m+W6puWIsDkwJVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzcyA9IDAuOTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKjlpJbpg6jlkb3ku6Top6PljosgWklQIOaWh+S7tlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0V4dHJhY3RpbmcgWklQIGZpbGU6JywgemlwRmlsZVBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Yib5bu65Li05pe25o+Q5Y+W55uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0cmFjdERpciA9IHBhdGguam9pbih0YXJnZXREaXIsICdfdGVtcF9leHRyYWN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMuZW5zdXJlRGlyKGV4dHJhY3REaXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKggY2hpbGRfcHJvY2VzcyDmiafooYzop6Pljovlkb3ku6RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGV4ZWMgfSA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZyoIFdpbmRvd3Mg5LiK5L2/55SoIFBvd2VyU2hlbGwg6Kej5Y6LXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdW56aXBDb21tYW5kO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNXaW5kb3dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdpbmRvd3MgLSDkvb/nlKggUG93ZXJTaGVsbCDnmoQgRXhwYW5kLUFyY2hpdmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW56aXBDb21tYW5kID0gYHBvd2Vyc2hlbGwgLWNvbW1hbmQgXCJFeHBhbmQtQXJjaGl2ZSAtUGF0aCAnJHt6aXBGaWxlUGF0aC5yZXBsYWNlKC8nL2csIFwiJydcIil9JyAtRGVzdGluYXRpb25QYXRoICcke2V4dHJhY3REaXIucmVwbGFjZSgvJy9nLCBcIicnXCIpfSdcImA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFjT1MvTGludXggLSDkvb/nlKggdW56aXAg5ZG95LukXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuemlwQ29tbWFuZCA9IGB1bnppcCBcIiR7emlwRmlsZVBhdGh9XCIgLWQgXCIke2V4dHJhY3REaXJ9XCJgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0V4ZWN1dGluZyB1bnppcCBjb21tYW5kOicsIHVuemlwQ29tbWFuZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhlYyh1bnppcENvbW1hbmQsIChlcnJvcjogYW55LCBzdGRvdXQ6IHN0cmluZywgc3RkZXJyOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuemlwIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTdGRlcnI6Jywgc3RkZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBGYWlsZWQgdG8gZXh0cmFjdCBaSVA6ICR7ZXJyb3IubWVzc2FnZX1gKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbnppcCBzdGRvdXQ6Jywgc3Rkb3V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOenu+WKqOaWh+S7tuWIsOebruagh+ebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dHJhY3RlZEl0ZW1zID0gYXdhaXQgZnMucmVhZGRpcihleHRyYWN0RGlyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2l0SHViIFpJUCDpgJrluLjljIXlkKvkuIDkuKrmoLnnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmnInljZXkuIDnm67lvZXkuJTlkI3np7Dku6Xku5PlupPlkI3lvIDlpLRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc291cmNlRGlyID0gZXh0cmFjdERpcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXh0cmFjdGVkSXRlbXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0SXRlbSA9IHBhdGguam9pbihleHRyYWN0RGlyLCBleHRyYWN0ZWRJdGVtc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMuc3RhdChmaXJzdEl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlRGlyID0gZmlyc3RJdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgTW92aW5nIGZpbGVzIGZyb20gJHtzb3VyY2VEaXJ9IHRvICR7dGFyZ2V0RGlyfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnp7vliqjmiYDmnInmlofku7bliLDnm67moIfnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlRGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjUGF0aCA9IHBhdGguam9pbihzb3VyY2VEaXIsIGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsIGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgTW92aW5nOiAke3NyY1BhdGh9IC0+ICR7ZGVzdFBhdGh9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLm1vdmUoc3JjUGF0aCwgZGVzdFBhdGgsIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Yig6Zmk5Li05pe255uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucmVtb3ZlKGV4dHJhY3REaXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZW1vdmVkIHRlbXAgZGlyZWN0b3J5OicsIGV4dHJhY3REaXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBleHRyYWN0IFpJUDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZXh0cmFjdCBaSVAgZmlsZTogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIoOmZpFpJUOaWh+S7tlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucmVtb3ZlKHppcEZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDov5vluqbliLA5NSVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwLjk1O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsCBwYWNrYWdlLmpzb27vvIzmt7vliqAgbGFzdF9jb21taXQg5L+h5oGvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsICdwYWNrYWdlLmpzb24nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBwYWNrYWdlLmpzb24gd2l0aCBsYXN0X2NvbW1pdCBpbmZvOiAke3JlcG8ubGFzdF9jb21taXR9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDor7vlj5bnjrDmnIkgcGFja2FnZS5qc29uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5re75YqgIGxhc3RfY29tbWl0IOS/oeaBr1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlSnNvbi5sYXN0X2NvbW1pdCA9IHJlcG8ubGFzdF9jb21taXQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlhpnlm57mlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVwZGF0ZWQgcGFja2FnZS5qc29uIHdpdGggbGFzdF9jb21taXQgaW5mb2ApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBwYWNrYWdlLmpzb246JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOe7p+e7reaJp+ihjO+8jOi/meS4jeaYr+iHtOWRvemUmeivr1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWuieijheS+nei1luW5tuaehOW7ulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgSW5zdGFsbGluZyBkZXBlbmRlbmNpZXMgYW5kIGJ1aWxkaW5nIGluICR7dGFyZ2V0RGlyfS4uLmApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKggY2hpbGRfcHJvY2VzcyDmiafooYzlkb3ku6RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGV4ZWMgfSA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5a6J6KOF5L6d6LWWXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1J1bm5pbmcgbnBtIGluc3RhbGwuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoJ25wbSBpbnN0YWxsJywgeyBjd2Q6IHRhcmdldERpciB9LCAoZXJyb3I6IGFueSwgc3Rkb3V0OiBzdHJpbmcsIHN0ZGVycjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCducG0gaW5zdGFsbCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU3RkZXJyOicsIHN0ZGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiN5Lit5pat5rWB56iL77yM57un57ut5omn6KGMXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbnBtIGluc3RhbGwgc3Rkb3V0OicsIHN0ZG91dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnoTlu7rpobnnm65cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUnVubmluZyBucG0gcnVuIGJ1aWxkLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjKCducG0gcnVuIGJ1aWxkJywgeyBjd2Q6IHRhcmdldERpciB9LCAoZXJyb3I6IGFueSwgc3Rkb3V0OiBzdHJpbmcsIHN0ZGVycjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCducG0gcnVuIGJ1aWxkIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTdGRlcnI6Jywgc3RkZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkuI3kuK3mlq3mtYHnqIvvvIznu6fnu63miafooYxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCducG0gcnVuIGJ1aWxkIHN0ZG91dDonLCBzdGRvdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RlcGVuZGVuY2llcyBpbnN0YWxsZWQgYW5kIGJ1aWxkIGNvbXBsZXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMgb3IgYnVpbGQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOe7p+e7reaJp+ihjO+8jOi/meS4jeaYr+iHtOWRvemUmeivr1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOazqOWGjOWSjOWQr+eUqOaJqeWxlVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlhYjojrflj5blt7Lms6jlhoznmoTmianlsZXliJfooahcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlcyA9IEVkaXRvci5QYWNrYWdlLmdldFBhY2thZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUluZm8gPSBwYWNrYWdlcy5maW5kKHBrZyA9PiBwa2cubmFtZSA9PT0gcmVwby5uYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBhY2thZ2VJbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZWdpc3RlcmluZyBleHRlbnNpb246ICR7cmVwby5uYW1lfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IEVkaXRvci5QYWNrYWdlLmdldFBhdGgocmVwby5uYW1lKSE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPlumhueebrui3r+W+hFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPlmV4dGVuc2lvbnPnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbnNEaXIgPSBqb2luKHByb2plY3RQYXRoLCAnZXh0ZW5zaW9ucycsIHJlcG8ubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuUGFja2FnZS5yZWdpc3RlcihleHRlbnNpb25zRGlyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gZXh0ZW5zaW9uc0RpcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOazqOWGjOaJqeWxlVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLlBhY2thZ2UucmVnaXN0ZXIocGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXh0ZW5zaW9uIHJlZ2lzdGVyZWQ6ICR7cmVwby5uYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IHBhY2thZ2VJbmZvLnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBFeHRlbnNpb24gJHtyZXBvLm5hbWV9IGlzIGFscmVhZHkgcmVnaXN0ZXJlZGApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEVuYWJsaW5nIGV4dGVuc2lvbjogJHtyZXBvLm5hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZCv55So5omp5bGVXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLlBhY2thZ2UuZW5hYmxlKHBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBFeHRlbnNpb24gZW5hYmxlZDogJHtyZXBvLm5hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWdpc3RlciBvciBlbmFibGUgZXh0ZW5zaW9uOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDov5vluqbliLAxMDAlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnByb2dyZXNzID0gMTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGRvd25sb2FkZWQgJHtyZXBvLm5hbWV9IHRvICR7dGFyZ2V0RGlyfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWujOaIkOS4i+i9ve+8jOW7tui/n+S4gOS8muWGjemHjee9rueKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDlronoo4XnirbmgIFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLmluc3RhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5oYXNfdXBkYXRlID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5UYXNrLmFkZE5vdGljZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgZG93bmxvYWRlZDogJHtyZXBvLm5hbWV9YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcIkdhbWUgRGFzaGJvYXJkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Rvd25sb2FkIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLmRvd25sb2FkaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YGc5q2i6L+b5bqm5pu05pawXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzc1RpbWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHJlcG8ucHJvZ3Jlc3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmmL7npLrplJnor6/pgJrnn6VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCAke3JlcG8ubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWPlua2iOS4i+i9veaWueazlVxyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGNhbmNlbERvd25sb2FkKHJlcG86IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5kb3dubG9hZGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5riF55CG6LWE5rqQXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzc1RpbWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHJlcG8ucHJvZ3Jlc3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDph43nva7nirbmgIFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uZG93bmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCBjYW5jZWxlZDonLCByZXBvLm5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluWPr+iDveW3suWIm+W7uueahOS4tOaXtuebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0RpciA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnZXh0ZW5zaW9ucycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RGlyID0gcGF0aC5qb2luKGV4dGVuc2lvbnNEaXIsIHJlcG8ubmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCd6K+V5Yig6Zmk5bey5LiL6L2955qE5YaF5a65XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldERpcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucmVtb3ZlKHRhcmdldERpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZW1vdmVkIGRpcmVjdG9yeTogJHt0YXJnZXREaXJ9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBGYWlsZWQgdG8gcmVtb3ZlIGRpcmVjdG9yeTogJHt0YXJnZXREaXJ9YCwgZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmmL7npLrpgJrnn6VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLmJyb2FkY2FzdCgnc2NlbmUnLCAnc3RhdHVzLWJhcjp3YXJuaW5nJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBEb3dubG9hZCBjYW5jZWxlZDogJHtyZXBvLm5hbWV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xyXG4gICAgICAgICAgICBwYW5lbERhdGFNYXAuc2V0KHRoaXMsIGFwcCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGJlZm9yZUNsb3NlKCkgeyB9LFxyXG4gICAgY2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgYXBwID0gcGFuZWxEYXRhTWFwLmdldCh0aGlzKTtcclxuICAgICAgICBpZiAoYXBwKSB7XHJcbiAgICAgICAgICAgIGFwcC51bm1vdW50KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufSk7XHJcbiJdfQ==