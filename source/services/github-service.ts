
import * as fs from 'fs-extra';
import * as https from 'https';
import * as path from 'path';
import { join } from 'path';

// 定义 Vue 组件的接口，以便类型检查
interface VueComponent {
    repos: any[];
    loading: boolean;
    error: any | null;
    fetchRepos: () => void;
}

export class GithubService {
    private component: VueComponent;

    constructor(component: VueComponent) {
        this.component = component;
    }

    public async fetchRepos() {
        try {
            this.component.loading = true;
            this.component.error = null;

            const response = await Editor.Network.get('https://api.github.com/users/ksgames26/repos');
            const data = JSON.parse(response.toString());

            this.component.repos = data
                .filter((repo: any) => repo.name.startsWith('game-'))
                .map((repo: any) => {
                    console.log(`Repository ${repo.name}:`, repo);
                    return {
                        name: repo.name,
                        description: repo.description || 'No description',
                        url: repo.html_url,
                        clone_url: repo.clone_url,
                        language: repo.language || 'Unknown',
                        license: repo.license?.name || 'No license',
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
        } catch (error: any) {
            this.component.error = {
                message: 'Failed to fetch repositories',
                error: error.message,
            };
            this.component.loading = false;
        }
    }

    public async fetchGameDependencies() {
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

            } catch (error) {
                // 如果获取失败，则不处理，依赖项将为空
                console.warn(`Could not fetch package.json for ${repo.name}:`, error);
            } finally {
                // 无论成功与否，都设置加载完成
                repo.dependencies_loading = false;
            }
        });

        await Promise.all(promises);
    }

