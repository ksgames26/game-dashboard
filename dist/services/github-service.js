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
                    releases: [], // 存储 release 版本列表
                    releases_loading: true, // release 版本是否正在加载
                    selectedVersion: 'master', // 当前选择的版本，默认为 master
                };
            });
            // 异步获取每个仓库的 gameDependencies 和 releases，不阻塞UI
            console.log('Fetched repositories:', this.component.repos);
            this.fetchGameDependencies();
            this.fetchRepositoryReleases();
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
    async fetchRepositoryReleases() {
        const promises = this.component.repos.map(async (repo) => {
            try {
                const urlParts = repo.url.split('/');
                const owner = urlParts[3];
                const repoName = urlParts[4];
                const releasesUrl = `https://api.github.com/repos/${owner}/${repoName}/releases`;
                console.log(`Fetching releases for ${repo.name} from: ${releasesUrl}`);
                const response = await Editor.Network.get(releasesUrl);
                if (response) {
                    const releases = JSON.parse(response.toString());
                    if (Array.isArray(releases) && releases.length > 0) {
                        // 处理 releases 数据，只保留需要的信息
                        repo.releases = releases.map(release => ({
                            tag_name: release.tag_name,
                            name: release.name || release.tag_name,
                            published_at: new Date(release.published_at).toLocaleDateString(),
                            prerelease: release.prerelease,
                            draft: release.draft
                        })).filter(release => !release.draft); // 过滤掉草稿版本
                        // 如果有正式版本，默认选择最新的正式版本
                        const stableReleases = repo.releases.filter((r) => !r.prerelease);
                        if (stableReleases.length > 0) {
                            repo.selectedVersion = stableReleases[0].tag_name;
                        }
                        else if (repo.releases.length > 0) {
                            // 如果没有正式版本但有预发布版本，选择最新的预发布版本
                            repo.selectedVersion = repo.releases[0].tag_name;
                        }
                        console.log(`Found ${repo.releases.length} releases for ${repo.name}`);
                    }
                    else {
                        console.log(`No releases found for ${repo.name}, using master branch`);
                        repo.releases = [];
                        repo.selectedVersion = 'master';
                    }
                }
            }
            catch (error) {
                console.warn(`Could not fetch releases for ${repo.name}:`, error);
                repo.releases = [];
                repo.selectedVersion = 'master';
            }
            finally {
                repo.releases_loading = false;
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
    updateSelectedVersion(repo, version) {
        repo.selectedVersion = version;
        console.log(`Updated ${repo.name} selected version to: ${version}`);
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
                if (repo.selectedVersion === 'master') {
                    await this.downloadRepo(repo, true);
                }
                else {
                    await this.downloadRepoWithVersion(repo, repo.selectedVersion, true);
                }
            }
        }
        else if (repo.installed && !repo.has_update) {
            Editor.Dialog.info(`${repo.name} is already installed and up to date.`, {
                buttons: ['ok'],
                title: 'Repository Installed',
            });
        }
        else {
            if (repo.selectedVersion === 'master') {
                await this.downloadRepo(repo);
            }
            else {
                await this.downloadRepoWithVersion(repo, repo.selectedVersion, false);
            }
        }
    }
    async downloadRepoWithVersion(repo, version, isUpdate = false) {
        if (repo.downloading) {
            console.log(`Repository ${repo.name} is already downloading.`);
            return;
        }
        console.log(`${isUpdate ? 'Updating' : 'Downloading'} repository ${repo.name} version ${version}`);
        repo.downloading = true;
        repo.progress = 0;
        try {
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
            // 首先尝试从 GitHub Releases 下载指定版本
            let zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/tags/${version}.zip`;
            let zipFilePath = path.join(targetDir, 'repo.zip');
            console.log(`Owner: ${owner}, Repo: ${repoName}, Version: ${version}`);
            console.log(`Attempting to download from GitHub Releases: ${zipUrl}`);
            repo.progress = 10;
            repo.progressTimer = setInterval(() => {
                if (repo.progress < 50)
                    repo.progress += 5;
            }, 500);
            try {
                await this.downloadFile(zipUrl, zipFilePath);
                console.log(`Successfully downloaded ${version} from GitHub Releases`);
            }
            catch (releaseError) {
                console.warn(`Failed to download from releases, trying master branch:`, releaseError);
                // 如果从 releases 下载失败，回退到 master 分支
                zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
                console.log(`Downloading from master branch: ${zipUrl}`);
                await this.downloadFile(zipUrl, zipFilePath);
            }
            clearInterval(repo.progressTimer);
            repo.progressTimer = null;
            repo.progress = 50;
            console.log('Extracting ZIP file:', zipFilePath);
            await this.unzipFile(zipFilePath, targetDir);
            await fs.remove(zipFilePath);
            repo.progress = 60;
            // 从本地读取 gameDependencies 并下载依赖项
            const localGameDependencies = await this.readLocalGameDependencies(targetDir);
            if (localGameDependencies && Object.keys(localGameDependencies).length > 0) {
                console.log(`Found local dependencies for ${repo.name}:`, localGameDependencies);
                for (const depName in localGameDependencies) {
                    const depVersion = localGameDependencies[depName];
                    const depRepo = this.component.repos.find(r => r.name === depName);
                    if (depRepo && !depRepo.installed) {
                        console.log(`Dependency ${depName} version ${depVersion} is not installed. Downloading it first...`);
                        Editor.Task.addNotice({
                            title: "Downloading Dependency",
                            message: `Downloading dependency for ${repo.name}: ${depName} (${depVersion})`,
                            source: "Game Dashboard",
                            type: "log",
                        });
                        await this.downloadRepoWithVersion(depRepo, depVersion, false);
                    }
                }
            }
            repo.progress = 90;
            await this.updatePackageJson(targetDir, repo.last_commit);
            await this.installAndBuild(targetDir);
            this.registerAndEnableExtension(repo.name);
            repo.progress = 100;
            console.log(`Successfully downloaded ${repo.name} version ${version} to ${targetDir}`);
            setTimeout(() => {
                repo.downloading = false;
                repo.installed = true;
                repo.has_update = false;
                Editor.Task.addNotice({
                    title: "Successfully downloaded",
                    message: `Successfully downloaded: ${repo.name} (${version})`,
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
            Editor.Dialog.error(`Failed to download ${repo.name} version ${version}: ${error.message}`);
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
                    const depVersion = repo.gameDependencies[depName];
                    const depRepo = this.component.repos.find(r => r.name === depName);
                    if (depRepo && !depRepo.installed) {
                        console.log(`Dependency ${depName} version ${depVersion} is not installed. Downloading it first...`);
                        Editor.Task.addNotice({
                            title: "Downloading Dependency",
                            message: `Downloading dependency for ${repo.name}: ${depName} (${depVersion})`,
                            source: "Game Dashboard",
                            type: "log",
                        });
                        await this.downloadRepoWithVersion(depRepo, depVersion, false);
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
            // 根据选择的版本确定下载URL
            let zipUrl;
            if (repo.selectedVersion === 'master') {
                zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
            }
            else {
                zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/tags/${repo.selectedVersion}.zip`;
            }
            const zipFilePath = path.join(targetDir, 'repo.zip');
            console.log(`Owner: ${owner}, Repo: ${repoName}, Version: ${repo.selectedVersion}`);
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
    // 读取本地 package.json 中的 gameDependencies
    async readLocalGameDependencies(extensionDir) {
        try {
            // 查找解压后的目录，通常是 {repo-name}-{branch}
            const items = await fs.readdir(extensionDir);
            let actualDir = extensionDir;
            for (const item of items) {
                const itemPath = path.join(extensionDir, item);
                const stat = await fs.stat(itemPath);
                if (stat.isDirectory()) {
                    // 检查这个目录是否包含 package.json
                    const packageJsonPath = path.join(itemPath, 'package.json');
                    if (await fs.pathExists(packageJsonPath)) {
                        actualDir = itemPath;
                        break;
                    }
                }
            }
            const packageJsonPath = path.join(actualDir, 'package.json');
            if (await fs.pathExists(packageJsonPath)) {
                const packageContent = await fs.readJson(packageJsonPath);
                console.log(`Reading local package.json from ${packageJsonPath}`);
                return packageContent.gameDependencies || {};
            }
            else {
                console.log(`No package.json found at ${packageJsonPath}`);
                return {};
            }
        }
        catch (error) {
            console.error('Error reading local gameDependencies:', error);
            return {};
        }
    }
}
exports.GithubService = GithubService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2Uvc2VydmljZXMvZ2l0aHViLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBQy9CLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsK0JBQTRCO0FBVTVCLE1BQWEsYUFBYTtJQUd0QixZQUFZLFNBQXVCO1FBQy9CLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQy9CLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVTtRQUNuQixJQUFJLENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBRTVCLE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOENBQThDLENBQUMsQ0FBQztZQUMxRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRTdDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLElBQUk7aUJBQ3RCLE1BQU0sQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3BELEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFOztnQkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM5QyxPQUFPO29CQUNILElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsSUFBSSxnQkFBZ0I7b0JBQ2pE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QzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLGVBQWUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLE9BQU8sY0FBYyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQztZQUNqRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsZUFBZSxFQUFFLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxFQUFFLENBQUM7WUFDZCxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlELE9BQU8sRUFBRSxDQUFDO1FBQ2QsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQS9vQkQsc0NBK29CQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcblxuLy8g5a6a5LmJIFZ1ZSDnu4Tku7bnmoTmjqXlj6PvvIzku6Xkvr/nsbvlnovmo4Dmn6VcbmludGVyZmFjZSBWdWVDb21wb25lbnQge1xuICAgIHJlcG9zOiBhbnlbXTtcbiAgICBsb2FkaW5nOiBib29sZWFuO1xuICAgIGVycm9yOiBhbnkgfCBudWxsO1xuICAgIGZldGNoUmVwb3M6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBHaXRodWJTZXJ2aWNlIHtcbiAgICBwcml2YXRlIGNvbXBvbmVudDogVnVlQ29tcG9uZW50O1xuXG4gICAgY29uc3RydWN0b3IoY29tcG9uZW50OiBWdWVDb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGZldGNoUmVwb3MoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBvbmVudC5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmVycm9yID0gbnVsbDtcblxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBFZGl0b3IuTmV0d29yay5nZXQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vdXNlcnMva3NnYW1lczI2L3JlcG9zJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS50b1N0cmluZygpKTtcblxuICAgICAgICAgICAgdGhpcy5jb21wb25lbnQucmVwb3MgPSBkYXRhXG4gICAgICAgICAgICAgICAgLmZpbHRlcigocmVwbzogYW55KSA9PiByZXBvLm5hbWUuc3RhcnRzV2l0aCgnZ2FtZS0nKSlcbiAgICAgICAgICAgICAgICAubWFwKChyZXBvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9OmAsIHJlcG8pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcmVwby5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHJlcG8uZGVzY3JpcHRpb24gfHwgJ05vIGRlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogcmVwby5odG1sX3VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb25lX3VybDogcmVwby5jbG9uZV91cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZTogcmVwby5sYW5ndWFnZSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWNlbnNlOiByZXBvLmxpY2Vuc2U/Lm5hbWUgfHwgJ05vIGxpY2Vuc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZF9hdDogbmV3IERhdGUocmVwby5jcmVhdGVkX2F0KS50b0xvY2FsZURhdGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5ldyBEYXRlKHJlcG8udXBkYXRlZF9hdCkudG9Mb2NhbGVEYXRlU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbW1pdDogcmVwby5wdXNoZWRfYXQgfHwgcmVwby51cGRhdGVkX2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YWxsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzX3VwZGF0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc1RpbWVyOiBudWxsLCAvLyDnlKjkuo7lrZjlgqjlrprml7blmahcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVEZXBlbmRlbmNpZXM6IHt9LCAvLyDmlrDlop7muLjmiI/kvp3otZblrZfmrrVcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llc19sb2FkaW5nOiB0cnVlLCAvLyDkvp3otZbmmK/lkKbmraPlnKjliqDovb1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VzOiBbXSwgLy8g5a2Y5YKoIHJlbGVhc2Ug54mI5pys5YiX6KGoXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlc19sb2FkaW5nOiB0cnVlLCAvLyByZWxlYXNlIOeJiOacrOaYr+WQpuato+WcqOWKoOi9vVxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRWZXJzaW9uOiAnbWFzdGVyJywgLy8g5b2T5YmN6YCJ5oup55qE54mI5pys77yM6buY6K6k5Li6IG1hc3RlclxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyDlvILmraXojrflj5bmr4/kuKrku5PlupPnmoQgZ2FtZURlcGVuZGVuY2llcyDlkowgcmVsZWFzZXPvvIzkuI3pmLvloZ5VSVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZldGNoZWQgcmVwb3NpdG9yaWVzOicsIHRoaXMuY29tcG9uZW50LnJlcG9zKTtcblxuICAgICAgICAgICAgdGhpcy5mZXRjaEdhbWVEZXBlbmRlbmNpZXMoKTtcbiAgICAgICAgICAgIHRoaXMuZmV0Y2hSZXBvc2l0b3J5UmVsZWFzZXMoKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDaGVja2luZyBmb3IgdXBkYXRlcy4uLlwiKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5jaGVja0luc3RhbGxlZFJlcG9zKCk7XG4gICAgICAgICAgICB0aGlzLmNvbXBvbmVudC5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmVycm9yID0ge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gZmV0Y2ggcmVwb3NpdG9yaWVzJyxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmNvbXBvbmVudC5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2hHYW1lRGVwZW5kZW5jaWVzKCkge1xuICAgICAgICBjb25zdCBwcm9taXNlcyA9IHRoaXMuY29tcG9uZW50LnJlcG9zLm1hcChhc3luYyAocmVwbykgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHJlcG8udXJsLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3duZXIgPSB1cmxQYXJ0c1szXTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXBvTmFtZSA9IHVybFBhcnRzWzRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uVXJsID0gYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS8ke293bmVyfS8ke3JlcG9OYW1lfS9tYXN0ZXIvcGFja2FnZS5qc29uYDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgRWRpdG9yLk5ldHdvcmsuZ2V0KHBhY2thZ2VKc29uVXJsKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UudG9TdHJpbmcoKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhY2thZ2VKc29uLmdhbWVEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8uZ2FtZURlcGVuZGVuY2llcyA9IHBhY2thZ2VKc29uLmdhbWVEZXBlbmRlbmNpZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8g5aaC5p6c6I635Y+W5aSx6LSl77yM5YiZ5LiN5aSE55CG77yM5L6d6LWW6aG55bCG5Li656m6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBDb3VsZCBub3QgZmV0Y2ggcGFja2FnZS5qc29uIGZvciAke3JlcG8ubmFtZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAvLyDml6DorrrmiJDlip/kuI7lkKbvvIzpg73orr7nva7liqDovb3lrozmiJBcbiAgICAgICAgICAgICAgICByZXBvLmRlcGVuZGVuY2llc19sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2hSZXBvc2l0b3J5UmVsZWFzZXMoKSB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzID0gdGhpcy5jb21wb25lbnQucmVwb3MubWFwKGFzeW5jIChyZXBvKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcnRzID0gcmVwby51cmwuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBvd25lciA9IHVybFBhcnRzWzNdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlcG9OYW1lID0gdXJsUGFydHNbNF07XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsZWFzZXNVcmwgPSBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke293bmVyfS8ke3JlcG9OYW1lfS9yZWxlYXNlc2A7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRmV0Y2hpbmcgcmVsZWFzZXMgZm9yICR7cmVwby5uYW1lfSBmcm9tOiAke3JlbGVhc2VzVXJsfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgRWRpdG9yLk5ldHdvcmsuZ2V0KHJlbGVhc2VzVXJsKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZWFzZXMgPSBKU09OLnBhcnNlKHJlc3BvbnNlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsZWFzZXMpICYmIHJlbGVhc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWkhOeQhiByZWxlYXNlcyDmlbDmja7vvIzlj6rkv53nlZnpnIDopoHnmoTkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG8ucmVsZWFzZXMgPSByZWxlYXNlcy5tYXAocmVsZWFzZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19uYW1lOiByZWxlYXNlLnRhZ19uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHJlbGVhc2UubmFtZSB8fCByZWxlYXNlLnRhZ19uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hlZF9hdDogbmV3IERhdGUocmVsZWFzZS5wdWJsaXNoZWRfYXQpLnRvTG9jYWxlRGF0ZVN0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXJlbGVhc2U6IHJlbGVhc2UucHJlcmVsZWFzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFmdDogcmVsZWFzZS5kcmFmdFxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpLmZpbHRlcihyZWxlYXNlID0+ICFyZWxlYXNlLmRyYWZ0KTsgLy8g6L+H5ruk5o6J6I2J56i/54mI5pysXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOacieato+W8j+eJiOacrO+8jOm7mOiupOmAieaLqeacgOaWsOeahOato+W8j+eJiOacrFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhYmxlUmVsZWFzZXMgPSByZXBvLnJlbGVhc2VzLmZpbHRlcigocjphbnkpID0+ICFyLnByZXJlbGVhc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YWJsZVJlbGVhc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnNlbGVjdGVkVmVyc2lvbiA9IHN0YWJsZVJlbGVhc2VzWzBdLnRhZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXBvLnJlbGVhc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmsqHmnInmraPlvI/niYjmnKzkvYbmnInpooTlj5HluIPniYjmnKzvvIzpgInmi6nmnIDmlrDnmoTpooTlj5HluIPniYjmnKxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvLnNlbGVjdGVkVmVyc2lvbiA9IHJlcG8ucmVsZWFzZXNbMF0udGFnX25hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke3JlcG8ucmVsZWFzZXMubGVuZ3RofSByZWxlYXNlcyBmb3IgJHtyZXBvLm5hbWV9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgTm8gcmVsZWFzZXMgZm91bmQgZm9yICR7cmVwby5uYW1lfSwgdXNpbmcgbWFzdGVyIGJyYW5jaGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5yZWxlYXNlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwby5zZWxlY3RlZFZlcnNpb24gPSAnbWFzdGVyJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBDb3VsZCBub3QgZmV0Y2ggcmVsZWFzZXMgZm9yICR7cmVwby5uYW1lfTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVwby5yZWxlYXNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIHJlcG8uc2VsZWN0ZWRWZXJzaW9uID0gJ21hc3Rlcic7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlcG8ucmVsZWFzZXNfbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNoZWNrSW5zdGFsbGVkUmVwb3MoKSB7XG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbnNEaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ2V4dGVuc2lvbnMnKTtcbiAgICAgICAgZm9yIChjb25zdCByZXBvIG9mIHRoaXMuY29tcG9uZW50LnJlcG9zKSB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXREaXIgPSBwYXRoLmpvaW4oZXh0ZW5zaW9uc0RpciwgcmVwby5uYW1lKTtcbiAgICAgICAgICAgIHJlcG8uaW5zdGFsbGVkID0gZmFsc2U7XG4gICAgICAgICAgICByZXBvLmhhc191cGRhdGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0RGlyKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpckNvbnRlbnRzID0gYXdhaXQgZnMucmVhZGRpcih0YXJnZXREaXIpO1xuICAgICAgICAgICAgICAgIGlmIChkaXJDb250ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9IGRpcmVjdG9yeSBleGlzdHMgYnV0IGlzIGVtcHR5IC0gbm90IGNvbnNpZGVyZWQgaW5zdGFsbGVkYCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVwb3NpdG9yeSAke3JlcG8ubmFtZX0gZGlyZWN0b3J5IGV4aXN0cyBidXQgaGFzIG5vIHBhY2thZ2UuanNvbiAtIG5vdCBjb25zaWRlcmVkIGluc3RhbGxlZGApO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVwb3NpdG9yeSAke3JlcG8ubmFtZX0gaXMgaW5zdGFsbGVkYCk7XG4gICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHBhY2thZ2VKc29uQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsTGFzdENvbW1pdCA9IHBhY2thZ2VKc29uLmxhc3RfY29tbWl0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NhbExhc3RDb21taXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3JlcG8ubmFtZX0gLSBMb2NhbCBsYXN0IGNvbW1pdDogJHtsb2NhbExhc3RDb21taXR9LCBSZW1vdGUgbGFzdCBjb21taXQ6ICR7cmVwby5sYXN0X2NvbW1pdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF0ZSA9IG5ldyBEYXRlKGxvY2FsTGFzdENvbW1pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1vdGVEYXRlID0gbmV3IERhdGUocmVwby5sYXN0X2NvbW1pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXBvLmhhc191cGRhdGUgPSByZW1vdGVEYXRlID4gbG9jYWxEYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7cmVwby5uYW1lfSBoYXMgdXBkYXRlOiAke3JlcG8uaGFzX3VwZGF0ZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3JlcG8ubmFtZX0gLSBObyBsYXN0X2NvbW1pdCBmb3VuZCBpbiBwYWNrYWdlLmpzb24sIHVzaW5nIGZpbGUgc3RhdHNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMuc3RhdChwYWNrYWdlSnNvblBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9jYWxMYXN0TW9kaWZpZWQgPSBuZXcgRGF0ZShzdGF0cy5tdGltZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1vdGVMYXN0Q29tbWl0ID0gbmV3IERhdGUocmVwby5sYXN0X2NvbW1pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXBvLmhhc191cGRhdGUgPSBsb2NhbExhc3RNb2RpZmllZCA8IHJlbW90ZUxhc3RDb21taXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IC0gTG9jYWwgbW9kaWZpZWQ6ICR7bG9jYWxMYXN0TW9kaWZpZWR9LCBSZW1vdGUgY29tbWl0OiAke3JlbW90ZUxhc3RDb21taXR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtyZXBvLm5hbWV9IGhhcyB1cGRhdGU6ICR7cmVwby5oYXNfdXBkYXRlfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGNoZWNrIGZvciB1cGRhdGVzIGZvciAke3JlcG8ubmFtZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcG9zaXRvcnkgJHtyZXBvLm5hbWV9IGlzIG5vdCBpbnN0YWxsZWRgKTtcbiAgICAgICAgICAgICAgICByZXBvLmluc3RhbGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHJldHJ5KCkge1xuICAgICAgICB0aGlzLmNvbXBvbmVudC5mZXRjaFJlcG9zKCk7XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZVNlbGVjdGVkVmVyc2lvbihyZXBvOiBhbnksIHZlcnNpb246IHN0cmluZykge1xuICAgICAgICByZXBvLnNlbGVjdGVkVmVyc2lvbiA9IHZlcnNpb247XG4gICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGVkICR7cmVwby5uYW1lfSBzZWxlY3RlZCB2ZXJzaW9uIHRvOiAke3ZlcnNpb259YCk7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIG9uRG93bmxvYWRDbGljayhyZXBvOiBhbnkpIHtcbiAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHJldHVybjtcblxuICAgICAgICAvLyDlpoLmnpzkvp3otZbku43lnKjliIbmnpDkuK3vvIzmj5DnpLrnlKjmiLfnqI3lkI5cbiAgICAgICAgaWYgKHJlcG8uZGVwZW5kZW5jaWVzX2xvYWRpbmcpIHtcbiAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygn5q2j5Zyo5YiG5p6Q5L6d6LWW6aG577yM6K+356iN5ZCO6YeN6K+V44CCJywge1xuICAgICAgICAgICAgICAgIGJ1dHRvbnM6IFsn5aW955qEJ10sXG4gICAgICAgICAgICAgICAgdGl0bGU6ICfor7fnqI3lgJknXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXBvLmluc3RhbGxlZCAmJiByZXBvLmhhc191cGRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5EaWFsb2cuaW5mbyhgJHtyZXBvLm5hbWV9IGlzIGFscmVhZHkgaW5zdGFsbGVkIGJ1dCBoYXMgdXBkYXRlcy4gRG8geW91IHdhbnQgdG8gdXBkYXRlIGl0P2AsIHtcbiAgICAgICAgICAgICAgICBidXR0b25zOiBbJ2NvbmZpcm0nLCAnY2FuY2VsJ10sXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdVcGRhdGUgUmVwb3NpdG9yeScsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEaWFsb2cgcmVzdWx0OicsIHJlc3VsdCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0LnJlc3BvbnNlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcG8uc2VsZWN0ZWRWZXJzaW9uID09PSAnbWFzdGVyJykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkUmVwbyhyZXBvLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkUmVwb1dpdGhWZXJzaW9uKHJlcG8sIHJlcG8uc2VsZWN0ZWRWZXJzaW9uLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVwby5pbnN0YWxsZWQgJiYgIXJlcG8uaGFzX3VwZGF0ZSkge1xuICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKGAke3JlcG8ubmFtZX0gaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIHVwIHRvIGRhdGUuYCwge1xuICAgICAgICAgICAgICAgIGJ1dHRvbnM6IFsnb2snXSxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ1JlcG9zaXRvcnkgSW5zdGFsbGVkJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHJlcG8uc2VsZWN0ZWRWZXJzaW9uID09PSAnbWFzdGVyJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZG93bmxvYWRSZXBvKHJlcG8pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkUmVwb1dpdGhWZXJzaW9uKHJlcG8sIHJlcG8uc2VsZWN0ZWRWZXJzaW9uLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZG93bmxvYWRSZXBvV2l0aFZlcnNpb24ocmVwbzogYW55LCB2ZXJzaW9uOiBzdHJpbmcsIGlzVXBkYXRlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IGRvd25sb2FkaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coYCR7aXNVcGRhdGUgPyAnVXBkYXRpbmcnIDogJ0Rvd25sb2FkaW5nJ30gcmVwb3NpdG9yeSAke3JlcG8ubmFtZX0gdmVyc2lvbiAke3ZlcnNpb259YCk7XG4gICAgICAgIHJlcG8uZG93bmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICByZXBvLnByb2dyZXNzID0gMDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0RpciA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnZXh0ZW5zaW9ucycpO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RGlyID0gcGF0aC5qb2luKGV4dGVuc2lvbnNEaXIsIHJlcG8ubmFtZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVGFyZ2V0IGRpcmVjdG9yeTogJHt0YXJnZXREaXJ9YCk7XG5cbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldERpcikpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVGFyZ2V0IGRpcmVjdG9yeSBleGlzdHMsIHJlbW92aW5nOiAke3RhcmdldERpcn1gKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUodGFyZ2V0RGlyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IGZzLmVuc3VyZURpcih0YXJnZXREaXIpO1xuXG4gICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHJlcG8udXJsLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBjb25zdCBvd25lciA9IHVybFBhcnRzWzNdO1xuICAgICAgICAgICAgY29uc3QgcmVwb05hbWUgPSB1cmxQYXJ0c1s0XTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6aaW5YWI5bCd6K+V5LuOIEdpdEh1YiBSZWxlYXNlcyDkuIvovb3mjIflrprniYjmnKxcbiAgICAgICAgICAgIGxldCB6aXBVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7b3duZXJ9LyR7cmVwb05hbWV9L2FyY2hpdmUvcmVmcy90YWdzLyR7dmVyc2lvbn0uemlwYDtcbiAgICAgICAgICAgIGxldCB6aXBGaWxlUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsICdyZXBvLnppcCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgT3duZXI6ICR7b3duZXJ9LCBSZXBvOiAke3JlcG9OYW1lfSwgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYEF0dGVtcHRpbmcgdG8gZG93bmxvYWQgZnJvbSBHaXRIdWIgUmVsZWFzZXM6ICR7emlwVXJsfWApO1xuXG4gICAgICAgICAgICByZXBvLnByb2dyZXNzID0gMTA7XG4gICAgICAgICAgICByZXBvLnByb2dyZXNzVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcG8ucHJvZ3Jlc3MgPCA1MCkgcmVwby5wcm9ncmVzcyArPSA1O1xuICAgICAgICAgICAgfSwgNTAwKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkRmlsZSh6aXBVcmwsIHppcEZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGRvd25sb2FkZWQgJHt2ZXJzaW9ufSBmcm9tIEdpdEh1YiBSZWxlYXNlc2ApO1xuICAgICAgICAgICAgfSBjYXRjaCAocmVsZWFzZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBGYWlsZWQgdG8gZG93bmxvYWQgZnJvbSByZWxlYXNlcywgdHJ5aW5nIG1hc3RlciBicmFuY2g6YCwgcmVsZWFzZUVycm9yKTtcbiAgICAgICAgICAgICAgICAvLyDlpoLmnpzku44gcmVsZWFzZXMg5LiL6L295aSx6LSl77yM5Zue6YCA5YiwIG1hc3RlciDliIbmlK9cbiAgICAgICAgICAgICAgICB6aXBVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7b3duZXJ9LyR7cmVwb05hbWV9L2FyY2hpdmUvcmVmcy9oZWFkcy9tYXN0ZXIuemlwYDtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRpbmcgZnJvbSBtYXN0ZXIgYnJhbmNoOiAke3ppcFVybH1gKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkRmlsZSh6aXBVcmwsIHppcEZpbGVQYXRoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChyZXBvLnByb2dyZXNzVGltZXIpO1xuICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSA1MDtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0V4dHJhY3RpbmcgWklQIGZpbGU6JywgemlwRmlsZVBhdGgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51bnppcEZpbGUoemlwRmlsZVBhdGgsIHRhcmdldERpcik7XG4gICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUoemlwRmlsZVBhdGgpO1xuXG4gICAgICAgICAgICByZXBvLnByb2dyZXNzID0gNjA7XG5cbiAgICAgICAgICAgIC8vIOS7juacrOWcsOivu+WPliBnYW1lRGVwZW5kZW5jaWVzIOW5tuS4i+i9veS+nei1lumhuVxuICAgICAgICAgICAgY29uc3QgbG9jYWxHYW1lRGVwZW5kZW5jaWVzID0gYXdhaXQgdGhpcy5yZWFkTG9jYWxHYW1lRGVwZW5kZW5jaWVzKHRhcmdldERpcik7XG4gICAgICAgICAgICBpZiAobG9jYWxHYW1lRGVwZW5kZW5jaWVzICYmIE9iamVjdC5rZXlzKGxvY2FsR2FtZURlcGVuZGVuY2llcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCBsb2NhbCBkZXBlbmRlbmNpZXMgZm9yICR7cmVwby5uYW1lfTpgLCBsb2NhbEdhbWVEZXBlbmRlbmNpZXMpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZGVwTmFtZSBpbiBsb2NhbEdhbWVEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVwVmVyc2lvbiA9IGxvY2FsR2FtZURlcGVuZGVuY2llc1tkZXBOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVwUmVwbyA9IHRoaXMuY29tcG9uZW50LnJlcG9zLmZpbmQociA9PiByLm5hbWUgPT09IGRlcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVwUmVwbyAmJiAhZGVwUmVwby5pbnN0YWxsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBEZXBlbmRlbmN5ICR7ZGVwTmFtZX0gdmVyc2lvbiAke2RlcFZlcnNpb259IGlzIG5vdCBpbnN0YWxsZWQuIERvd25sb2FkaW5nIGl0IGZpcnN0Li4uYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuVGFzay5hZGROb3RpY2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIkRvd25sb2FkaW5nIERlcGVuZGVuY3lcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRG93bmxvYWRpbmcgZGVwZW5kZW5jeSBmb3IgJHtyZXBvLm5hbWV9OiAke2RlcE5hbWV9ICgke2RlcFZlcnNpb259KWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcIkdhbWUgRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJsb2dcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kb3dubG9hZFJlcG9XaXRoVmVyc2lvbihkZXBSZXBvLCBkZXBWZXJzaW9uLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSA5MDtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVQYWNrYWdlSnNvbih0YXJnZXREaXIsIHJlcG8ubGFzdF9jb21taXQpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnN0YWxsQW5kQnVpbGQodGFyZ2V0RGlyKTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJBbmRFbmFibGVFeHRlbnNpb24ocmVwby5uYW1lKTtcblxuICAgICAgICAgICAgcmVwby5wcm9ncmVzcyA9IDEwMDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTdWNjZXNzZnVsbHkgZG93bmxvYWRlZCAke3JlcG8ubmFtZX0gdmVyc2lvbiAke3ZlcnNpb259IHRvICR7dGFyZ2V0RGlyfWApO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXBvLmRvd25sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlcG8uaGFzX3VwZGF0ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIEVkaXRvci5UYXNrLmFkZE5vdGljZSh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkXCIsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgZG93bmxvYWRlZDogJHtyZXBvLm5hbWV9ICgke3ZlcnNpb259KWAsXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogXCJHYW1lIERhc2hib2FyZFwiLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN1Y2Nlc3NcIixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDEwMDApO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Rvd25sb2FkIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICByZXBvLmRvd25sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzc1RpbWVyKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChyZXBvLnByb2dyZXNzVGltZXIpO1xuICAgICAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3NUaW1lciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKGBGYWlsZWQgdG8gZG93bmxvYWQgJHtyZXBvLm5hbWV9IHZlcnNpb24gJHt2ZXJzaW9ufTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGRvd25sb2FkUmVwbyhyZXBvOiBhbnksIGlzVXBkYXRlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBvc2l0b3J5ICR7cmVwby5uYW1lfSBpcyBhbHJlYWR5IGRvd25sb2FkaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coYCR7aXNVcGRhdGUgPyAnVXBkYXRpbmcnIDogJ0Rvd25sb2FkaW5nJ30gcmVwb3NpdG9yeTpgLCByZXBvKTtcbiAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IHRydWU7XG4gICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAwO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDmo4Dmn6XlubbkuIvovb3kvp3otZbpoblcbiAgICAgICAgICAgIGlmIChyZXBvLmdhbWVEZXBlbmRlbmNpZXMgJiYgT2JqZWN0LmtleXMocmVwby5nYW1lRGVwZW5kZW5jaWVzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYENoZWNraW5nIGRlcGVuZGVuY2llcyBmb3IgJHtyZXBvLm5hbWV9Li4uYCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBkZXBOYW1lIGluIHJlcG8uZ2FtZURlcGVuZGVuY2llcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXBWZXJzaW9uID0gcmVwby5nYW1lRGVwZW5kZW5jaWVzW2RlcE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXBSZXBvID0gdGhpcy5jb21wb25lbnQucmVwb3MuZmluZChyID0+IHIubmFtZSA9PT0gZGVwTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXBSZXBvICYmICFkZXBSZXBvLmluc3RhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYERlcGVuZGVuY3kgJHtkZXBOYW1lfSB2ZXJzaW9uICR7ZGVwVmVyc2lvbn0gaXMgbm90IGluc3RhbGxlZC4gRG93bmxvYWRpbmcgaXQgZmlyc3QuLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5UYXNrLmFkZE5vdGljZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiRG93bmxvYWRpbmcgRGVwZW5kZW5jeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBEb3dubG9hZGluZyBkZXBlbmRlbmN5IGZvciAke3JlcG8ubmFtZX06ICR7ZGVwTmFtZX0gKCR7ZGVwVmVyc2lvbn0pYCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFwiR2FtZSBEYXNoYm9hcmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImxvZ1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkUmVwb1dpdGhWZXJzaW9uKGRlcFJlcG8sIGRlcFZlcnNpb24sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0RpciA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnZXh0ZW5zaW9ucycpO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RGlyID0gcGF0aC5qb2luKGV4dGVuc2lvbnNEaXIsIHJlcG8ubmFtZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVGFyZ2V0IGRpcmVjdG9yeTogJHt0YXJnZXREaXJ9YCk7XG5cbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldERpcikpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVGFyZ2V0IGRpcmVjdG9yeSBleGlzdHMsIHJlbW92aW5nOiAke3RhcmdldERpcn1gKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUodGFyZ2V0RGlyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IGZzLmVuc3VyZURpcih0YXJnZXREaXIpO1xuXG4gICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHJlcG8udXJsLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBjb25zdCBvd25lciA9IHVybFBhcnRzWzNdO1xuICAgICAgICAgICAgY29uc3QgcmVwb05hbWUgPSB1cmxQYXJ0c1s0XTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5qC55o2u6YCJ5oup55qE54mI5pys56Gu5a6a5LiL6L29VVJMXG4gICAgICAgICAgICBsZXQgemlwVXJsO1xuICAgICAgICAgICAgaWYgKHJlcG8uc2VsZWN0ZWRWZXJzaW9uID09PSAnbWFzdGVyJykge1xuICAgICAgICAgICAgICAgIHppcFVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtvd25lcn0vJHtyZXBvTmFtZX0vYXJjaGl2ZS9yZWZzL2hlYWRzL21hc3Rlci56aXBgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB6aXBVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7b3duZXJ9LyR7cmVwb05hbWV9L2FyY2hpdmUvcmVmcy90YWdzLyR7cmVwby5zZWxlY3RlZFZlcnNpb259LnppcGA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHppcEZpbGVQYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgJ3JlcG8uemlwJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgT3duZXI6ICR7b3duZXJ9LCBSZXBvOiAke3JlcG9OYW1lfSwgVmVyc2lvbjogJHtyZXBvLnNlbGVjdGVkVmVyc2lvbn1gKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZGluZyBaSVAgZnJvbTogJHt6aXBVcmx9YCk7XG5cbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAxMDtcbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3NUaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVwby5wcm9ncmVzcyA8IDk1KSByZXBvLnByb2dyZXNzICs9IDU7XG4gICAgICAgICAgICB9LCA1MDApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRvd25sb2FkRmlsZSh6aXBVcmwsIHppcEZpbGVQYXRoKTtcblxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChyZXBvLnByb2dyZXNzVGltZXIpO1xuICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSA5MDtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0V4dHJhY3RpbmcgWklQIGZpbGU6JywgemlwRmlsZVBhdGgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51bnppcEZpbGUoemlwRmlsZVBhdGgsIHRhcmdldERpcik7XG4gICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUoemlwRmlsZVBhdGgpO1xuXG4gICAgICAgICAgICByZXBvLnByb2dyZXNzID0gOTU7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGFja2FnZUpzb24odGFyZ2V0RGlyLCByZXBvLmxhc3RfY29tbWl0KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuaW5zdGFsbEFuZEJ1aWxkKHRhcmdldERpcik7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyQW5kRW5hYmxlRXh0ZW5zaW9uKHJlcG8ubmFtZSk7XG5cbiAgICAgICAgICAgIHJlcG8ucHJvZ3Jlc3MgPSAxMDA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGRvd25sb2FkZWQgJHtyZXBvLm5hbWV9IHRvICR7dGFyZ2V0RGlyfWApO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXBvLmRvd25sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVwby5pbnN0YWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlcG8uaGFzX3VwZGF0ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIEVkaXRvci5UYXNrLmFkZE5vdGljZSh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkXCIsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgZG93bmxvYWRlZDogJHtyZXBvLm5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBcIkdhbWUgRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRG93bmxvYWQgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgIHJlcG8uZG93bmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChyZXBvLnByb2dyZXNzVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHJlcG8ucHJvZ3Jlc3NUaW1lcik7XG4gICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCAke3JlcG8ubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWxEb3dubG9hZChyZXBvOiBhbnkpIHtcbiAgICAgICAgaWYgKHJlcG8uZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICAgIGlmIChyZXBvLnByb2dyZXNzVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHJlcG8ucHJvZ3Jlc3NUaW1lcik7XG4gICAgICAgICAgICAgICAgcmVwby5wcm9ncmVzc1RpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVwby5kb3dubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgcmVwby5wcm9ncmVzcyA9IDA7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCBjYW5jZWxlZDonLCByZXBvLm5hbWUpO1xuXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zRGlyID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdleHRlbnNpb25zJyk7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXREaXIgPSBwYXRoLmpvaW4oZXh0ZW5zaW9uc0RpciwgcmVwby5uYW1lKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZSh0YXJnZXREaXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVtb3ZlZCBkaXJlY3Rvcnk6ICR7dGFyZ2V0RGlyfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRmFpbGVkIHRvIHJlbW92ZSBkaXJlY3Rvcnk6ICR7dGFyZ2V0RGlyfWAsIGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLmJyb2FkY2FzdCgnc2NlbmUnLCAnc3RhdHVzLWJhcjp3YXJuaW5nJywge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBEb3dubG9hZCBjYW5jZWxlZDogJHtyZXBvLm5hbWV9YFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRvd25sb2FkRmlsZSh1cmw6IHN0cmluZywgZGVzdDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSAocmVxdWVzdFVybDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaHR0cHMuZ2V0KHJlcXVlc3RVcmwsIHsgaGVhZGVyczogeyAnVXNlci1BZ2VudCc6ICdDb2Nvcy1EYXNoYm9hcmQnIH0gfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDEgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMzAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZWRpcmVjdGluZyB0bzogJHtyZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9ufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QocmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1JlZGlyZWN0IGxvY2F0aW9uIG5vdCBmb3VuZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBGYWlsZWQgdG8gZG93bmxvYWQgZmlsZTogJHtyZXNwb25zZS5zdGF0dXNDb2RlfWApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5waXBlKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBmaWxlLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZnMudW5saW5rKGRlc3QsICgpID0+IHsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlcXVlc3QodXJsKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1bnppcEZpbGUoemlwRmlsZVBhdGg6IHN0cmluZywgdGFyZ2V0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgICAgIGNvbnN0IGV4dHJhY3REaXIgPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAnX3RlbXBfZXh0cmFjdCcpO1xuICAgICAgICBhd2FpdCBmcy5lbnN1cmVEaXIoZXh0cmFjdERpcik7XG5cbiAgICAgICAgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcbiAgICAgICAgY29uc3QgdW56aXBDb21tYW5kID0gaXNXaW5kb3dzXG4gICAgICAgICAgICA/IGBwb3dlcnNoZWxsIC1jb21tYW5kIFwiRXhwYW5kLUFyY2hpdmUgLVBhdGggJyR7emlwRmlsZVBhdGgucmVwbGFjZSgvJy9nLCBcIicnXCIpfScgLURlc3RpbmF0aW9uUGF0aCAnJHtleHRyYWN0RGlyLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nXCJgXG4gICAgICAgICAgICA6IGB1bnppcCBcIiR7emlwRmlsZVBhdGh9XCIgLWQgXCIke2V4dHJhY3REaXJ9XCJgO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdFeGVjdXRpbmcgdW56aXAgY29tbWFuZDonLCB1bnppcENvbW1hbmQpO1xuXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGV4ZWModW56aXBDb21tYW5kLCAoZXJyb3I6IGFueSwgc3Rkb3V0OiBzdHJpbmcsIHN0ZGVycjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuemlwIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU3RkZXJyOicsIHN0ZGVycik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBleHRyYWN0IFpJUDogJHtlcnJvci5tZXNzYWdlfWApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW56aXAgc3Rkb3V0OicsIHN0ZG91dCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RlZEl0ZW1zID0gYXdhaXQgZnMucmVhZGRpcihleHRyYWN0RGlyKTtcbiAgICAgICAgbGV0IHNvdXJjZURpciA9IGV4dHJhY3REaXI7XG4gICAgICAgIGlmIChleHRyYWN0ZWRJdGVtcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0SXRlbSA9IHBhdGguam9pbihleHRyYWN0RGlyLCBleHRyYWN0ZWRJdGVtc1swXSk7XG4gICAgICAgICAgICBpZiAoKGF3YWl0IGZzLnN0YXQoZmlyc3RJdGVtKSkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIHNvdXJjZURpciA9IGZpcnN0SXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhgTW92aW5nIGZpbGVzIGZyb20gJHtzb3VyY2VEaXJ9IHRvICR7dGFyZ2V0RGlyfWApO1xuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VEaXIpO1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHNyY1BhdGggPSBwYXRoLmpvaW4oc291cmNlRGlyLCBmaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgZmlsZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgTW92aW5nOiAke3NyY1BhdGh9IC0+ICR7ZGVzdFBhdGh9YCk7XG4gICAgICAgICAgICBhd2FpdCBmcy5tb3ZlKHNyY1BhdGgsIGRlc3RQYXRoLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBmcy5yZW1vdmUoZXh0cmFjdERpcik7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZW1vdmVkIHRlbXAgZGlyZWN0b3J5OicsIGV4dHJhY3REaXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFja2FnZUpzb24odGFyZ2V0RGlyOiBzdHJpbmcsIGxhc3RDb21taXQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVwZGF0aW5nIHBhY2thZ2UuanNvbiB3aXRoIGxhc3RfY29tbWl0IGluZm86ICR7bGFzdENvbW1pdH1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIHBhY2thZ2VKc29uLmxhc3RfY29tbWl0ID0gbGFzdENvbW1pdDtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy53cml0ZUZpbGUocGFja2FnZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMiksICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGVkIHBhY2thZ2UuanNvbiB3aXRoIGxhc3RfY29tbWl0IGluZm9gKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBwYWNrYWdlLmpzb246JywgZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbnN0YWxsQW5kQnVpbGQodGFyZ2V0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgICAgIGNvbnN0IHJ1bkNvbW1hbmQgPSAoY29tbWFuZDogc3RyaW5nKSA9PiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFJ1bm5pbmcgJHtjb21tYW5kfS4uLmApO1xuICAgICAgICAgICAgZXhlYyhjb21tYW5kLCB7IGN3ZDogdGFyZ2V0RGlyIH0sIChlcnJvcjogYW55LCBzdGRvdXQ6IHN0cmluZywgc3RkZXJyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcnVubmluZyAke2NvbW1hbmR9OmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgU3RkZXJyOmAsIHN0ZGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7Y29tbWFuZH0gc3Rkb3V0OmAsIHN0ZG91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBhd2FpdCBydW5Db21tYW5kKCducG0gaW5zdGFsbCcpO1xuICAgICAgICBhd2FpdCBydW5Db21tYW5kKCducG0gcnVuIGJ1aWxkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdEZXBlbmRlbmNpZXMgaW5zdGFsbGVkIGFuZCBidWlsZCBjb21wbGV0ZWQnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZ2lzdGVyQW5kRW5hYmxlRXh0ZW5zaW9uKHJlcG9OYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBwYWNrYWdlUGF0aCA9IEVkaXRvci5QYWNrYWdlLmdldFBhdGgocmVwb05hbWUpO1xuICAgICAgICAgICAgaWYgKCFwYWNrYWdlUGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZWdpc3RlcmluZyBleHRlbnNpb246ICR7cmVwb05hbWV9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0RpciA9IGpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ2V4dGVuc2lvbnMnLCByZXBvTmFtZSk7XG4gICAgICAgICAgICAgICAgRWRpdG9yLlBhY2thZ2UucmVnaXN0ZXIoZXh0ZW5zaW9uc0Rpcik7XG4gICAgICAgICAgICAgICAgcGFja2FnZVBhdGggPSBleHRlbnNpb25zRGlyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXh0ZW5zaW9uICR7cmVwb05hbWV9IGlzIGFscmVhZHkgcmVnaXN0ZXJlZGApO1xuICAgICAgICAgICAgICAgIEVkaXRvci5QYWNrYWdlLnJlZ2lzdGVyKHBhY2thZ2VQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBFbmFibGluZyBleHRlbnNpb246ICR7cmVwb05hbWV9YCk7XG4gICAgICAgICAgICBFZGl0b3IuUGFja2FnZS5lbmFibGUocGFja2FnZVBhdGgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYEV4dGVuc2lvbiBlbmFibGVkOiAke3JlcG9OYW1lfWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlZ2lzdGVyIG9yIGVuYWJsZSBleHRlbnNpb246JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g6K+75Y+W5pys5ZywIHBhY2thZ2UuanNvbiDkuK3nmoQgZ2FtZURlcGVuZGVuY2llc1xuICAgIHByaXZhdGUgYXN5bmMgcmVhZExvY2FsR2FtZURlcGVuZGVuY2llcyhleHRlbnNpb25EaXI6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDmn6Xmib7op6PljovlkI7nmoTnm67lvZXvvIzpgJrluLjmmK8ge3JlcG8tbmFtZX0te2JyYW5jaH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgZnMucmVhZGRpcihleHRlbnNpb25EaXIpO1xuICAgICAgICAgICAgbGV0IGFjdHVhbERpciA9IGV4dGVuc2lvbkRpcjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbVBhdGggPSBwYXRoLmpvaW4oZXh0ZW5zaW9uRGlyLCBpdGVtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMuc3RhdChpdGVtUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xov5nkuKrnm67lvZXmmK/lkKbljIXlkKsgcGFja2FnZS5qc29uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbihpdGVtUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXdhaXQgZnMucGF0aEV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWxEaXIgPSBpdGVtUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4oYWN0dWFsRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgICBpZiAoYXdhaXQgZnMucGF0aEV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkSnNvbihwYWNrYWdlSnNvblBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZWFkaW5nIGxvY2FsIHBhY2thZ2UuanNvbiBmcm9tICR7cGFja2FnZUpzb25QYXRofWApO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWNrYWdlQ29udGVudC5nYW1lRGVwZW5kZW5jaWVzIHx8IHt9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgTm8gcGFja2FnZS5qc29uIGZvdW5kIGF0ICR7cGFja2FnZUpzb25QYXRofWApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlYWRpbmcgbG9jYWwgZ2FtZURlcGVuZGVuY2llczonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=