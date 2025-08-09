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
exports.GithubService = void 0;
const fs = __importStar(require("fs-extra"));
const https = __importStar(require("https"));
const path = __importStar(require("path"));
const path_1 = require("path");
class GithubService {
    constructor(component) {
        this.component = component;
    }
    async fetchRepos() {
        try {
            this.component.loading = true;
            this.component.error = null;
            const response = await Editor.Network.get('https://api.github.com/users/ksgames26/repos');
            const data = JSON.parse(response.toString());
            this.component.repos = data
                .filter((repo) => repo.name.startsWith('game-'))
                .map((repo) => {
                var _a;
                console.log(`Repository ${repo.name}:`, repo);
                return {
                    name: repo.name,
                    description: repo.description || 'No description',
                    url: repo.html_url,
                    clone_url: repo.clone_url,
                    language: repo.language || 'Unknown',
                    license: ((_a = repo.license) === null || _a === void 0 ? void 0 : _a.name) || 'No license',
                    created_at: new Date(repo.created_at).toLocaleDateString(),
                    updated_at: new Date(repo.updated_at).toLocaleDateString(),
                    last_commit: repo.pushed_at || repo.updated_at,
                    downloading: false,
                    progress: 0,
                    installed: false,
                    has_update: false,
                    progressTimer: null, // 用于存储定时器
                    gameDependencies: {}, // 新增游戏依赖字段
                    dependencies_loading: true, // 依赖是否正在加载
                };
            });
            // 异步获取每个仓库的 gameDependencies，不阻塞UI
            console.log('Fetched repositories:', this.component.repos);
            this.fetchGameDependencies();
            console.log("Checking for updates...");
            await this.checkInstalledRepos();
            this.component.loading = false;
        }
        catch (error) {
            this.component.error = {
                message: 'Failed to fetch repositories',
                error: error.message,
            };
            this.component.loading = false;
        }
    }
    async fetchGameDependencies() {
        const promises = this.component.repos.map(async (repo) => {
            try {
                const urlParts = repo.url.split('/');
                const owner = urlParts[3];
                const repoName = urlParts[4];
                const packageJsonUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/master/package.json`;
                const response = await Editor.Network.get(packageJsonUrl);
                if (response) {
                    const packageJson = JSON.parse(response.toString());
                    if (packageJson.gameDependencies) {
                        repo.gameDependencies = packageJson.gameDependencies;
                    }
                }
            }
            catch (error) {
                // 如果获取失败，则不处理，依赖项将为空
                console.warn(`Could not fetch package.json for ${repo.name}:`, error);
            }
            finally {
                // 无论成功与否，都设置加载完成
                repo.dependencies_loading = false;
            }
        });
        await Promise.all(promises);
    }
    async checkInstalledRepos() {
        const extensionsDir = path.join(Editor.Project.path, 'extensions');
        for (const repo of this.component.repos) {
            const targetDir = path.join(extensionsDir, repo.name);
            repo.installed = false;
            repo.has_update = false;
            if (fs.existsSync(targetDir)) {
                const dirContents = await fs.readdir(targetDir);
                if (dirContents.length === 0) {
                    console.log(`Repository ${repo.name} directory exists but is empty - not considered installed`);
                    continue;
                }
                const packageJsonPath = path.join(targetDir, 'package.json');
                if (!fs.existsSync(packageJsonPath)) {
                    console.log(`Repository ${repo.name} directory exists but has no package.json - not considered installed`);
                    continue;
                }
                console.log(`Repository ${repo.name} is installed`);
                repo.installed = true;
                try {
                    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                    const packageJson = JSON.parse(packageJsonContent);
                    const localLastCommit = packageJson.last_commit;
                    if (localLastCommit) {
                        console.log(`${repo.name} - Local last commit: ${localLastCommit}, Remote last commit: ${repo.last_commit}`);
                        const localDate = new Date(localLastCommit);
                        const remoteDate = new Date(repo.last_commit);
                        repo.has_update = remoteDate > localDate;
                        console.log(`${repo.name} has update: ${repo.has_update}`);
                    }
                    else {
                        console.log(`${repo.name} - No last_commit found in package.json, using file stats`);
                        const stats = await fs.stat(packageJsonPath);
                        const localLastModified = new Date(stats.mtime);
                        const remoteLastCommit = new Date(repo.last_commit);
                        repo.has_update = localLastModified < remoteLastCommit;
                        console.log(`${repo.name} - Local modified: ${localLastModified}, Remote commit: ${remoteLastCommit}`);
                        console.log(`${repo.name} has update: ${repo.has_update}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to check for updates for ${repo.name}:`, error);
                }
            }
            else {
                console.log(`Repository ${repo.name} is not installed`);
                repo.installed = false;
            }
        }
    }
    retry() {
        this.component.fetchRepos();
    }
    async onDownloadClick(repo) {
        if (repo.downloading)
            return;
        // 如果依赖仍在分析中，提示用户稍后
        if (repo.dependencies_loading) {
            Editor.Dialog.info('正在分析依赖项，请稍后重试。', {
                buttons: ['好的'],
                title: '请稍候'
            });
            return;
        }
        if (repo.installed && repo.has_update) {
            const result = await Editor.Dialog.info(`${repo.name} is already installed but has updates. Do you want to update it?`, {
                buttons: ['confirm', 'cancel'],
                title: 'Update Repository',
            });
            console.log('Dialog result:', result);
            if (result.response === 0) {
                await this.downloadRepo(repo, true);
            }
        }
        else if (repo.installed && !repo.has_update) {
            Editor.Dialog.info(`${repo.name} is already installed and up to date.`, {
                buttons: ['ok'],
                title: 'Repository Installed',
            });
        }
        else {
            await this.downloadRepo(repo);
        }
    }
    async downloadRepo(repo, isUpdate = false) {
        if (repo.downloading) {
            console.log(`Repository ${repo.name} is already downloading.`);
            return;
        }
        console.log(`${isUpdate ? 'Updating' : 'Downloading'} repository:`, repo);
        repo.downloading = true;
        repo.progress = 0;
        try {
            // 检查并下载依赖项
            if (repo.gameDependencies && Object.keys(repo.gameDependencies).length > 0) {
                console.log(`Checking dependencies for ${repo.name}...`);
                for (const depName in repo.gameDependencies) {
                    const depRepo = this.component.repos.find(r => r.name === depName);
                    if (depRepo && !depRepo.installed) {
                        console.log(`Dependency ${depName} is not installed. Downloading it first...`);
                        Editor.Task.addNotice({
                            title: "Downloading Dependency",
                            message: `Downloading dependency for ${repo.name}: ${depName}`,
                            source: "Game Dashboard",
                            type: "log",
                        });
                        await this.downloadRepo(depRepo, false);
                    }
                }
            }
            const extensionsDir = path.join(Editor.Project.path, 'extensions');
            const targetDir = path.join(extensionsDir, repo.name);
            console.log(`Target directory: ${targetDir}`);
            if (fs.existsSync(targetDir)) {
                console.log(`Target directory exists, removing: ${targetDir}`);
                await fs.remove(targetDir);
            }
            await fs.ensureDir(targetDir);
            const urlParts = repo.url.split('/');
            const owner = urlParts[3];
            const repoName = urlParts[4];
            const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
            const zipFilePath = path.join(targetDir, 'repo.zip');
            console.log(`Owner: ${owner}, Repo: ${repoName}`);
            console.log(`Downloading ZIP from: ${zipUrl}`);
            repo.progress = 10;
            repo.progressTimer = setInterval(() => {
                if (repo.progress < 95)
                    repo.progress += 5;
            }, 500);
            await this.downloadFile(zipUrl, zipFilePath);
            clearInterval(repo.progressTimer);
            repo.progressTimer = null;
            repo.progress = 90;
            console.log('Extracting ZIP file:', zipFilePath);
            await this.unzipFile(zipFilePath, targetDir);
            await fs.remove(zipFilePath);
            repo.progress = 95;
            await this.updatePackageJson(targetDir, repo.last_commit);
            await this.installAndBuild(targetDir);
            this.registerAndEnableExtension(repo.name);
            repo.progress = 100;
            console.log(`Successfully downloaded ${repo.name} to ${targetDir}`);
            setTimeout(() => {
                repo.downloading = false;
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
            if (repo.progressTimer) {
                clearInterval(repo.progressTimer);
                repo.progressTimer = null;
            }
            Editor.Dialog.error(`Failed to download ${repo.name}: ${error.message}`);
        }
    }
    async cancelDownload(repo) {
        if (repo.downloading) {
            if (repo.progressTimer) {
                clearInterval(repo.progressTimer);
                repo.progressTimer = null;
            }
            repo.downloading = false;
            repo.progress = 0;
            console.log('Download canceled:', repo.name);
            const extensionsDir = path.join(Editor.Project.path, 'extensions');
            const targetDir = path.join(extensionsDir, repo.name);
            try {
                if (fs.existsSync(targetDir)) {
                    await fs.remove(targetDir);
                    console.log(`Removed directory: ${targetDir}`);
                }
            }
            catch (err) {
                console.warn(`Failed to remove directory: ${targetDir}`, err);
            }
            Editor.Message.broadcast('scene', 'status-bar:warning', {
                message: `Download canceled: ${repo.name}`
            });
        }
    }
    async downloadFile(url, dest) {
        const file = fs.createWriteStream(dest);
        return new Promise((resolve, reject) => {
            const request = (requestUrl) => {
                https.get(requestUrl, { headers: { 'User-Agent': 'Cocos-Dashboard' } }, (response) => {
                    if (response.statusCode === 301 || response.statusCode === 302) {
                        if (response.headers.location) {
                            console.log(`Redirecting to: ${response.headers.location}`);
                            request(response.headers.location);
                        }
                        else {
                            reject(new Error('Redirect location not found'));
                        }
                        return;
                    }
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download file: ${response.statusCode}`));
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(dest, () => { });
                    reject(err);
                });
            };
            request(url);
        });
    }
    async unzipFile(zipFilePath, targetDir) {
        const { exec } = require('child_process');
        const extractDir = path.join(targetDir, '_temp_extract');
        await fs.ensureDir(extractDir);
        const isWindows = process.platform === 'win32';
        const unzipCommand = isWindows
            ? `powershell -command "Expand-Archive -Path '${zipFilePath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}'"`
            : `unzip "${zipFilePath}" -d "${extractDir}"`;
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
        const extractedItems = await fs.readdir(extractDir);
        let sourceDir = extractDir;
        if (extractedItems.length === 1) {
            const firstItem = path.join(extractDir, extractedItems[0]);
            if ((await fs.stat(firstItem)).isDirectory()) {
                sourceDir = firstItem;
            }
        }
        console.log(`Moving files from ${sourceDir} to ${targetDir}`);
        const files = await fs.readdir(sourceDir);
        for (const file of files) {
            const srcPath = path.join(sourceDir, file);
            const destPath = path.join(targetDir, file);
            console.log(`Moving: ${srcPath} -> ${destPath}`);
            await fs.move(srcPath, destPath, { overwrite: true });
        }
        await fs.remove(extractDir);
        console.log('Removed temp directory:', extractDir);
    }
    async updatePackageJson(targetDir, lastCommit) {
        const packageJsonPath = path.join(targetDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                console.log(`Updating package.json with last_commit info: ${lastCommit}`);
                const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                const packageJson = JSON.parse(packageJsonContent);
                packageJson.last_commit = lastCommit;
                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
                console.log(`Updated package.json with last_commit info`);
            }
            catch (error) {
                console.error('Failed to update package.json:', error);
            }
        }
    }
    async installAndBuild(targetDir) {
        const { exec } = require('child_process');
        const runCommand = (command) => new Promise((resolve) => {
            console.log(`Running ${command}...`);
            exec(command, { cwd: targetDir }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error running ${command}:`, error);
                    console.error(`Stderr:`, stderr);
                }
                else {
                    console.log(`${command} stdout:`, stdout);
                }
                resolve();
            });
        });
        await runCommand('npm install');
        await runCommand('npm run build');
        console.log('Dependencies installed and build completed');
    }
    registerAndEnableExtension(repoName) {
        try {
            let packagePath = Editor.Package.getPath(repoName);
            if (!packagePath) {
                console.log(`Registering extension: ${repoName}`);
                const extensionsDir = (0, path_1.join)(Editor.Project.path, 'extensions', repoName);
                Editor.Package.register(extensionsDir);
                packagePath = extensionsDir;
            }
            else {
                console.log(`Extension ${repoName} is already registered`);
                Editor.Package.register(packagePath);
            }
            console.log(`Enabling extension: ${repoName}`);
            Editor.Package.enable(packagePath);
            console.log(`Extension enabled: ${repoName}`);
        }
        catch (error) {
            console.error('Failed to register or enable extension:', error);
        }
    }
}
exports.GithubService = GithubService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2Uvc2VydmljZXMvZ2l0aHViLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBQy9CLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsK0JBQTRCO0FBVTVCLE1BQWEsYUFBYTtJQUd0QixZQUFZLFNBQXVCO1FBQy9CLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQy9CLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVTtRQUNuQixJQUFJLENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBRTVCLE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOENBQThDLENBQUMsQ0FBQztZQUMxRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRTdDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLElBQUk7aUJBQ3RCLE1BQU0sQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3BELEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFOztnQkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM5QyxPQUFPO29CQUNILElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsSUFBSSxnQkFBZ0I7b0JBQ2pE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UUFBUSx3QkFBd0IsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRSxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBamJELHNDQWliQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcblxuLy8g5a6a5LmJIFZ1ZSDnu4Tku7bnmoTmjqXlj6PvvIzku6Xkvr/nsbvlnovmo4Dmn6VcbmludGVyZmFjZSBWdWVDb21wb25lbnQge1xuICAgIHJlcG9zOiBhbnlbXTtcbiAgICBsb2FkaW5nOiBib29sZWFuO1xuICAgIGVycm9yOiBhbnkgfCBudWxsO1xuICAgIGZldGNoUmVwb3M6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBHaXRodWJTZXJ2aWNlIHtcbiAgICBwcml2YXRlIGNvbXBvbmVudDogVnVlQ29tcG9uZW50O1xuXG4gICAgY29uc3RydWN0b3IoY29tcG9uZW50OiBWdWVDb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGZldGNoUmVwb3MoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBvbmVudC5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmVycm9yID0gbnVsbDtcblxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBFZGl0b3IuTmV0d29yay5nZXQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vdXNlcnMva3NnYW1lczI2L3JlcG9zJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS50b1N0cmluZygpKTtcblxuICAgICAgICAgICAgdGhpcy5jb21wb25lbnQucmVwb3MgPSBkYXRhXG4gICAgICAgICAgICAgICAgLmZpbHRlcigocmVwbzogYW55KSA9PiByZXBvLm5hbWUuc3RhcnRzV2l0aCgnZ2FtZS0nKSlcbiAgICAgICAgICAgICAgICAubWFwKChyZXBvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9OmAsIHJlcG8pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcmVwby5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHJlcG8uZGVzY3JpcHRpb24gfHwgJ05vIGRlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogcmVwby5odG1sX3VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb25lX3VybDogcmVwby5jbG9uZV91cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZTogcmVwby5sYW5ndWFnZSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWNlbnNlOiByZXBvLmxpY2Vuc2U/Lm5hbWUgfHwgJ05vIGxpY2Vuc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZF9hdDogbmV3IERhdGUocmVwby5jcmVhdGVkX2F0KS50b0xvY2FsZURhdGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5ldyBEYXRlKHJlcG8udXBkYXRlZF9hdCkudG9Mb2NhbGVEYXRlU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbW1pdDogcmVwby5wdXNoZWRfYXQgfHwgcmVwby51cGRhdGVkX2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YWxsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzX3VwZGF0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc1RpbWVyOiBudWxsLCAvLyDnlKjkuo7lrZjlgqjlrprml7blmahcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVEZXBlbmRlbmNpZXM6IHt9LCAvLyDmlrDlop7muLjmiI/kvp3otZblrZfmrrVcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llc19sb2FkaW5nOiB0cnVlLCAvLyDkvp3otZbmmK/lkKbmraPlnKjliqDovb1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8g5byC5q2l6I635Y+W5q+P5Liq5LuT5bqT55qEIGdhbWVEZXBlbmRlbmNpZXPvvIzkuI3pmLvloZ5VSVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRmV0Y2hlZCByZXBvc2l0b3JpZXM6JywgdGhpcy5jb21wb25lbnQucmVwb3MpO1xuXG4gICAgICAgICAgICB0aGlzLmZldGNoR2FtZURlcGVuZGVuY2llcygpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNoZWNraW5nIGZvciB1cGRhdGVzLi4uXCIpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNoZWNrSW5zdGFsbGVkUmVwb3MoKTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgdGhpcy5jb21wb25lbnQuZXJyb3IgPSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBmZXRjaCByZXBvc2l0b3JpZXMnLFxuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBmZXRjaEdhbWVEZXBlbmRlbmNpZXMoKSB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzID0gdGhpcy5jb21wb25lbnQucmVwb3MubWFwKGFzeW5jIChyZXBvKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcnRzID0gcmVwby51cmwuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBvd25lciA9IHVybFBhcnRzWzNdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlcG9OYW1lID0gdXJsUGFydHNbNF07XG4gICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUpzb25VcmwgPSBgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tLyR7b3duZXJ9LyR7cmVwb05hbWV9L21hc3Rlci9wYWNrYWdlLmpzb25gO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBFZGl0b3IuTmV0d29yay5nZXQocGFja2FnZUpzb25VcmwpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShyZXNwb25zZS50b1N0cmluZygpKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocGFja2FnZUpzb24uZ2FtZURlcGVuZGVuY2llcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5nYW1lRGVwZW5kZW5jaWVzID0gcGFja2FnZUpzb24uZ2FtZURlcGVuZGVuY2llcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyDlpoLmnpzojrflj5blpLHotKXvvIzliJnkuI3lpITnkIbvvIzkvp3otZbpobnlsIbkuLrnqbpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYENvdWxkIG5vdCBmZXRjaCBwYWNrYWdlLmpzb24gZm9yICR7cmVwby5uYW1lfTpgLCBlcnJvcik7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIC8vIOaXoOiuuuaIkOWKn+S4juWQpu+8jOmDveiuvue9ruWKoOi9veWujOaIkFxuICAgICAgICAgICAgICAgIHJlcG8uZGVwZW5kZW5jaWVzX2xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBjaGVja0luc3RhbGxlZFJlcG9zKCkge1xuICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdleHRlbnNpb25zJyk7XG4gICAgICAgIGZvciAoY29uc3QgcmVwbyBvZiB0aGlzLmNvbXBvbmVudC5yZXBvcykge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RGlyID0gcGF0aC5qb2luKGV4dGVuc2lvbnNEaXIsIHJlcG8ubmFtZSk7XG4gICAgICAgICAgICByZXBvLmluc3RhbGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmVwby5oYXNfdXBkYXRlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldERpcikpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJDb250ZW50cyA9IGF3YWl0IGZzLnJlYWRkaXIodGFyZ2V0RGlyKTtcbiAgICAgICAgICAgICAgICBpZiAoZGlyQ29udGVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBkaXJlY3RvcnkgZXhpc3RzIGJ1dCBpcyBlbXB0eSAtIG5vdCBjb25zaWRlcmVkIGluc3RhbGxlZGApO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9IGRpcmVjdG9yeSBleGlzdHMgYnV0IGhhcyBubyBwYWNrYWdlLmpzb24gLSBub3QgY29uc2lkZXJlZCBpbnN0YWxsZWRgKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9IGlzIGluc3RhbGxlZGApO1xuICAgICAgICAgICAgICAgIHJlcG8uaW5zdGFsbGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbExhc3RDb21taXQgPSBwYWNrYWdlSnNvbi5sYXN0X2NvbW1pdDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxMYXN0Q29tbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IC0gTG9jYWwgbGFzdCBjb21taXQ6ICR7bG9jYWxMYXN0Q29tbWl0fSwgUmVtb3RlIGxhc3QgY29tbWl0OiAke3JlcG8ubGFzdF9jb21taXR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERhdGUgPSBuZXcgRGF0ZShsb2NhbExhc3RDb21taXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3RlRGF0ZSA9IG5ldyBEYXRlKHJlcG8ubGFzdF9jb21taXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5oYXNfdXBkYXRlID0gcmVtb3RlRGF0ZSA+IGxvY2FsRGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3JlcG8ubmFtZX0gaGFzIHVwZGF0ZTogJHtyZXBvLmhhc191cGRhdGV9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IC0gTm8gbGFzdF9jb21taXQgZm91bmQgaW4gcGFja2FnZS5qc29uLCB1c2luZyBmaWxlIHN0YXRzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQocGFja2FnZUpzb25QYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsTGFzdE1vZGlmaWVkID0gbmV3IERhdGUoc3RhdHMubXRpbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3RlTGFzdENvbW1pdCA9IG5ldyBEYXRlKHJlcG8ubGFzdF9jb21taXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5oYXNfdXBkYXRlID0gbG9jYWxMYXN0TW9kaWZpZWQgPCByZW1vdGVMYXN0Q29tbWl0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSAtIExvY2FsIG1vZGlmaWVkOiAke2xvY2FsTGFzdE1vZGlmaWVkfSwgUmVtb3RlIGNvbW1pdDogJHtyZW1vdGVMYXN0Q29tbWl0fWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSBoYXMgdXBkYXRlOiAke3JlcG8uaGFzX3VwZGF0ZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBjaGVjayBmb3IgdXBkYXRlcyBmb3IgJHtyZXBvLm5hbWV9OmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBpcyBub3QgaW5zdGFsbGVkYCk7XG4gICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyByZXRyeSgpIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnQuZmV0Y2hSZXBvcygpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBvbkRvd25sb2FkQ2xpY2socmVwbzogYW55KSB7XG4gICAgICAgIGlmIChyZXBvLmRvd25sb2FkaW5nKSByZXR1cm47XG5cbiAgICAgICAgLy8g5aaC5p6c5L6d6LWW5LuN5Zyo5YiG5p6Q5Lit77yM5o+Q56S655So5oi356iN5ZCOXG4gICAgICAgIGlmIChyZXBvLmRlcGVuZGVuY2llc19sb2FkaW5nKSB7XG4gICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmluZm8oJ+ato+WcqOWIhuaekOS+nei1lumhue+8jOivt+eojeWQjumHjeivleOAgicsIHtcbiAgICAgICAgICAgICAgICBidXR0b25zOiBbJ+WlveeahCddLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAn6K+356iN5YCZJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVwby5pbnN0YWxsZWQgJiYgcmVwby5oYXNfdXBkYXRlKSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuRGlhbG9nLmluZm8oYCR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IGluc3RhbGxlZCBidXQgaGFzIHVwZGF0ZXMuIERvIHlvdSB3YW50IHRvIHVwZGF0ZSBpdD9gLCB7XG4gICAgICAgICAgICAgICAgYnV0dG9uczogWydjb25maXJtJywgJ2NhbmNlbCddLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnVXBkYXRlIFJlcG9zaXRvcnknLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRGlhbG9nIHJlc3VsdDonLCByZXN1bHQpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXNwb25zZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZG93bmxvYWRSZXBvKHJlcG8sIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlcG8uaW5zdGFsbGVkICYmICFyZXBvLmhhc191cGRhdGUpIHtcbiAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbyhgJHtyZXBvLm5hbWV9IGlzIGFscmVhZHkgaW5zdGFsbGVkIGFuZCB1cCB0byBkYXRlLmAsIHtcbiAgICAgICAgICAgICAgICBidXR0b25zOiBbJ29rJ10sXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdSZXBvc2l0b3J5IEluc3RhbGxlZCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZG93bmxvYWRSZXBvKHJlcG8pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGRvd25sb2FkUmVwbyhyZXBvOiBhbnksIGlzVXBkYXRlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IGRvd25sb2FkaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coYCR7aXNVcGRhdGUgPyAnVXBkYXRpbmcnIDogJ0Rvd25sb2FkaW5nJ30gcmVwb3NpdG9yeTpgLCByZXBvKTtcbiAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IHRydWU7XG4gICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDmo4Dmn6XlubbkuIvovb3kvp3otZbpoblcbiAgICAgICAgICAgIGlmIChyZXBvLmdhbWVEZXBlbmRlbmNpZXMgJiYgT2JqZWN0LmtleXMocmVwby5nYW1lRGVwZW5kZW5jaWVzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYENoZWNraW5nIGRlcGVuZGVuY2llcyBmb3IgJHtyZXBvLm5hbWV9Li4uYCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBkZXBOYW1lIGluIHJlcG8uZ2FtZURlcGVuZGVuY2llcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXBSZXBvID0gdGhpcy5jb21wb25lbnQucmVwb3MuZmluZChyID0+IHIubmFtZSA9PT0gZGVwTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXBSZXBvICYmICFkZXBSZXBvLmluc3RhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYERlcGVuZGVuY3kgJHtkZXBOYW1lfSBpcyBub3QgaW5zdGFsbGVkLiBEb3dubG9hZGluZyBpdCBmaXJzdC4uLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLlRhc2suYWRkTm90aWNlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJEb3dubG9hZGluZyBEZXBlbmRlbmN5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYERvd25sb2FkaW5nIGRlcGVuZGVuY3kgZm9yICR7cmVwby5uYW1lfTogJHtkZXBOYW1lfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcIkdhbWUgRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJsb2dcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kb3dubG9hZFJlcG8oZGVwUmVwbywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdleHRlbnNpb25zJyk7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXREaXIgPSBwYXRoLmpvaW4oZXh0ZW5zaW9uc0RpciwgcmVwby5uYW1lKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUYXJnZXQgZGlyZWN0b3J5OiAke3RhcmdldERpcn1gKTtcblxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0RGlyKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUYXJnZXQgZGlyZWN0b3J5IGV4aXN0cywgcmVtb3Zpbmc6ICR7dGFyZ2V0RGlyfWApO1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZSh0YXJnZXREaXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgZnMuZW5zdXJlRGlyKHRhcmdldERpcik7XG5cbiAgICAgICAgICAgIGNvbnN0IHVybFBhcnRzID0gcmVwby51cmwuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGNvbnN0IG93bmVyID0gdXJsUGFydHNbM107XG4gICAgICAgICAgICBjb25zdCByZXBvTmFtZSA9IHVybFBhcnRzWzRdO1xuICAgICAgICAgICAgY29uc3QgemlwVXJsID0gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke293bmVyfS8ke3JlcG9OYW1lfS9hcmNoaXZlL3JlZnMvaGVhZHMvbWFzdGVyLnppcGA7XG4gICAgICAgICAgICBjb25zdCB6aXBGaWxlUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsICdyZXBvLnppcCcpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYE93bmVyOiAke293bmVyfSwgUmVwbzogJHtyZXBvTmFtZX1gKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZGluZyBaSVAgZnJvbTogJHt6aXBVcmx9YCk7XG5cbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAxMDtcbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3NUaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzcyA8IDk1KSByZXBvLnByb2dyZXNzICs9IDU7XG4gICAgICAgICAgICB9LCA1MDApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkRmlsZSh6aXBVcmwsIHppcEZpbGVQYXRoKTtcblxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChyZXBvLnByb2dyZXNzVGltZXIpO1xuICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSA5MDtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0V4dHJhY3RpbmcgWklQIGZpbGU6JywgemlwRmlsZVBhdGgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51bnppcEZpbGUoemlwRmlsZVBhdGgsIHRhcmdldERpcik7XG4gICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUoemlwRmlsZVBhdGgpO1xuXG4gICAgICAgICAgICByZXBvLnByb2dyZXNzID0gOTU7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGFja2FnZUpzb24odGFyZ2V0RGlyLCByZXBvLmxhc3RfY29tbWl0KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuaW5zdGFsbEFuZEJ1aWxkKHRhcmdldERpcik7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyQW5kRW5hYmxlRXh0ZW5zaW9uKHJlcG8ubmFtZSk7XG5cbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAxMDA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGRvd25sb2FkZWQgJHtyZXBvLm5hbWV9IHRvICR7dGFyZ2V0RGlyfWApO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXBvLmRvd25sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlcG8uaGFzX3VwZGF0ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIEVkaXRvci5UYXNrLmFkZE5vdGljZSh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkXCIsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgZG93bmxvYWRlZDogJHtyZXBvLm5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcIkdhbWUgRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRG93bmxvYWQgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgIHJlcG8uZG93bmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChyZXBvLnByb2dyZXNzVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHJlcG8ucHJvZ3Jlc3NUaW1lcik7XG4gICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCAke3JlcG8ubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWxEb3dubG9hZChyZXBvOiBhbnkpIHtcbiAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICAgIGlmIChyZXBvLnByb2dyZXNzVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHJlcG8ucHJvZ3Jlc3NUaW1lcik7XG4gICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgcmVwby5wcm9ncmVzcyA9IDA7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCBjYW5jZWxlZDonLCByZXBvLm5hbWUpO1xuXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdleHRlbnNpb25zJyk7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXREaXIgPSBwYXRoLmpvaW4oZXh0ZW5zaW9uc0RpciwgcmVwby5uYW1lKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZSh0YXJnZXREaXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVtb3ZlZCBkaXJlY3Rvcnk6ICR7dGFyZ2V0RGlyfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRmFpbGVkIHRvIHJlbW92ZSBkaXJlY3Rvcnk6ICR7dGFyZ2V0RGlyfWAsIGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLmJyb2FkY2FzdCgnc2NlbmUnLCAnc3RhdHVzLWJhcjp3YXJuaW5nJywge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBEb3dubG9hZCBjYW5jZWxlZDogJHtyZXBvLm5hbWV9YFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRvd25sb2FkRmlsZSh1cmw6IHN0cmluZywgZGVzdDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSAocmVxdWVzdFVybDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaHR0cHMuZ2V0KHJlcXVlc3RVcmwsIHsgaGVhZGVyczogeyAnVXNlci1BZ2VudCc6ICdDb2Nvcy1EYXNoYm9hcmQnIH0gfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDEgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMzAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZWRpcmVjdGluZyB0bzogJHtyZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9ufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QocmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1JlZGlyZWN0IGxvY2F0aW9uIG5vdCBmb3VuZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBGYWlsZWQgdG8gZG93bmxvYWQgZmlsZTogJHtyZXNwb25zZS5zdGF0dXNDb2RlfWApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5waXBlKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBmaWxlLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZnMudW5saW5rKGRlc3QsICgpID0+IHsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlcXVlc3QodXJsKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1bnppcEZpbGUoemlwRmlsZVBhdGg6IHN0cmluZywgdGFyZ2V0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgICAgIGNvbnN0IGV4dHJhY3REaXIgPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAnX3RlbXBfZXh0cmFjdCcpO1xuICAgICAgICBhd2FpdCBmcy5lbnN1cmVEaXIoZXh0cmFjdERpcik7XG5cbiAgICAgICAgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcbiAgICAgICAgY29uc3QgdW56aXBDb21tYW5kID0gaXNXaW5kb3dzXG4gICAgICAgICAgICA/IGBwb3dlcnNoZWxsIC1jb21tYW5kIFwiRXhwYW5kLUFyY2hpdmUgLVBhdGggJyR7emlwRmlsZVBhdGgucmVwbGFjZSgvJy9nLCBcIicnXCIpfScgLURlc3RpbmF0aW9uUGF0aCAnJHtleHRyYWN0RGlyLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nXCJgXG4gICAgICAgICAgICA6IGB1bnppcCBcIiR7emlwRmlsZVBhdGh9XCIgLWQgXCIke2V4dHJhY3REaXJ9XCJgO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdFeGVjdXRpbmcgdW56aXAgY29tbWFuZDonLCB1bnppcENvbW1hbmQpO1xuXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGV4ZWModW56aXBDb21tYW5kLCAoZXJyb3I6IGFueSwgc3Rkb3V0OiBzdHJpbmcsIHN0ZGVycjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuemlwIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU3RkZXJyOicsIHN0ZGVycik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBleHRyYWN0IFpJUDogJHtlcnJvci5tZXNzYWdlfWApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW56aXAgc3Rkb3V0OicsIHN0ZG91dCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RlZEl0ZW1zID0gYXdhaXQgZnMucmVhZGRpcihleHRyYWN0RGlyKTtcbiAgICAgICAgbGV0IHNvdXJjZURpciA9IGV4dHJhY3REaXI7XG4gICAgICAgIGlmIChleHRyYWN0ZWRJdGVtcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0SXRlbSA9IHBhdGguam9pbihleHRyYWN0RGlyLCBleHRyYWN0ZWRJdGVtc1swXSk7XG4gICAgICAgICAgICBpZiAoKGF3YWl0IGZzLnN0YXQoZmlyc3RJdGVtKSkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIHNvdXJjZURpciA9IGZpcnN0SXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhgTW92aW5nIGZpbGVzIGZyb20gJHtzb3VyY2VEaXJ9IHRvICR7dGFyZ2V0RGlyfWApO1xuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VEaXIpO1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHNyY1BhdGggPSBwYXRoLmpvaW4oc291cmNlRGlyLCBmaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgZmlsZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgTW92aW5nOiAke3NyY1BhdGh9IC0+ICR7ZGVzdFBhdGh9YCk7XG4gICAgICAgICAgICBhd2FpdCBmcy5tb3ZlKHNyY1BhdGgsIGRlc3RQYXRoLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBmcy5yZW1vdmUoZXh0cmFjdERpcik7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZW1vdmVkIHRlbXAgZGlyZWN0b3J5OicsIGV4dHJhY3REaXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFja2FnZUpzb24odGFyZ2V0RGlyOiBzdHJpbmcsIGxhc3RDb21taXQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVwZGF0aW5nIHBhY2thZ2UuanNvbiB3aXRoIGxhc3RfY29tbWl0IGluZm86ICR7bGFzdENvbW1pdH1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIHBhY2thZ2VKc29uLmxhc3RfY29tbWl0ID0gbGFzdENvbW1pdDtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy53cml0ZUZpbGUocGFja2FnZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMiksICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGVkIHBhY2thZ2UuanNvbiB3aXRoIGxhc3RfY29tbWl0IGluZm9gKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBwYWNrYWdlLmpzb246JywgZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbnN0YWxsQW5kQnVpbGQodGFyZ2V0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgICAgIGNvbnN0IHJ1bkNvbW1hbmQgPSAoY29tbWFuZDogc3RyaW5nKSA9PiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFJ1bm5pbmcgJHtjb21tYW5kfS4uLmApO1xuICAgICAgICAgICAgZXhlYyhjb21tYW5kLCB7IGN3ZDogdGFyZ2V0RGlyIH0sIChlcnJvcjogYW55LCBzdGRvdXQ6IHN0cmluZywgc3RkZXJyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcnVubmluZyAke2NvbW1hbmR9OmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgU3RkZXJyOmAsIHN0ZGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7Y29tbWFuZH0gc3Rkb3V0OmAsIHN0ZG91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBhd2FpdCBydW5Db21tYW5kKCducG0gaW5zdGFsbCcpO1xuICAgICAgICBhd2FpdCBydW5Db21tYW5kKCducG0gcnVuIGJ1aWxkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdEZXBlbmRlbmNpZXMgaW5zdGFsbGVkIGFuZCBidWlsZCBjb21wbGV0ZWQnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZ2lzdGVyQW5kRW5hYmxlRXh0ZW5zaW9uKHJlcG9OYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBwYWNrYWdlUGF0aCA9IEVkaXRvci5QYWNrYWdlLmdldFBhdGgocmVwb05hbWUpO1xuICAgICAgICAgICAgaWYgKCFwYWNrYWdlUGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZWdpc3RlcmluZyBleHRlbnNpb246ICR7cmVwb05hbWV9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0RpciA9IGpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ2V4dGVuc2lvbnMnLCByZXBvTmFtZSk7XG4gICAgICAgICAgICAgICAgRWRpdG9yLlBhY2thZ2UucmVnaXN0ZXIoZXh0ZW5zaW9uc0Rpcik7XG4gICAgICAgICAgICAgICAgcGFja2FnZVBhdGggPSBleHRlbnNpb25zRGlyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXh0ZW5zaW9uICR7cmVwb05hbWV9IGlzIGFscmVhZHkgcmVnaXN0ZXJlZGApO1xuICAgICAgICAgICAgICAgIEVkaXRvci5QYWNrYWdlLnJlZ2lzdGVyKHBhY2thZ2VQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBFbmFibGluZyBleHRlbnNpb246ICR7cmVwb05hbWV9YCk7XG4gICAgICAgICAgICBFZGl0b3IuUGFja2FnZS5lbmFibGUocGFja2FnZVBhdGgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYEV4dGVuc2lvbiBlbmFibGVkOiAke3JlcG9OYW1lfWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlZ2lzdGVyIG9yIGVuYWJsZSBleHRlbnNpb246JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19