    public async fetchRepositoryReleases() {
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
                        const stableReleases = repo.releases.filter((r:any) => !r.prerelease);
                        if (stableReleases.length > 0) {
                            repo.selectedVersion = stableReleases[0].tag_name;
                        } else if (repo.releases.length > 0) {
                            // 如果没有正式版本但有预发布版本，选择最新的预发布版本
                            repo.selectedVersion = repo.releases[0].tag_name;
                        }
                        
                        console.log(`Found ${repo.releases.length} releases for ${repo.name}`);
                    } else {
                        console.log(`No releases found for ${repo.name}, using master branch`);
                        repo.releases = [];
                        repo.selectedVersion = 'master';
                    }
                }
            } catch (error) {
                console.warn(`Could not fetch releases for ${repo.name}:`, error);
                repo.releases = [];
                repo.selectedVersion = 'master';
            } finally {
                repo.releases_loading = false;
            }
        });

        await Promise.all(promises);
    }

    public async checkInstalledRepos() {
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
                    } else {
                        console.log(`${repo.name} - No last_commit found in package.json, using file stats`);
                        const stats = await fs.stat(packageJsonPath);
                        const localLastModified = new Date(stats.mtime);
                        const remoteLastCommit = new Date(repo.last_commit);
                        repo.has_update = localLastModified < remoteLastCommit;
                        console.log(`${repo.name} - Local modified: ${localLastModified}, Remote commit: ${remoteLastCommit}`);
                        console.log(`${repo.name} has update: ${repo.has_update}`);
                    }
                } catch (error) {
                    console.error(`Failed to check for updates for ${repo.name}:`, error);
                }
            } else {
                console.log(`Repository ${repo.name} is not installed`);
                repo.installed = false;
            }
        }
    }

    public retry() {
        this.component.fetchRepos();
    }

    public updateSelectedVersion(repo: any, version: string) {
        repo.selectedVersion = version;
        console.log(`Updated ${repo.name} selected version to: ${version}`);
    }

    public async onDownloadClick(repo: any) {
        if (repo.downloading) return;

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
                } else {
                    await this.downloadRepoWithVersion(repo, repo.selectedVersion, true);
                }
            }
        } else if (repo.installed && !repo.has_update) {
            Editor.Dialog.info(`${repo.name} is already installed and up to date.`, {
                buttons: ['ok'],
                title: 'Repository Installed',
            });
        } else {
            if (repo.selectedVersion === 'master') {
                await this.downloadRepo(repo);
            } else {
                await this.downloadRepoWithVersion(repo, repo.selectedVersion, false);
            }
        }
    }

    public async downloadRepoWithVersion(repo: any, version: string, isUpdate = false) {
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
                if (repo.progress < 50) repo.progress += 5;
            }, 500);

            try {
                await this.downloadFile(zipUrl, zipFilePath);
                console.log(`Successfully downloaded ${version} from GitHub Releases`);
            } catch (releaseError) {
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

        } catch (error: any) {
            console.error('Download failed:', error);
            repo.downloading = false;
            if (repo.progressTimer) {
                clearInterval(repo.progressTimer);
                repo.progressTimer = null;
            }
            Editor.Dialog.error(`Failed to download ${repo.name} version ${version}: ${error.message}`);
        }
    }

    public async downloadRepo(repo: any, isUpdate = false) {
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
            } else {
                zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/tags/${repo.selectedVersion}.zip`;
            }
            
            const zipFilePath = path.join(targetDir, 'repo.zip');
            console.log(`Owner: ${owner}, Repo: ${repoName}, Version: ${repo.selectedVersion}`);
            console.log(`Downloading ZIP from: ${zipUrl}`);

            repo.progress = 10;
            repo.progressTimer = setInterval(() => {
                if (repo.progress < 95) repo.progress += 5;
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

        } catch (error: any) {
            console.error('Download failed:', error);
            repo.downloading = false;
            if (repo.progressTimer) {
                clearInterval(repo.progressTimer);
                repo.progressTimer = null;
            }
            Editor.Dialog.error(`Failed to download ${repo.name}: ${error.message}`);
        }
    }

    public async cancelDownload(repo: any) {
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
            } catch (err) {
                console.warn(`Failed to remove directory: ${targetDir}`, err);
            }

            Editor.Message.broadcast('scene', 'status-bar:warning', {
                message: `Download canceled: ${repo.name}`
            });
        }
    }

    private async downloadFile(url: string, dest: string) {
        const file = fs.createWriteStream(dest);
        return new Promise<void>((resolve, reject) => {
            const request = (requestUrl: string) => {
                https.get(requestUrl, { headers: { 'User-Agent': 'Cocos-Dashboard' } }, (response) => {
                    if (response.statusCode === 301 || response.statusCode === 302) {
                        if (response.headers.location) {
                            console.log(`Redirecting to: ${response.headers.location}`);
                            request(response.headers.location);
                        } else {
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

    private async unzipFile(zipFilePath: string, targetDir: string) {
        const { exec } = require('child_process');
        const extractDir = path.join(targetDir, '_temp_extract');
        await fs.ensureDir(extractDir);

        const isWindows = process.platform === 'win32';
        const unzipCommand = isWindows
            ? `powershell -command "Expand-Archive -Path '${zipFilePath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}'"`
            : `unzip "${zipFilePath}" -d "${extractDir}"`;

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

    private async updatePackageJson(targetDir: string, lastCommit: string) {
        const packageJsonPath = path.join(targetDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                console.log(`Updating package.json with last_commit info: ${lastCommit}`);
                const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                const packageJson = JSON.parse(packageJsonContent);
                packageJson.last_commit = lastCommit;
                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
                console.log(`Updated package.json with last_commit info`);
            } catch (error) {
                console.error('Failed to update package.json:', error);
            }
        }
    }

    private async installAndBuild(targetDir: string) {
        const { exec } = require('child_process');
        const runCommand = (command: string) => new Promise<void>((resolve) => {
            console.log(`Running ${command}...`);
            exec(command, { cwd: targetDir }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    console.error(`Error running ${command}:`, error);
                    console.error(`Stderr:`, stderr);
                } else {
                    console.log(`${command} stdout:`, stdout);
                }
                resolve();
            });
        });

        await runCommand('npm install');
        await runCommand('npm run build');
        console.log('Dependencies installed and build completed');
    }

    private registerAndEnableExtension(repoName: string) {
        try {
            let packagePath = Editor.Package.getPath(repoName);
            if (!packagePath) {
                console.log(`Registering extension: ${repoName}`);
                const extensionsDir = join(Editor.Project.path, 'extensions', repoName);
                Editor.Package.register(extensionsDir);
                packagePath = extensionsDir;
            } else {
                console.log(`Extension ${repoName} is already registered`);
                Editor.Package.register(packagePath);
            }
            console.log(`Enabling extension: ${repoName}`);
            Editor.Package.enable(packagePath);
            console.log(`Extension enabled: ${repoName}`);
        } catch (error) {
            console.error('Failed to register or enable extension:', error);
        }
    }

    // 读取本地 package.json 中的 gameDependencies
    private async readLocalGameDependencies(extensionDir: string): Promise<any> {
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
            } else {
                console.log(`No package.json found at ${packageJsonPath}`);
                return {};
            }
        } catch (error) {
            console.error('Error reading local gameDependencies:', error);
            return {};
        }
    }
}
