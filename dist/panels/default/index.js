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
                            repo.installed = false;
                            repo.has_update = false;
                            // 检查是否已安装
                            if (fs.existsSync(targetDir)) {
                                // 读取目录内容来检查是否为空目录
                                const dirContents = await fs.readdir(targetDir);
                                // 如果目录是空的，则不认为已安装
                                if (dirContents.length === 0) {
                                    console.log(`Repository ${repo.name} directory exists but is empty - not considered installed`);
                                    continue;
                                }
                                // 检查目录中是否有package.json文件，这是一个有效安装的标志
                                const packageJsonPath = path.join(targetDir, 'package.json');
                                if (!fs.existsSync(packageJsonPath)) {
                                    console.log(`Repository ${repo.name} directory exists but has no package.json - not considered installed`);
                                    continue;
                                }
                                // 现在可以确认这是一个已安装的库
                                console.log(`Repository ${repo.name} is installed`);
                                repo.installed = true;
                            }
                            else {
                                console.log(`Repository ${repo.name} is not installed`);
                                repo.installed = false;
                            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBd0M7QUFDeEMsK0JBQTRCO0FBQzVCLDZCQUFxQztBQUNyQyw2Q0FBK0I7QUFDL0IsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUU3QixNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFDO0FBQzdDOzs7R0FHRztBQUNILHlGQUF5RjtBQUN6RixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLFNBQVMsRUFBRTtRQUNQLElBQUksS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEM7SUFDRCxRQUFRLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSw2Q0FBNkMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUMvRixLQUFLLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx5Q0FBeUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUN4RixDQUFDLEVBQUU7UUFDQyxHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxPQUFPO0tBQ2hCO0lBQ0QsT0FBTyxFQUFFO1FBQ0wsS0FBSztZQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO2dCQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7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QU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwIH0gZnJvbSAndnVlJztcclxuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG5jb25zdCBwYW5lbERhdGFNYXAgPSBuZXcgV2Vha01hcDxhbnksIEFwcD4oKTtcclxuLyoqXHJcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxyXG4gKiBAZW4gWW91IGNhbiBhZGQgdGhlIGNvZGUgYmVsb3cgaWYgeW91IHdhbnQgY29tcGF0aWJpbGl0eSB3aXRoIHZlcnNpb25zIHByaW9yIHRvIDMuM1xyXG4gKi9cclxuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cclxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcclxuICAgIGxpc3RlbmVyczoge1xyXG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXHJcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcclxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXHJcbiAgICAkOiB7XHJcbiAgICAgICAgYXBwOiAnI2FwcCcsXHJcbiAgICAgICAgdGV4dDogJyN0ZXh0JyxcclxuICAgIH0sXHJcbiAgICBtZXRob2RzOiB7XHJcbiAgICAgICAgaGVsbG8oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQudGV4dCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kLnRleHQuaW5uZXJIVE1MID0gJ2hlbGxvJztcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbY29jb3MtcGFuZWwtaHRtbC5kZWZhdWx0XTogaGVsbG8nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgcmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJC50ZXh0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJC50ZXh0LmlubmVySFRNTCA9ICdIZWxsbyBDb2Nvcy4nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeUNvdW50ZXInLCB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9tYWluLXBhbmVsLmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICAgICAgICAgICAgICBkYXRhKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9zOiBbXSBhcyBhbnlbXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGluZzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IG51bGxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaFJlcG9zKCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGZldGNoUmVwb3MoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBFZGl0b3IuTmV0d29yay5nZXQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vdXNlcnMva3NnYW1lczI2L3JlcG9zJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWPquiOt+WPliBnYW1lLSDlvIDlpLTnmoTku5PlupNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVwb3MgPSBkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigocmVwbzogYW55KSA9PiByZXBvLm5hbWUuc3RhcnRzV2l0aCgnZ2FtZS0nKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChyZXBvOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9OmAsIHJlcG8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcmVwby5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHJlcG8uZGVzY3JpcHRpb24gfHwgJ05vIGRlc2NyaXB0aW9uJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogcmVwby5odG1sX3VybCwgLy8gR2l0SHViIEFQSSDov5Tlm57nmoQgaHRtbF91cmwg5piv5LuT5bqT55qE572R6aG1IFVSTFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvbmVfdXJsOiByZXBvLmNsb25lX3VybCwgLy8g5re75YqgIGNsb25lX3VybO+8jOWPr+S7peeUqOS6jiBnaXQgY2xvbmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlOiByZXBvLmxhbmd1YWdlIHx8ICdVbmtub3duJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpY2Vuc2U6IHJlcG8ubGljZW5zZT8ubmFtZSB8fCAnTm8gbGljZW5zZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkX2F0OiBuZXcgRGF0ZShyZXBvLmNyZWF0ZWRfYXQpLnRvTG9jYWxlRGF0ZVN0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlZF9hdDogbmV3IERhdGUocmVwby51cGRhdGVkX2F0KS50b0xvY2FsZURhdGVTdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfY29tbWl0OiByZXBvLnB1c2hlZF9hdCB8fCByZXBvLnVwZGF0ZWRfYXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb3dubG9hZGluZzogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNfdXBkYXRlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeS7k+W6k+aYr+WQpuW3suWuieijhVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jaGVja0luc3RhbGxlZFJlcG9zKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBmZXRjaCByZXBvc2l0b3JpZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xlk6rkupvku5PlupPlt7Llronoo4Xku6Xlj4rmmK/lkKbmnInmm7TmlrBcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBjaGVja0luc3RhbGxlZFJlcG9zKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bpobnnm67ot6/lvoTkuIvnmoRleHRlbnNpb25z55uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbnNEaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ2V4dGVuc2lvbnMnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcmVwbyBvZiB0aGlzLnJlcG9zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xnm67moIfnm67lvZXmmK/lkKblrZjlnKhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldERpciA9IHBhdGguam9pbihleHRlbnNpb25zRGlyLCByZXBvLm5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uaW5zdGFsbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLmhhc191cGRhdGUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKblt7Llronoo4VcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+75Y+W55uu5b2V5YaF5a655p2l5qOA5p+l5piv5ZCm5Li656m655uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlyQ29udGVudHMgPSBhd2FpdCBmcy5yZWFkZGlyKHRhcmdldERpcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOebruW9leaYr+epuueahO+8jOWImeS4jeiupOS4uuW3suWuieijhVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXJDb250ZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9IGRpcmVjdG9yeSBleGlzdHMgYnV0IGlzIGVtcHR5IC0gbm90IGNvbnNpZGVyZWQgaW5zdGFsbGVkYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l55uu5b2V5Lit5piv5ZCm5pyJcGFja2FnZS5qc29u5paH5Lu277yM6L+Z5piv5LiA5Liq5pyJ5pWI5a6J6KOF55qE5qCH5b+XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgJ3BhY2thZ2UuanNvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBkaXJlY3RvcnkgZXhpc3RzIGJ1dCBoYXMgbm8gcGFja2FnZS5qc29uIC0gbm90IGNvbnNpZGVyZWQgaW5zdGFsbGVkYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g546w5Zyo5Y+v5Lul56Gu6K6k6L+Z5piv5LiA5Liq5bey5a6J6KOF55qE5bqTXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9IGlzIGluc3RhbGxlZGApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uaW5zdGFsbGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBpcyBub3QgaW5zdGFsbGVkYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5pbnN0YWxsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVwb3NpdG9yeSAke3JlcG8ubmFtZX0gaXMgaW5zdGFsbGVkYCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuacieabtOaWsO+8iOmAmui/h+ajgOafpSBwYWNrYWdlLmpzb24g5Lit55qEIGxhc3RfY29tbWl0IOS/oeaBr++8iVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwneivleivu+WPliBwYWNrYWdlLmpzb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgJ3BhY2thZ2UuanNvbicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+75Y+WIHBhY2thZ2UuanNvbiDmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bmnKzlnLAgbGFzdF9jb21taXQg5L+h5oGvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbExhc3RDb21taXQgPSBwYWNrYWdlSnNvbi5sYXN0X2NvbW1pdDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxMYXN0Q29tbWl0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSAtIExvY2FsIGxhc3QgY29tbWl0OiAke2xvY2FsTGFzdENvbW1pdH0sIFJlbW90ZSBsYXN0IGNvbW1pdDogJHtyZXBvLmxhc3RfY29tbWl0fWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDovazmjaLkuLogRGF0ZSDlr7nosaHov5vooYzmr5TovoNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERhdGUgPSBuZXcgRGF0ZShsb2NhbExhc3RDb21taXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbW90ZURhdGUgPSBuZXcgRGF0ZShyZXBvLmxhc3RfY29tbWl0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c6L+c56iL5o+Q5Lqk5pe26Ze05pma5LqO5pys5Zyw5o+Q5Lqk5pe26Ze077yM6KGo56S65pyJ5pu05pawXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5oYXNfdXBkYXRlID0gcmVtb3RlRGF0ZSA+IGxvY2FsRGF0ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSBoYXMgdXBkYXRlOiAke3JlcG8uaGFzX3VwZGF0ZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6cIHBhY2thZ2UuanNvbiDkuK3msqHmnIkgbGFzdF9jb21taXQg5L+h5oGv77yM5L2/55So5paH5Lu25L+u5pS55pe26Ze0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSAtIE5vIGxhc3RfY29tbWl0IGZvdW5kIGluIHBhY2thZ2UuanNvbiwgdXNpbmcgZmlsZSBzdGF0c2ApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQocGFja2FnZUpzb25QYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbExhc3RNb2RpZmllZCA9IG5ldyBEYXRlKHN0YXRzLm10aW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1vdGVMYXN0Q29tbWl0ID0gbmV3IERhdGUocmVwby5sYXN0X2NvbW1pdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOacrOWcsOS/ruaUueaXtumXtOaXqeS6jui/nOeoi+acgOWQjuaPkOS6pOaXtumXtO+8jOihqOekuuacieabtOaWsFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uaGFzX3VwZGF0ZSA9IGxvY2FsTGFzdE1vZGlmaWVkIDwgcmVtb3RlTGFzdENvbW1pdDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSAtIExvY2FsIG1vZGlmaWVkOiAke2xvY2FsTGFzdE1vZGlmaWVkfSwgUmVtb3RlIGNvbW1pdDogJHtyZW1vdGVMYXN0Q29tbWl0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3JlcG8ubmFtZX0gaGFzIHVwZGF0ZTogJHtyZXBvLmhhc191cGRhdGV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gY2hlY2sgZm9yIHVwZGF0ZXMgZm9yICR7cmVwby5uYW1lfTpgLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXRyeSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mZXRjaFJlcG9zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5aSE55CG5LiL6L295oyJ6ZKu54K55Ye7XHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgb25Eb3dubG9hZENsaWNrKHJlcG86IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmraPlnKjkuIvovb3vvIzkuI3miafooYzku7vkvZXmk43kvZxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5bey5a6J6KOF5LiU5pyJ5pu05paw77yM6K+i6Zeu5piv5ZCm5pu05pawXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvLmluc3RhbGxlZCAmJiByZXBvLmhhc191cGRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOagueaNruWumOaWueaWh+aho+S9v+eUqCBFZGl0b3IuRGlhbG9nLmluZm8g5bm25Lyg6YCSIGJ1dHRvbnMg5Y+C5pWwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuRGlhbG9nLmluZm8oYCR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IGluc3RhbGxlZCBidXQgaGFzIHVwZGF0ZXMuIERvIHlvdSB3YW50IHRvIHVwZGF0ZSBpdD9gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogWydjb25maXJtJywgJ2NhbmNlbCddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnVXBkYXRlIFJlcG9zaXRvcnknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RpYWxvZyByZXN1bHQ6JywgcmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnlKjmiLfnoa7orqTmm7TmlrBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQucmVzcG9uc2UgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkUmVwbyhyZXBvLCB0cnVlKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOW3suWuieijheS9huaXoOabtOaWsO+8jOaPkOekuuW3suWuieijhVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChyZXBvLmluc3RhbGxlZCAmJiAhcmVwby5oYXNfdXBkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmluZm8oYCR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgdXAgdG8gZGF0ZS5gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogWydvayddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnUmVwb3NpdG9yeSBJbnN0YWxsZWQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmnKrlronoo4XvvIznm7TmjqXkuIvovb1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkUmVwbyhyZXBvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGRvd25sb2FkUmVwbyhyZXBvOiBhbnksIGlzVXBkYXRlID0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7aXNVcGRhdGUgPyAnVXBkYXRpbmcnIDogJ0Rvd25sb2FkaW5nJ30gcmVwb3NpdG9yeTpgLCByZXBvKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uZG93bmxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBvLnByb2dyZXNzID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bpobnnm67ot6/lvoTkuIvnmoRleHRlbnNpb25z55uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdleHRlbnNpb25zJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXREaXIgPSBwYXRoLmpvaW4oZXh0ZW5zaW9uc0RpciwgcmVwby5uYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVGFyZ2V0IGRpcmVjdG9yeTogJHt0YXJnZXREaXJ9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l55uu5qCH55uu5b2V5piv5ZCm5a2Y5Zyo77yM5aaC5p6c5a2Y5Zyo5YiZ5YWI5Yig6ZmkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRhcmdldCBkaXJlY3RvcnkgZXhpc3RzLCByZW1vdmluZzogJHt0YXJnZXREaXJ9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucmVtb3ZlKHRhcmdldERpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Yib5bu655uu5qCH55uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5lbnN1cmVEaXIodGFyZ2V0RGlyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6UgVVJMIOaYr+WQpuacieaViFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXBvLnVybCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVwb3NpdG9yeSBVUkwgaXMgdW5kZWZpbmVkIGZvciAke3JlcG8ubmFtZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDop6PmnpAgVVJM77yM56Gu5L+d5qC85byP5q2j56GuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmoLzlvI/lupTkuLo6IGh0dHBzOi8vZ2l0aHViLmNvbS9rc2dhbWVzMjYvZ2FtZS1jb3JlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHJlcG8udXJsLnNwbGl0KCcvJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXJsUGFydHMubGVuZ3RoIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBHaXRIdWIgVVJMIGZvcm1hdDogJHtyZXBvLnVybH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvd25lciA9IHVybFBhcnRzWzNdOyAvLyDpgJrluLjmmK8gJ2tzZ2FtZXMyNidcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcG9OYW1lID0gdXJsUGFydHNbNF07IC8vIOmAmuW4uOaYryAnZ2FtZS1jb3JlJyDnrYlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKjmma7pgJrnmoQgR2l0SHViIOS4i+i9vemTvuaOpeiAjOS4jeaYryBBUEkg56uv54K5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHaXRIdWIgQVBJIOmcgOimgeiupOivgeaJjeiDvemBv+WFjemAn+eOh+mZkOWItuWvvOiHtOeahCA0MDMg6ZSZ6K+vXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB6aXBVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7b3duZXJ9LyR7cmVwb05hbWV9L2FyY2hpdmUvcmVmcy9oZWFkcy9tYXN0ZXIuemlwYDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgT3duZXI6ICR7b3duZXJ9LCBSZXBvOiAke3JlcG9OYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYERvd25sb2FkaW5nIFpJUCBmcm9tOiAke3ppcFVybH1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDov5vluqbliLAxMCVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwLjE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55So6L+b5bqm5pu05paw5qih5ouf5LiL6L296L+b5bqmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVQcm9ncmVzcyA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzcyA8IDAuOSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnByb2dyZXNzICs9IDAuMDU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3NUaW1lciA9IHNldFRpbWVvdXQodXBkYXRlUHJvZ3Jlc3MsIDUwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlvIDlp4vov5vluqbmm7TmlrBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVByb2dyZXNzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiL6L29WklQ5paH5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB6aXBGaWxlUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsICdyZXBvLnppcCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgemlwRmlsZSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHppcEZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5re75Yqg6K+35rGC6YCJ6aG577yM5YyF5ousIFVzZXItQWdlbnQg5aS0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZXItQWdlbnQnOiAnTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMC4wLjAuMCBTYWZhcmkvNTM3LjM2J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHR0cHMuZ2V0KHppcFVybCwgb3B0aW9ucywgKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWkhOeQhumHjeWumuWQkVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMzAxIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDMwMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSByZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdFVybCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1JlZGlyZWN0IGxvY2F0aW9uIG5vdCBmb3VuZCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlZGlyZWN0aW5nIHRvOiAke3JlZGlyZWN0VXJsfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0dHBzLmdldChyZWRpcmVjdFVybCwgb3B0aW9ucywgKHJlZGlyZWN0UmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVkaXJlY3RSZXNwb25zZS5zdGF0dXNDb2RlICE9PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkIFpJUCBmaWxlOiAke3JlZGlyZWN0UmVzcG9uc2Uuc3RhdHVzQ29kZX1gKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZGlyZWN0UmVzcG9uc2UucGlwZSh6aXBGaWxlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgemlwRmlsZS5vbignZmluaXNoJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLm9uKCdlcnJvcicsIChlcnIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmsoemlwRmlsZVBhdGgsICgpID0+IHsgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlICE9PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCBaSVAgZmlsZTogJHtyZXNwb25zZS5zdGF0dXNDb2RlfWApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UucGlwZSh6aXBGaWxlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUub24oJ2ZpbmlzaCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkub24oJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmsoemlwRmlsZVBhdGgsICgpID0+IHsgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YGc5q2i6L+b5bqm5pu05pawXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzc1RpbWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHJlcG8ucHJvZ3Jlc3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDov5vluqbliLA5MCVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwLjk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55So5aSW6YOo5ZG95Luk6Kej5Y6LIFpJUCDmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFeHRyYWN0aW5nIFpJUCBmaWxlOicsIHppcEZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uuS4tOaXtuaPkOWPluebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dHJhY3REaXIgPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAnX3RlbXBfZXh0cmFjdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLmVuc3VyZURpcihleHRyYWN0RGlyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55SoIGNoaWxkX3Byb2Nlc3Mg5omn6KGM6Kej5Y6L5ZG95LukXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWcqCBXaW5kb3dzIOS4iuS9v+eUqCBQb3dlclNoZWxsIOino+WOi1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzV2luZG93cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVuemlwQ29tbWFuZDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzV2luZG93cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIC0g5L2/55SoIFBvd2VyU2hlbGwg55qEIEV4cGFuZC1BcmNoaXZlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuemlwQ29tbWFuZCA9IGBwb3dlcnNoZWxsIC1jb21tYW5kIFwiRXhwYW5kLUFyY2hpdmUgLVBhdGggJyR7emlwRmlsZVBhdGgucmVwbGFjZSgvJy9nLCBcIicnXCIpfScgLURlc3RpbmF0aW9uUGF0aCAnJHtleHRyYWN0RGlyLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nXCJgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hY09TL0xpbnV4IC0g5L2/55SoIHVuemlwIOWRveS7pFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnppcENvbW1hbmQgPSBgdW56aXAgXCIke3ppcEZpbGVQYXRofVwiIC1kIFwiJHtleHRyYWN0RGlyfVwiYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFeGVjdXRpbmcgdW56aXAgY29tbWFuZDonLCB1bnppcENvbW1hbmQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWModW56aXBDb21tYW5kLCAoZXJyb3I6IGFueSwgc3Rkb3V0OiBzdHJpbmcsIHN0ZGVycjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnppcCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU3RkZXJyOicsIHN0ZGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgRmFpbGVkIHRvIGV4dHJhY3QgWklQOiAke2Vycm9yLm1lc3NhZ2V9YCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW56aXAgc3Rkb3V0OicsIHN0ZG91dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnp7vliqjmlofku7bliLDnm67moIfnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRyYWN0ZWRJdGVtcyA9IGF3YWl0IGZzLnJlYWRkaXIoZXh0cmFjdERpcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdpdEh1YiBaSVAg6YCa5bi45YyF5ZCr5LiA5Liq5qC555uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJ5Y2V5LiA55uu5b2V5LiU5ZCN56ew5Lul5LuT5bqT5ZCN5byA5aS0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNvdXJjZURpciA9IGV4dHJhY3REaXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4dHJhY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJzdEl0ZW0gPSBwYXRoLmpvaW4oZXh0cmFjdERpciwgZXh0cmFjdGVkSXRlbXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQoZmlyc3RJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURpciA9IGZpcnN0SXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYE1vdmluZyBmaWxlcyBmcm9tICR7c291cmNlRGlyfSB0byAke3RhcmdldERpcn1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g56e75Yqo5omA5pyJ5paH5Lu25Yiw55uu5qCH55uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZURpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyY1BhdGggPSBwYXRoLmpvaW4oc291cmNlRGlyLCBmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCBmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYE1vdmluZzogJHtzcmNQYXRofSAtPiAke2Rlc3RQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5tb3ZlKHNyY1BhdGgsIGRlc3RQYXRoLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIoOmZpOS4tOaXtuebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZShleHRyYWN0RGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUmVtb3ZlZCB0ZW1wIGRpcmVjdG9yeTonLCBleHRyYWN0RGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZXh0cmFjdCBaSVA6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGV4dHJhY3QgWklQIGZpbGU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliKDpmaRaSVDmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZSh6aXBGaWxlUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6L+b5bqm5YiwOTUlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnByb2dyZXNzID0gMC45NTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrAgcGFja2FnZS5qc29u77yM5re75YqgIGxhc3RfY29tbWl0IOS/oeaBr1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAncGFja2FnZS5qc29uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgcGFja2FnZS5qc29uIHdpdGggbGFzdF9jb21taXQgaW5mbzogJHtyZXBvLmxhc3RfY29tbWl0fWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+75Y+W546w5pyJIHBhY2thZ2UuanNvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoCBsYXN0X2NvbW1pdCDkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2FnZUpzb24ubGFzdF9jb21taXQgPSByZXBvLmxhc3RfY29tbWl0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YaZ5Zue5paH5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZShwYWNrYWdlSnNvblBhdGgsIEpTT04uc3RyaW5naWZ5KHBhY2thZ2VKc29uLCBudWxsLCAyKSwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGVkIHBhY2thZ2UuanNvbiB3aXRoIGxhc3RfY29tbWl0IGluZm9gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgcGFja2FnZS5qc29uOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnu6fnu63miafooYzvvIzov5nkuI3mmK/oh7Tlkb3plJnor69cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlronoo4Xkvp3otZblubbmnoTlu7pcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEluc3RhbGxpbmcgZGVwZW5kZW5jaWVzIGFuZCBidWlsZGluZyBpbiAke3RhcmdldERpcn0uLi5gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55SoIGNoaWxkX3Byb2Nlc3Mg5omn6KGM5ZG95LukXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWuieijheS+nei1llxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSdW5uaW5nIG5wbSBpbnN0YWxsLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjKCducG0gaW5zdGFsbCcsIHsgY3dkOiB0YXJnZXREaXIgfSwgKGVycm9yOiBhbnksIHN0ZG91dDogc3RyaW5nLCBzdGRlcnI6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbnBtIGluc3RhbGwgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1N0ZGVycjonLCBzdGRlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS4jeS4reaWrea1geeoi++8jOe7p+e7reaJp+ihjFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25wbSBpbnN0YWxsIHN0ZG91dDonLCBzdGRvdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5p6E5bu66aG555uuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1J1bm5pbmcgbnBtIHJ1biBidWlsZC4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhlYygnbnBtIHJ1biBidWlsZCcsIHsgY3dkOiB0YXJnZXREaXIgfSwgKGVycm9yOiBhbnksIHN0ZG91dDogc3RyaW5nLCBzdGRlcnI6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbnBtIHJ1biBidWlsZCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU3RkZXJyOicsIHN0ZGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiN5Lit5pat5rWB56iL77yM57un57ut5omn6KGMXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbnBtIHJ1biBidWlsZCBzdGRvdXQ6Jywgc3Rkb3V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEZXBlbmRlbmNpZXMgaW5zdGFsbGVkIGFuZCBidWlsZCBjb21wbGV0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzIG9yIGJ1aWxkOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnu6fnu63miafooYzvvIzov5nkuI3mmK/oh7Tlkb3plJnor69cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDms6jlhozlkozlkK/nlKjmianlsZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YWI6I635Y+W5bey5rOo5YaM55qE5omp5bGV5YiX6KGoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZXMgPSBFZGl0b3IuUGFja2FnZS5nZXRQYWNrYWdlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VJbmZvID0gcGFja2FnZXMuZmluZChwa2cgPT4gcGtnLm5hbWUgPT09IHJlcG8ubmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYWNrYWdlSW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVnaXN0ZXJpbmcgZXh0ZW5zaW9uOiAke3JlcG8ubmFtZX1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBFZGl0b3IuUGFja2FnZS5nZXRQYXRoKHJlcG8ubmFtZSkhO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bpobnnm67ot6/lvoRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gRWRpdG9yLlByb2plY3QucGF0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5ZleHRlbnNpb25z55uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gam9pbihwcm9qZWN0UGF0aCwgJ2V4dGVuc2lvbnMnLCByZXBvLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLlBhY2thZ2UucmVnaXN0ZXIoZXh0ZW5zaW9uc0Rpcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IGV4dGVuc2lvbnNEaXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDms6jlhozmianlsZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5QYWNrYWdlLnJlZ2lzdGVyKHBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEV4dGVuc2lvbiByZWdpc3RlcmVkOiAke3JlcG8ubmFtZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBwYWNrYWdlSW5mby5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXh0ZW5zaW9uICR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IHJlZ2lzdGVyZWRgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBFbmFibGluZyBleHRlbnNpb246ICR7cmVwby5uYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWQr+eUqOaJqeWxlVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5QYWNrYWdlLmVuYWJsZShwYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXh0ZW5zaW9uIGVuYWJsZWQ6ICR7cmVwby5uYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVnaXN0ZXIgb3IgZW5hYmxlIGV4dGVuc2lvbjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6L+b5bqm5YiwMTAwJVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzcyA9IDE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkICR7cmVwby5uYW1lfSB0byAke3RhcmdldERpcn1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlrozmiJDkuIvovb3vvIzlu7bov5/kuIDkvJrlho3ph43nva7nirbmgIFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uZG93bmxvYWRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5a6J6KOF54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uaGFzX3VwZGF0ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuVGFzay5hZGROb3RpY2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJTdWNjZXNzZnVsbHkgZG93bmxvYWRlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU3VjY2Vzc2Z1bGx5IGRvd25sb2FkZWQ6ICR7cmVwby5uYW1lfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogXCJHYW1lIERhc2hib2FyZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN1Y2Nlc3NcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdEb3dubG9hZCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWBnOatoui/m+W6puabtOaWsFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG8ucHJvZ3Jlc3NUaW1lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChyZXBvLnByb2dyZXNzVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3NUaW1lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pi+56S66ZSZ6K+v6YCa55+lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKGBGYWlsZWQgdG8gZG93bmxvYWQgJHtyZXBvLm5hbWV9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyDlj5bmtojkuIvovb3mlrnms5VcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBjYW5jZWxEb3dubG9hZChyZXBvOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOa4heeQhui1hOa6kFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG8ucHJvZ3Jlc3NUaW1lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChyZXBvLnByb2dyZXNzVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3NUaW1lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6YeN572u54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLmRvd25sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnByb2dyZXNzID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRG93bmxvYWQgY2FuY2VsZWQ6JywgcmVwby5uYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5blj6/og73lt7LliJvlu7rnmoTkuLTml7bnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbnNEaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ2V4dGVuc2lvbnMnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldERpciA9IHBhdGguam9pbihleHRlbnNpb25zRGlyLCByZXBvLm5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwneivleWIoOmZpOW3suS4i+i9veeahOWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZSh0YXJnZXREaXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVtb3ZlZCBkaXJlY3Rvcnk6ICR7dGFyZ2V0RGlyfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRmFpbGVkIHRvIHJlbW92ZSBkaXJlY3Rvcnk6ICR7dGFyZ2V0RGlyfWAsIGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pi+56S66YCa55+lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5icm9hZGNhc3QoJ3NjZW5lJywgJ3N0YXR1cy1iYXI6d2FybmluZycsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRG93bmxvYWQgY2FuY2VsZWQ6ICR7cmVwby5uYW1lfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcclxuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBiZWZvcmVDbG9zZSgpIHsgfSxcclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XHJcbiAgICAgICAgaWYgKGFwcCkge1xyXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn0pO1xyXG4iXX0=