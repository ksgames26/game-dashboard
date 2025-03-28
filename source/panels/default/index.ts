import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App } from 'vue';
import * as https from 'https';
import * as fs from 'fs-extra';
import * as path from 'path';

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
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

            app.component('MyCounter', {
                template: readFileSync(join(__dirname, '../../../static/template/vue/main-panel.html'), 'utf-8'),
                data() {
                    return {
                        repos: [] as any[],
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
                                .filter((repo: any) => repo.name.startsWith('game-'))
                                .map((repo: any) => {
                                    console.log(`Repository ${repo.name}:`, repo);
                                    return {
                                        name: repo.name,
                                        description: repo.description || 'No description',
                                        url: repo.html_url, // GitHub API 返回的 html_url 是仓库的网页 URL
                                        clone_url: repo.clone_url, // 添加 clone_url，可以用于 git clone
                                        language: repo.language || 'Unknown',
                                        license: repo.license?.name || 'No license',
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
                        } catch (error: any) {
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

                            } else {
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
                                        } else {
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
                                } catch (error) {
                                    console.error(`Failed to check for updates for ${repo.name}:`, error);
                                }
                            }
                        }
                    },
                    retry() {
                        this.fetchRepos();
                    },

                    // 处理下载按钮点击
                    async onDownloadClick(repo: any) {
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

                    async downloadRepo(repo: any, isUpdate = false) {
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

                            await new Promise<void>((resolve, reject) => {
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
                                } else {
                                    // macOS/Linux - 使用 unzip 命令
                                    unzipCommand = `unzip "${zipFilePath}" -d "${extractDir}"`;
                                }

                                console.log('Executing unzip command:', unzipCommand);

                                await new Promise<void>((resolve, reject) => {
                                    exec(unzipCommand, (error: any, stdout: string, stderr: string) => {
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
                            } catch (error: any) {
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
                            } catch (error) {
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
                                await new Promise<void>((resolve, reject) => {
                                    exec('npm install', { cwd: targetDir }, (error: any, stdout: string, stderr: string) => {
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
                                await new Promise<void>((resolve, reject) => {
                                    exec('npm run build', { cwd: targetDir }, (error: any, stdout: string, stderr: string) => {
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
                            } catch (error) {
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

                                    path = Editor.Package.getPath(repo.name)!;

                                    if (!path) {
                                        // 获取项目路径
                                        const projectPath = Editor.Project.path;

                                        // 获取extensions目录
                                        const extensionsDir = join(projectPath, 'extensions', repo.name);
                                        Editor.Package.register(extensionsDir);

                                        path = extensionsDir;
                                    } else {
                                        // 注册扩展
                                        Editor.Package.register(path);
                                        console.log(`Extension registered: ${repo.name}`);
                                    }
                                } else {
                                    path = packageInfo.path;
                                    console.log(`Extension ${repo.name} is already registered`);
                                }

                                console.log(`Enabling extension: ${repo.name}`);
                                // 启用扩展
                                Editor.Package.enable(path);
                                console.log(`Extension enabled: ${repo.name}`);
                            } catch (error) {
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
                                })
                            }, 1000);

                        } catch (error: any) {
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
                    async cancelDownload(repo: any) {
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
                            } catch (err) {
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
