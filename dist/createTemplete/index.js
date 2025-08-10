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
exports.createTemplate = createTemplate;
const fs_1 = require("fs");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
const github_service_1 = require("../services/github-service");
async function createTemplate() {
    console.log("开始创建模板");
    console.log("创建调试面板自定义宏");
    let macroCustom = await Editor.Profile.getProject("engine", "macroCustom", "project");
    if (!macroCustom) {
        macroCustom = [
            {
                key: "OPEN_DEBUG_PANEL",
                value: true
            }
        ];
    }
    if (!Array.isArray(macroCustom)) {
        console.error("macroCustom is not an array, resetting to default.");
        return;
    }
    const openDebugPanel = macroCustom.find(item => item.key === "OPEN_DEBUG_PANEL");
    if (openDebugPanel) {
        openDebugPanel.value = true;
    }
    Editor.Profile.setProject("engine", "macroCustom", macroCustom, "project");
    const editorPath = Editor.Project.path;
    const assetsPath = `${editorPath}/assets`;
    const scriptsPath = `${assetsPath}/scripts`;
    // 判断有没有launch.ts文件
    const launchFilePath = `${scriptsPath}/launch.ts`;
    if ((0, fs_1.existsSync)(launchFilePath)) {
        console.error("检查已存在launch.ts文件, 不需要创建模板");
        return;
    }
    // 检查并下载必要的依赖
    console.log("检查必要的依赖库...");
    const requiredDependencies = ['game-core', 'game-framework', 'game-protobuf'];
    try {
        // 创建一个临时的组件对象来使用 GithubService
        const tempComponent = {
            repos: [],
            loading: false,
            error: null,
            fetchRepos: () => { }
        };
        const githubService = new github_service_1.GithubService(tempComponent);
        // 先获取仓库列表
        await githubService.fetchRepos();
        // 检查每个必要的依赖是否已安装
        const missingDependencies = [];
        for (const depName of requiredDependencies) {
            const extensionPath = path.join(editorPath, 'extensions', depName);
            if (!fs.existsSync(extensionPath)) {
                console.log(`依赖库 ${depName} 未安装，需要下载`);
                missingDependencies.push(depName);
            }
            else {
                console.log(`依赖库 ${depName} 已安装`);
            }
        }
        // 下载缺失的依赖
        if (missingDependencies.length > 0) {
            console.log(`开始下载缺失的依赖: ${missingDependencies.join(', ')}`);
            for (const depName of missingDependencies) {
                const depRepo = tempComponent.repos.find((r) => r.name === depName);
                if (depRepo) {
                    console.log(`正在下载依赖: ${depName}`);
                    Editor.Task.addNotice({
                        title: "下载模板依赖",
                        message: `正在下载模板必需的依赖库: ${depName}`,
                        source: "Game Dashboard",
                        type: "log",
                    });
                    // 使用最新版本下载
                    if (depRepo.selectedVersion && depRepo.selectedVersion !== 'master') {
                        await githubService.downloadRepoWithVersion(depRepo, depRepo.selectedVersion, false);
                    }
                    else {
                        await githubService.downloadRepo(depRepo, false);
                    }
                    console.log(`依赖 ${depName} 下载完成`);
                }
                else {
                    console.warn(`在仓库列表中未找到依赖库: ${depName}`);
                }
            }
            console.log("所有必要依赖下载完成");
            Editor.Task.addNotice({
                title: "依赖下载完成",
                message: "模板必需的依赖库已全部下载完成，开始下载模板项目",
                source: "Game Dashboard",
                type: "success",
            });
        }
        else {
            console.log("所有必要依赖已存在，可以直接下载模板");
        }
    }
    catch (error) {
        console.error(`检查依赖时发生错误: ${error.message}`);
        Editor.Dialog.warn(`检查模板依赖时发生错误: ${error.message}，将继续下载模板`, {
            buttons: ['确定'],
            title: '依赖检查警告'
        });
    }
    // 去github下载模版项目
    const templateUrl = "https://github.com/ksgames26/project-templete";
    // 实现在这里
    try {
        console.log(`开始从 ${templateUrl} 下载模板项目`);
        const urlParts = templateUrl.split('/');
        if (urlParts.length < 5 || urlParts[2] !== 'github.com') {
            console.error(`无效的 GitHub URL 格式: ${templateUrl}`);
            return;
        }
        const owner = urlParts[3];
        const repoName = urlParts[4].replace(/\.git$/, ''); // 移除可能的 .git 后缀
        const targetDirInAssets = path.join(assetsPath, repoName);
        console.log(`模板项目将下载到: ${targetDirInAssets}`);
        // 如果目标目录已存在，则先删除 (实现覆盖逻辑)
        if (fs.existsSync(targetDirInAssets)) {
            console.log(`目标目录 ${targetDirInAssets} 已存在，将执行覆盖操作。正在删除旧目录...`);
            await fs.remove(targetDirInAssets);
            console.log(`旧目录 ${targetDirInAssets} 已删除。`);
        }
        await fs.ensureDir(targetDirInAssets);
        const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/main.zip`;
        const tempZipFileName = `${repoName}-main.zip`; // 临时ZIP文件名
        const zipFilePath = path.join(assetsPath, tempZipFileName); // 将ZIP文件临时存放在assets目录下
        console.log(`正在从 ${zipUrl} 下载 ZIP 文件到 ${zipFilePath}`);
        await new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(zipFilePath);
            const requestOptions = {
                headers: {
                    'User-Agent': 'Cocos-Creator-Template-Downloader'
                }
            };
            https.get(zipUrl, requestOptions, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    if (!response.headers.location) {
                        fs.unlink(zipFilePath, () => { }); // 清理不完整的zip
                        reject(new Error('下载重定向时未找到 location header'));
                        return;
                    }
                    console.log(`请求被重定向到: ${response.headers.location}`);
                    https.get(response.headers.location, requestOptions, (redirectResponse) => {
                        if (redirectResponse.statusCode !== 200) {
                            fs.unlink(zipFilePath, () => { });
                            reject(new Error(`下载 ZIP 文件失败，状态码: ${redirectResponse.statusCode}`));
                            return;
                        }
                        redirectResponse.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            console.log('ZIP 文件下载完成。');
                            resolve();
                        });
                    }).on('error', (err) => {
                        fs.unlink(zipFilePath, () => { });
                        reject(new Error(`下载重定向的 ZIP 文件时发生错误: ${err.message}`));
                    });
                    return;
                }
                if (response.statusCode !== 200) {
                    fs.unlink(zipFilePath, () => { });
                    reject(new Error(`下载 ZIP 文件失败，状态码: ${response.statusCode}`));
                    return;
                }
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log('ZIP 文件下载完成。');
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(zipFilePath, () => { }); // 清理
                reject(new Error(`下载 ZIP 文件时发生错误: ${err.message}`));
            });
        });
        console.log('开始解压 ZIP 文件...');
        // 创建一个唯一的临时解压目录，以避免冲突，并放在 assetsPath 外层，如项目根目录的 .temp
        const projectRoot = Editor.Project.path;
        const tempExtractDir = path.join(projectRoot, `.temp_extract_${repoName}_${Date.now()}`);
        await fs.ensureDir(tempExtractDir);
        const isWindows = process.platform === 'win32';
        let unzipCommand;
        if (isWindows) {
            // PowerShell 命令需要确保路径正确处理，特别是包含空格或特殊字符时
            const psZipFilePath = zipFilePath.replace(/'/g, "''");
            const psTempExtractDir = tempExtractDir.replace(/'/g, "''");
            unzipCommand = `powershell -command "Expand-Archive -Path '${psZipFilePath}' -DestinationPath '${psTempExtractDir}' -Force"`;
        }
        else {
            unzipCommand = `unzip -o "${zipFilePath}" -d "${tempExtractDir}"`; // -o 表示覆盖已存在文件而不询问
        }
        console.log(`执行解压命令: ${unzipCommand}`);
        await new Promise((resolve, reject) => {
            (0, child_process_1.exec)(unzipCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`解压 ZIP 文件失败: ${error.message}`);
                    console.error(`Stderr: ${stderr}`);
                    reject(error);
                    return;
                }
                console.log(`解压输出: ${stdout}`);
                resolve();
            });
        });
        console.log('ZIP 文件解压完成。正在移动文件...');
        // GitHub ZIP 包通常会包含一个与仓库名和分支名相关的根目录，例如 'project-templete-main'
        const extractedItems = await fs.readdir(tempExtractDir);
        let sourceDirToMove = tempExtractDir;
        if (extractedItems.length === 1) {
            const firstItemPath = path.join(tempExtractDir, extractedItems[0]);
            if ((await fs.stat(firstItemPath)).isDirectory()) {
                // 假设这个单目录就是包含所有内容的目录
                sourceDirToMove = firstItemPath;
                console.log(`内容在子目录 ${extractedItems[0]} 中，将从此处移动。`);
            }
        }
        const filesToMove = await fs.readdir(sourceDirToMove);
        for (const file of filesToMove) {
            const srcPath = path.join(sourceDirToMove, file);
            const destPath = path.join(targetDirInAssets, file);
            await fs.move(srcPath, destPath, { overwrite: true });
        }
        console.log(`文件已移动到 ${targetDirInAssets}`);
        console.log('清理临时文件...');
        await fs.remove(zipFilePath);
        await fs.remove(tempExtractDir);
        console.log('临时文件清理完成。');
        // 将模板项目中的 assets 文件夹内容移动到项目根 assets 目录，并删除模板项目原目录
        console.log(`准备处理模板项目 ${repoName} 的内部 assets 文件夹...`);
        const templateInnerAssetsPath = path.join(targetDirInAssets, 'assets');
        if (fs.existsSync(templateInnerAssetsPath) && (await fs.stat(templateInnerAssetsPath)).isDirectory()) {
            console.log(`发现模板内部 assets 文件夹: ${templateInnerAssetsPath}`);
            console.log(`将其内容移动到项目主 assets 目录: ${assetsPath}`);
            const itemsInTemplateAssets = await fs.readdir(templateInnerAssetsPath);
            for (const item of itemsInTemplateAssets) {
                const sourceItemPath = path.join(templateInnerAssetsPath, item);
                const destinationItemPath = path.join(assetsPath, item); // assetsPath 是项目的主 assets 目录
                // 如果目标已存在，先尝试删除，确保 move 操作对于文件夹能正确覆盖
                if (fs.existsSync(destinationItemPath)) {
                    console.log(`目标路径 ${destinationItemPath} 已存在，将先删除以进行覆盖。`);
                    await fs.remove(destinationItemPath);
                }
                await fs.move(sourceItemPath, destinationItemPath, { overwrite: true }); // overwrite 适用于文件，对于目录，先删除再移动更可靠
                console.log(`已移动 ${item} 到 ${destinationItemPath}`);
            }
            console.log('模板内部 assets 内容移动完成。');
        }
        else {
            console.log(`模板项目 ${repoName} 中未找到内部 assets 文件夹，或其不是一个目录。跳过移动内部 assets 步骤。`);
        }
        console.log(`删除模板项目原始根目录: ${targetDirInAssets}`);
        await fs.remove(targetDirInAssets);
        console.log(`模板项目原始根目录 ${targetDirInAssets} 已删除。`);
        console.log('刷新 Cocos Creator 资源数据库...');
        Editor.Message.send('asset-db', 'refresh');
        console.log('资源数据库刷新请求已发送。');
        console.log(`模板项目 ${repoName} 已成功下载并解压到 ${targetDirInAssets}`);
    }
    catch (error) {
        console.error(`创建模板过程中发生错误: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvY3JlYXRlVGVtcGxldGUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFPQSx3Q0F5U0M7QUFoVEQsMkJBQWdDO0FBQ2hDLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLGlEQUFxQztBQUNyQywrREFBMkQ7QUFFcEQsS0FBSyxVQUFVLGNBQWM7SUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV0QixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFCLElBQUksV0FBVyxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUV0RixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDZixXQUFXLEdBQUc7WUFDVjtnQkFDSSxHQUFHLEVBQUUsa0JBQWtCO2dCQUN2QixLQUFLLEVBQUUsSUFBSTthQUNkO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztRQUNwRSxPQUFPO0lBQ1gsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLGtCQUFrQixDQUFDLENBQUM7SUFDakYsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNqQixjQUFjLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNoQyxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLGFBQWEs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QUFDO1FBQ2pELE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxpQkFBaUIsT0FBTyxDQUFDLENBQUM7UUFFbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxRQUFRLGNBQWMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBRW5FLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNMLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IEdpdGh1YlNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlcy9naXRodWItc2VydmljZSc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVUZW1wbGF0ZSgpIHtcbiAgICBjb25zb2xlLmxvZyhcIuW8gOWni+WIm+W7uuaooeadv1wiKTtcblxuICAgIGNvbnNvbGUubG9nKFwi5Yib5bu66LCD6K+V6Z2i5p2/6Ieq5a6a5LmJ5a6PXCIpO1xuICAgIGxldCBtYWNyb0N1c3RvbSA9IGF3YWl0IEVkaXRvci5Qcm9maWxlLmdldFByb2plY3QoXCJlbmdpbmVcIiwgXCJtYWNyb0N1c3RvbVwiLCBcInByb2plY3RcIik7XG5cbiAgICBpZiAoIW1hY3JvQ3VzdG9tKSB7XG4gICAgICAgIG1hY3JvQ3VzdG9tID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogXCJPUEVOX0RFQlVHX1BBTkVMXCIsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobWFjcm9DdXN0b20pKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJtYWNyb0N1c3RvbSBpcyBub3QgYW4gYXJyYXksIHJlc2V0dGluZyB0byBkZWZhdWx0LlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG9wZW5EZWJ1Z1BhbmVsID0gbWFjcm9DdXN0b20uZmluZChpdGVtID0+IGl0ZW0ua2V5ID09PSBcIk9QRU5fREVCVUdfUEFORUxcIik7XG4gICAgaWYgKG9wZW5EZWJ1Z1BhbmVsKSB7XG4gICAgICAgIG9wZW5EZWJ1Z1BhbmVsLnZhbHVlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBFZGl0b3IuUHJvZmlsZS5zZXRQcm9qZWN0KFwiZW5naW5lXCIsIFwibWFjcm9DdXN0b21cIiwgbWFjcm9DdXN0b20sIFwicHJvamVjdFwiKTtcblxuICAgIGNvbnN0IGVkaXRvclBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgIGNvbnN0IGFzc2V0c1BhdGggPSBgJHtlZGl0b3JQYXRofS9hc3NldHNgO1xuICAgIGNvbnN0IHNjcmlwdHNQYXRoID0gYCR7YXNzZXRzUGF0aH0vc2NyaXB0c2A7XG5cbiAgICAvLyDliKTmlq3mnInmsqHmnIlsYXVuY2gudHPmlofku7ZcbiAgICBjb25zdCBsYXVuY2hGaWxlUGF0aCA9IGAke3NjcmlwdHNQYXRofS9sYXVuY2gudHNgO1xuICAgIGlmIChleGlzdHNTeW5jKGxhdW5jaEZpbGVQYXRoKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwi5qOA5p+l5bey5a2Y5ZyobGF1bmNoLnRz5paH5Lu2LCDkuI3pnIDopoHliJvlu7rmqKHmnb9cIik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyDmo4Dmn6XlubbkuIvovb3lv4XopoHnmoTkvp3otZZcbiAgICBjb25zb2xlLmxvZyhcIuajgOafpeW/heimgeeahOS+nei1luW6ky4uLlwiKTtcbiAgICBjb25zdCByZXF1aXJlZERlcGVuZGVuY2llcyA9IFsnZ2FtZS1jb3JlJywgJ2dhbWUtZnJhbWV3b3JrJywgJ2dhbWUtcHJvdG9idWYnXTtcbiAgICBcbiAgICB0cnkge1xuICAgICAgICAvLyDliJvlu7rkuIDkuKrkuLTml7bnmoTnu4Tku7blr7nosaHmnaXkvb/nlKggR2l0aHViU2VydmljZVxuICAgICAgICBjb25zdCB0ZW1wQ29tcG9uZW50OiBhbnkgPSB7XG4gICAgICAgICAgICByZXBvczogW10sXG4gICAgICAgICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgICAgZmV0Y2hSZXBvczogKCkgPT4ge31cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBnaXRodWJTZXJ2aWNlID0gbmV3IEdpdGh1YlNlcnZpY2UodGVtcENvbXBvbmVudCk7XG4gICAgICAgIFxuICAgICAgICAvLyDlhYjojrflj5bku5PlupPliJfooahcbiAgICAgICAgYXdhaXQgZ2l0aHViU2VydmljZS5mZXRjaFJlcG9zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyDmo4Dmn6Xmr4/kuKrlv4XopoHnmoTkvp3otZbmmK/lkKblt7Llronoo4VcbiAgICAgICAgY29uc3QgbWlzc2luZ0RlcGVuZGVuY2llcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRlcE5hbWUgb2YgcmVxdWlyZWREZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvblBhdGggPSBwYXRoLmpvaW4oZWRpdG9yUGF0aCwgJ2V4dGVuc2lvbnMnLCBkZXBOYW1lKTtcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhleHRlbnNpb25QYXRoKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDkvp3otZblupMgJHtkZXBOYW1lfSDmnKrlronoo4XvvIzpnIDopoHkuIvovb1gKTtcbiAgICAgICAgICAgICAgICBtaXNzaW5nRGVwZW5kZW5jaWVzLnB1c2goZGVwTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDkvp3otZblupMgJHtkZXBOYW1lfSDlt7Llronoo4VgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOS4i+i9vee8uuWkseeahOS+nei1llxuICAgICAgICBpZiAobWlzc2luZ0RlcGVuZGVuY2llcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhg5byA5aeL5LiL6L2957y65aSx55qE5L6d6LWWOiAke21pc3NpbmdEZXBlbmRlbmNpZXMuam9pbignLCAnKX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChjb25zdCBkZXBOYW1lIG9mIG1pc3NpbmdEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXBSZXBvID0gdGVtcENvbXBvbmVudC5yZXBvcy5maW5kKChyOiBhbnkpID0+IHIubmFtZSA9PT0gZGVwTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKGRlcFJlcG8pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOato+WcqOS4i+i9veS+nei1ljogJHtkZXBOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICBFZGl0b3IuVGFzay5hZGROb3RpY2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwi5LiL6L295qih5p2/5L6d6LWWXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBg5q2j5Zyo5LiL6L295qih5p2/5b+F6ZyA55qE5L6d6LWW5bqTOiAke2RlcE5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogXCJHYW1lIERhc2hib2FyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJsb2dcIixcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKjmnIDmlrDniYjmnKzkuIvovb1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlcFJlcG8uc2VsZWN0ZWRWZXJzaW9uICYmIGRlcFJlcG8uc2VsZWN0ZWRWZXJzaW9uICE9PSAnbWFzdGVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZ2l0aHViU2VydmljZS5kb3dubG9hZFJlcG9XaXRoVmVyc2lvbihkZXBSZXBvLCBkZXBSZXBvLnNlbGVjdGVkVmVyc2lvbiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZ2l0aHViU2VydmljZS5kb3dubG9hZFJlcG8oZGVwUmVwbywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5L6d6LWWICR7ZGVwTmFtZX0g5LiL6L295a6M5oiQYCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDlnKjku5PlupPliJfooajkuK3mnKrmib7liLDkvp3otZblupM6ICR7ZGVwTmFtZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi5omA5pyJ5b+F6KaB5L6d6LWW5LiL6L295a6M5oiQXCIpO1xuICAgICAgICAgICAgRWRpdG9yLlRhc2suYWRkTm90aWNlKHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCLkvp3otZbkuIvovb3lrozmiJBcIixcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIuaooeadv+W/hemcgOeahOS+nei1luW6k+W3suWFqOmDqOS4i+i9veWujOaIkO+8jOW8gOWni+S4i+i9veaooeadv+mhueebrlwiLFxuICAgICAgICAgICAgICAgIHNvdXJjZTogXCJHYW1lIERhc2hib2FyZFwiLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIuaJgOacieW/heimgeS+nei1luW3suWtmOWcqO+8jOWPr+S7peebtOaOpeS4i+i9veaooeadv1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYOajgOafpeS+nei1luaXtuWPkeeUn+mUmeivrzogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICBFZGl0b3IuRGlhbG9nLndhcm4oYOajgOafpeaooeadv+S+nei1luaXtuWPkeeUn+mUmeivrzogJHtlcnJvci5tZXNzYWdlfe+8jOWwhue7p+e7reS4i+i9veaooeadv2AsIHtcbiAgICAgICAgICAgIGJ1dHRvbnM6IFsn56Gu5a6aJ10sXG4gICAgICAgICAgICB0aXRsZTogJ+S+nei1luajgOafpeitpuWRiidcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5Y67Z2l0aHVi5LiL6L295qih54mI6aG555uuXG4gICAgY29uc3QgdGVtcGxhdGVVcmwgPSBcImh0dHBzOi8vZ2l0aHViLmNvbS9rc2dhbWVzMjYvcHJvamVjdC10ZW1wbGV0ZVwiO1xuXG4gICAgLy8g5a6e546w5Zyo6L+Z6YeMXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc29sZS5sb2coYOW8gOWni+S7jiAke3RlbXBsYXRlVXJsfSDkuIvovb3mqKHmnb/pobnnm65gKTtcblxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHRlbXBsYXRlVXJsLnNwbGl0KCcvJyk7XG4gICAgICAgIGlmICh1cmxQYXJ0cy5sZW5ndGggPCA1IHx8IHVybFBhcnRzWzJdICE9PSAnZ2l0aHViLmNvbScpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOaXoOaViOeahCBHaXRIdWIgVVJMIOagvOW8jzogJHt0ZW1wbGF0ZVVybH1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvd25lciA9IHVybFBhcnRzWzNdO1xuICAgICAgICBjb25zdCByZXBvTmFtZSA9IHVybFBhcnRzWzRdLnJlcGxhY2UoL1xcLmdpdCQvLCAnJyk7IC8vIOenu+mZpOWPr+iDveeahCAuZ2l0IOWQjue8gFxuXG4gICAgICAgIGNvbnN0IHRhcmdldERpckluQXNzZXRzID0gcGF0aC5qb2luKGFzc2V0c1BhdGgsIHJlcG9OYW1lKTtcbiAgICAgICAgY29uc29sZS5sb2coYOaooeadv+mhueebruWwhuS4i+i9veWIsDogJHt0YXJnZXREaXJJbkFzc2V0c31gKTtcblxuICAgICAgICAvLyDlpoLmnpznm67moIfnm67lvZXlt7LlrZjlnKjvvIzliJnlhYjliKDpmaQgKOWunueOsOimhueblumAu+i+kSlcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0RGlySW5Bc3NldHMpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhg55uu5qCH55uu5b2VICR7dGFyZ2V0RGlySW5Bc3NldHN9IOW3suWtmOWcqO+8jOWwhuaJp+ihjOimhuebluaTjeS9nOOAguato+WcqOWIoOmZpOaXp+ebruW9lS4uLmApO1xuICAgICAgICAgICAgYXdhaXQgZnMucmVtb3ZlKHRhcmdldERpckluQXNzZXRzKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDml6fnm67lvZUgJHt0YXJnZXREaXJJbkFzc2V0c30g5bey5Yig6Zmk44CCYCk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgZnMuZW5zdXJlRGlyKHRhcmdldERpckluQXNzZXRzKTtcblxuICAgICAgICBjb25zdCB6aXBVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7b3duZXJ9LyR7cmVwb05hbWV9L2FyY2hpdmUvcmVmcy9oZWFkcy9tYWluLnppcGA7XG4gICAgICAgIGNvbnN0IHRlbXBaaXBGaWxlTmFtZSA9IGAke3JlcG9OYW1lfS1tYWluLnppcGA7IC8vIOS4tOaXtlpJUOaWh+S7tuWQjVxuICAgICAgICBjb25zdCB6aXBGaWxlUGF0aCA9IHBhdGguam9pbihhc3NldHNQYXRoLCB0ZW1wWmlwRmlsZU5hbWUpOyAvLyDlsIZaSVDmlofku7bkuLTml7blrZjmlL7lnKhhc3NldHPnm67lvZXkuItcblxuICAgICAgICBjb25zb2xlLmxvZyhg5q2j5Zyo5LuOICR7emlwVXJsfSDkuIvovb0gWklQIOaWh+S7tuWIsCAke3ppcEZpbGVQYXRofWApO1xuXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh6aXBGaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdVc2VyLUFnZW50JzogJ0NvY29zLUNyZWF0b3ItVGVtcGxhdGUtRG93bmxvYWRlcidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaHR0cHMuZ2V0KHppcFVybCwgcmVxdWVzdE9wdGlvbnMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDEgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMzAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnMudW5saW5rKHppcEZpbGVQYXRoLCAoKSA9PiB7fSk7IC8vIOa4heeQhuS4jeWujOaVtOeahHppcFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcign5LiL6L296YeN5a6a5ZCR5pe25pyq5om+5YiwIGxvY2F0aW9uIGhlYWRlcicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg6K+35rGC6KKr6YeN5a6a5ZCR5YiwOiAke3Jlc3BvbnNlLmhlYWRlcnMubG9jYXRpb259YCk7XG4gICAgICAgICAgICAgICAgICAgIGh0dHBzLmdldChyZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uLCByZXF1ZXN0T3B0aW9ucywgKHJlZGlyZWN0UmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWRpcmVjdFJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnVubGluayh6aXBGaWxlUGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYOS4i+i9vSBaSVAg5paH5Lu25aSx6LSl77yM54q25oCB56CBOiAke3JlZGlyZWN0UmVzcG9uc2Uuc3RhdHVzQ29kZX1gKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RSZXNwb25zZS5waXBlKGZpbGVTdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVTdHJlYW0uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnWklQIOaWh+S7tuS4i+i9veWujOaIkOOAgicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmsoemlwRmlsZVBhdGgsICgpID0+IHt9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYOS4i+i9vemHjeWumuWQkeeahCBaSVAg5paH5Lu25pe25Y+R55Sf6ZSZ6K+vOiAke2Vyci5tZXNzYWdlfWApKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZzLnVubGluayh6aXBGaWxlUGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGDkuIvovb0gWklQIOaWh+S7tuWksei0pe+8jOeKtuaAgeeggTogJHtyZXNwb25zZS5zdGF0dXNDb2RlfWApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNwb25zZS5waXBlKGZpbGVTdHJlYW0pO1xuICAgICAgICAgICAgICAgIGZpbGVTdHJlYW0ub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZVN0cmVhbS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnWklQIOaWh+S7tuS4i+i9veWujOaIkOOAgicpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgZnMudW5saW5rKHppcEZpbGVQYXRoLCAoKSA9PiB7fSk7IC8vIOa4heeQhlxuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYOS4i+i9vSBaSVAg5paH5Lu25pe25Y+R55Sf6ZSZ6K+vOiAke2Vyci5tZXNzYWdlfWApKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL6Kej5Y6LIFpJUCDmlofku7YuLi4nKTtcbiAgICAgICAgLy8g5Yib5bu65LiA5Liq5ZSv5LiA55qE5Li05pe26Kej5Y6L55uu5b2V77yM5Lul6YG/5YWN5Yay56qB77yM5bm25pS+5ZyoIGFzc2V0c1BhdGgg5aSW5bGC77yM5aaC6aG555uu5qC555uu5b2V55qEIC50ZW1wXG4gICAgICAgIGNvbnN0IHByb2plY3RSb290ID0gRWRpdG9yLlByb2plY3QucGF0aDtcbiAgICAgICAgY29uc3QgdGVtcEV4dHJhY3REaXIgPSBwYXRoLmpvaW4ocHJvamVjdFJvb3QsIGAudGVtcF9leHRyYWN0XyR7cmVwb05hbWV9XyR7RGF0ZS5ub3coKX1gKTtcbiAgICAgICAgYXdhaXQgZnMuZW5zdXJlRGlyKHRlbXBFeHRyYWN0RGlyKTtcblxuICAgICAgICBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuICAgICAgICBsZXQgdW56aXBDb21tYW5kOiBzdHJpbmc7XG4gICAgICAgIGlmIChpc1dpbmRvd3MpIHtcbiAgICAgICAgICAgIC8vIFBvd2VyU2hlbGwg5ZG95Luk6ZyA6KaB56Gu5L+d6Lev5b6E5q2j56Gu5aSE55CG77yM54m55Yir5piv5YyF5ZCr56m65qC85oiW54m55q6K5a2X56ym5pe2XG4gICAgICAgICAgICBjb25zdCBwc1ppcEZpbGVQYXRoID0gemlwRmlsZVBhdGgucmVwbGFjZSgvJy9nLCBcIicnXCIpO1xuICAgICAgICAgICAgY29uc3QgcHNUZW1wRXh0cmFjdERpciA9IHRlbXBFeHRyYWN0RGlyLnJlcGxhY2UoLycvZywgXCInJ1wiKTtcbiAgICAgICAgICAgIHVuemlwQ29tbWFuZCA9IGBwb3dlcnNoZWxsIC1jb21tYW5kIFwiRXhwYW5kLUFyY2hpdmUgLVBhdGggJyR7cHNaaXBGaWxlUGF0aH0nIC1EZXN0aW5hdGlvblBhdGggJyR7cHNUZW1wRXh0cmFjdERpcn0nIC1Gb3JjZVwiYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVuemlwQ29tbWFuZCA9IGB1bnppcCAtbyBcIiR7emlwRmlsZVBhdGh9XCIgLWQgXCIke3RlbXBFeHRyYWN0RGlyfVwiYDsgLy8gLW8g6KGo56S66KaG55uW5bey5a2Y5Zyo5paH5Lu26ICM5LiN6K+i6ZeuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhg5omn6KGM6Kej5Y6L5ZG95LukOiAke3VuemlwQ29tbWFuZH1gKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZXhlYyh1bnppcENvbW1hbmQsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg6Kej5Y6LIFpJUCDmlofku7blpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgU3RkZXJyOiAke3N0ZGVycn1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg6Kej5Y6L6L6T5Ye6OiAke3N0ZG91dH1gKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1pJUCDmlofku7bop6PljovlrozmiJDjgILmraPlnKjnp7vliqjmlofku7YuLi4nKTtcbiAgICAgICAgLy8gR2l0SHViIFpJUCDljIXpgJrluLjkvJrljIXlkKvkuIDkuKrkuI7ku5PlupPlkI3lkozliIbmlK/lkI3nm7jlhbPnmoTmoLnnm67lvZXvvIzkvovlpoIgJ3Byb2plY3QtdGVtcGxldGUtbWFpbidcbiAgICAgICAgY29uc3QgZXh0cmFjdGVkSXRlbXMgPSBhd2FpdCBmcy5yZWFkZGlyKHRlbXBFeHRyYWN0RGlyKTtcbiAgICAgICAgbGV0IHNvdXJjZURpclRvTW92ZSA9IHRlbXBFeHRyYWN0RGlyO1xuICAgICAgICBpZiAoZXh0cmFjdGVkSXRlbXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdEl0ZW1QYXRoID0gcGF0aC5qb2luKHRlbXBFeHRyYWN0RGlyLCBleHRyYWN0ZWRJdGVtc1swXSk7XG4gICAgICAgICAgICBpZiAoKGF3YWl0IGZzLnN0YXQoZmlyc3RJdGVtUGF0aCkpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAvLyDlgYforr7ov5nkuKrljZXnm67lvZXlsLHmmK/ljIXlkKvmiYDmnInlhoXlrrnnmoTnm67lvZVcbiAgICAgICAgICAgICAgICBzb3VyY2VEaXJUb01vdmUgPSBmaXJzdEl0ZW1QYXRoO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDlhoXlrrnlnKjlrZDnm67lvZUgJHtleHRyYWN0ZWRJdGVtc1swXX0g5Lit77yM5bCG5LuO5q2k5aSE56e75Yqo44CCYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlc1RvTW92ZSA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlRGlyVG9Nb3ZlKTtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzVG9Nb3ZlKSB7XG4gICAgICAgICAgICBjb25zdCBzcmNQYXRoID0gcGF0aC5qb2luKHNvdXJjZURpclRvTW92ZSwgZmlsZSk7XG4gICAgICAgICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih0YXJnZXREaXJJbkFzc2V0cywgZmlsZSk7XG4gICAgICAgICAgICBhd2FpdCBmcy5tb3ZlKHNyY1BhdGgsIGRlc3RQYXRoLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhg5paH5Lu25bey56e75Yqo5YiwICR7dGFyZ2V0RGlySW5Bc3NldHN9YCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+a4heeQhuS4tOaXtuaWh+S7ti4uLicpO1xuICAgICAgICBhd2FpdCBmcy5yZW1vdmUoemlwRmlsZVBhdGgpO1xuICAgICAgICBhd2FpdCBmcy5yZW1vdmUodGVtcEV4dHJhY3REaXIpO1xuICAgICAgICBjb25zb2xlLmxvZygn5Li05pe25paH5Lu25riF55CG5a6M5oiQ44CCJyk7XG5cbiAgICAgICAgLy8g5bCG5qih5p2/6aG555uu5Lit55qEIGFzc2V0cyDmlofku7blpLnlhoXlrrnnp7vliqjliLDpobnnm67moLkgYXNzZXRzIOebruW9le+8jOW5tuWIoOmZpOaooeadv+mhueebruWOn+ebruW9lVxuICAgICAgICBjb25zb2xlLmxvZyhg5YeG5aSH5aSE55CG5qih5p2/6aG555uuICR7cmVwb05hbWV9IOeahOWGhemDqCBhc3NldHMg5paH5Lu25aS5Li4uYCk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlSW5uZXJBc3NldHNQYXRoID0gcGF0aC5qb2luKHRhcmdldERpckluQXNzZXRzLCAnYXNzZXRzJyk7XG5cbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVtcGxhdGVJbm5lckFzc2V0c1BhdGgpICYmIChhd2FpdCBmcy5zdGF0KHRlbXBsYXRlSW5uZXJBc3NldHNQYXRoKSkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYOWPkeeOsOaooeadv+WGhemDqCBhc3NldHMg5paH5Lu25aS5OiAke3RlbXBsYXRlSW5uZXJBc3NldHNQYXRofWApO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYOWwhuWFtuWGheWuueenu+WKqOWIsOmhueebruS4uyBhc3NldHMg55uu5b2VOiAke2Fzc2V0c1BhdGh9YCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zSW5UZW1wbGF0ZUFzc2V0cyA9IGF3YWl0IGZzLnJlYWRkaXIodGVtcGxhdGVJbm5lckFzc2V0c1BhdGgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zSW5UZW1wbGF0ZUFzc2V0cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZUl0ZW1QYXRoID0gcGF0aC5qb2luKHRlbXBsYXRlSW5uZXJBc3NldHNQYXRoLCBpdGVtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvbkl0ZW1QYXRoID0gcGF0aC5qb2luKGFzc2V0c1BhdGgsIGl0ZW0pOyAvLyBhc3NldHNQYXRoIOaYr+mhueebrueahOS4uyBhc3NldHMg55uu5b2VXG5cbiAgICAgICAgICAgICAgICAvLyDlpoLmnpznm67moIflt7LlrZjlnKjvvIzlhYjlsJ3or5XliKDpmaTvvIznoa7kv50gbW92ZSDmk43kvZzlr7nkuo7mlofku7blpLnog73mraPnoa7opobnm5ZcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkZXN0aW5hdGlvbkl0ZW1QYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg55uu5qCH6Lev5b6EICR7ZGVzdGluYXRpb25JdGVtUGF0aH0g5bey5a2Y5Zyo77yM5bCG5YWI5Yig6Zmk5Lul6L+b6KGM6KaG55uW44CCYCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlbW92ZShkZXN0aW5hdGlvbkl0ZW1QYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXdhaXQgZnMubW92ZShzb3VyY2VJdGVtUGF0aCwgZGVzdGluYXRpb25JdGVtUGF0aCwgeyBvdmVyd3JpdGU6IHRydWUgfSk7IC8vIG92ZXJ3cml0ZSDpgILnlKjkuo7mlofku7bvvIzlr7nkuo7nm67lvZXvvIzlhYjliKDpmaTlho3np7vliqjmm7Tlj6/pnaBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5bey56e75YqoICR7aXRlbX0g5YiwICR7ZGVzdGluYXRpb25JdGVtUGF0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmqKHmnb/lhoXpg6ggYXNzZXRzIOWGheWuueenu+WKqOWujOaIkOOAgicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYOaooeadv+mhueebriAke3JlcG9OYW1lfSDkuK3mnKrmib7liLDlhoXpg6ggYXNzZXRzIOaWh+S7tuWkue+8jOaIluWFtuS4jeaYr+S4gOS4quebruW9leOAgui3s+i/h+enu+WKqOWGhemDqCBhc3NldHMg5q2l6aqk44CCYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhg5Yig6Zmk5qih5p2/6aG555uu5Y6f5aeL5qC555uu5b2VOiAke3RhcmdldERpckluQXNzZXRzfWApO1xuICAgICAgICBhd2FpdCBmcy5yZW1vdmUodGFyZ2V0RGlySW5Bc3NldHMpO1xuICAgICAgICBjb25zb2xlLmxvZyhg5qih5p2/6aG555uu5Y6f5aeL5qC555uu5b2VICR7dGFyZ2V0RGlySW5Bc3NldHN9IOW3suWIoOmZpOOAgmApO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCfliLfmlrAgQ29jb3MgQ3JlYXRvciDotYTmupDmlbDmja7lupMuLi4nKTtcbiAgICAgICAgRWRpdG9yLk1lc3NhZ2Uuc2VuZCgnYXNzZXQtZGInLCAncmVmcmVzaCcpOyBcbiAgICAgICAgY29uc29sZS5sb2coJ+i1hOa6kOaVsOaNruW6k+WIt+aWsOivt+axguW3suWPkemAgeOAgicpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGDmqKHmnb/pobnnm64gJHtyZXBvTmFtZX0g5bey5oiQ5Yqf5LiL6L295bm26Kej5Y6L5YiwICR7dGFyZ2V0RGlySW5Bc3NldHN9YCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYOWIm+W7uuaooeadv+i/h+eoi+S4reWPkeeUn+mUmeivrzogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICBpZiAoZXJyb3Iuc3RhY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3Iuc3RhY2spO1xuICAgICAgICB9XG4gICAgfVxufSJdfQ==