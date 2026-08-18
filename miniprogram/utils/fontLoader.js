class FontLoader {
    constructor() {
        this.fs = wx.getFileSystemManager();
        this.fontCacheDir = `${wx.env.USER_DATA_PATH}/fonts`; // 字体缓存目录
        this.initCacheDir();
    }

    // 初始化缓存目录
    initCacheDir() {
        try {
            // 尝试创建目录，如果已存在会抛异常，我们忽略即可
            this.fs.mkdirSync(this.fontCacheDir, { recursive: true });
        } catch (e) {
            console.log('字体缓存目录已存在或创建失败', e);
        }
    }

    // 获取字体的本地缓存路径
    getFontCachePath(fontFamily, fontUrl) {
        // 用字体名和URL生成一个唯一文件名
        const urlHash = this.hashCode(fontUrl).toString();
        const safeFamilyName = fontFamily.replace(/[^a-zA-Z0-9]/g, '_');
        console.log(`${this.fontCacheDir}/${safeFamilyName}_${urlHash}.ttf`);
        return `${this.fontCacheDir}/${safeFamilyName}_${urlHash}.ttf`;
    }

    // 简单的哈希函数，用于生成唯一文件名
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // 检查字体是否已缓存
    isFontCached(cachePath) {
        try {
            this.fs.accessSync(cachePath);
            return true;
        } catch (e) {
            return false;
        }
    }

    // 下载并保存字体到本地
    async downloadAndSaveFont(fontUrl, cachePath) {
        try {
            console.log(`开始下载字体: ${fontUrl}`);

            // 下载字体文件
            const downloadRes = await this.downloadFile(fontUrl);
            const tempFilePath = downloadRes.tempFilePath;
            console.log(tempFilePath, cachePath);
            // 保存到永久缓存目录
            const savedPath = await this.saveFile(tempFilePath, cachePath);
            console.log(`字体已保存到: ${savedPath}`);

            return savedPath;
        } catch (error) {
            console.error('下载字体失败:', error);
            throw new Error(`下载字体失败: ${error.errMsg || error.message}`);
        }
    }

    // 封装下载方法为Promise
    downloadFile(url) {
        return new Promise((resolve, reject) => {
            wx.downloadFile({
                url: url,
                success: resolve,
                fail: reject
            });
        });
    }

    // 封装保存文件方法为Promise
    saveFile(tempFilePath, targetPath) {
        return new Promise((resolve, reject) => {
            this.fs.saveFile({
                tempFilePath: tempFilePath,
                filePath: targetPath,
                success: (res) => resolve(res.savedFilePath),
                fail: reject
            });
        });
    }

    // 从本地文件读取为Base64
    async readFontAsBase64(filePath) {
        try {
            const res = await this.readFile(filePath);
            const base64Data = wx.arrayBufferToBase64(res.data);
            return `data:font/truetype;charset=utf-8;base64,${base64Data}`;
        } catch (error) {
            console.error('读取字体文件失败:', error);
            throw error;
        }
    }

    // 封装读取文件方法为Promise
    readFile(filePath) {
        return new Promise((resolve, reject) => {
            this.fs.readFile({
                filePath: filePath,
                success: resolve,
                fail: reject
            });
        });
    }

    // 加载单个字体（核心方法）
    async loadSingleFont(fontFamily, fontUrl, options = {}) {
        const cachePath = this.getFontCachePath(fontFamily, fontUrl);

        try {
            let fontSource;

            // 1. 检查是否有缓存
            // if (this.isFontCached(cachePath)) {
            //     console.log(`使用缓存字体: ${fontFamily} - ${cachePath}`);
            //     // 从缓存读取Base64
            //     fontSource = await this.readFontAsBase64(cachePath);
            // } else {
            //     console.log(`下载新字体: ${fontFamily}`);
            //     // 下载并保存
            //     const savedPath = await this.downloadAndSaveFont(fontUrl, cachePath);
            //     // 转换为Base64
            //     fontSource = await this.readFontAsBase64(savedPath);
            // }

            // 2. 调用 loadFontFace 加载字体
            await this.loadFontFace(fontFamily, fontSource, options);

            console.log(`字体加载成功: ${fontFamily}`);
            return { success: true, fontFamily };

        } catch (error) {
            console.error(`字体加载失败 ${fontFamily}:`, error);
            return {
                success: false,
                fontFamily,
                error: error.errMsg || error.message
            };
        }
    }

    // 封装 loadFontFace 为 Promise
    loadFontFace(fontFamily, source, options = {}) {
        return new Promise((resolve, reject) => {
            wx.loadFontFace({
                family: fontFamily,
                source: source,
                desc: options.desc || { weight: 'normal', style: 'normal' },
                fail: () => {
                    console.log("fail", fontFamily)
                },
                success: () => {
                    console.log("success", fontFamily)
                    resolve(fontFamily);
                },
                complete: (message) => {
                    console.log("complete", fontFamily)
                    reject(fontFamily);
                },
            });
        });
    }

    // 串行加载多个字体（核心功能）
    loadFontsSequentially(fonts) {
        const results = [];
        let index = 0;
        return new Promise((resolve, reject) => {
            const requestIDle = () => {
                wx.requestIdleCallback(async (deadline) => {
                    console.log("deadline", deadline.timeRemaining());
                    if (deadline.timeRemaining() > 16.7) {
                        const { family, url, options = {} } = fonts[index++];
                        console.log(`开始处理第 ${index}/${fonts.length} 个字体: ${family}`);
                        const result = await this.loadSingleFont(family, url, options);
                        results.push(result);
                    }
                    if (results.length < 5) requestIDle();
                    else resolve(results);
                });
            }
            requestIDle();
        })
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 清理字体缓存（可选）
    clearFontCache() {
        try {
            const files = this.fs.readdirSync(this.fontCacheDir);
            files.forEach(file => {
                this.fs.unlinkSync(`${this.fontCacheDir}/${file}`);
            });
            console.log('字体缓存已清理');
        } catch (e) {
            console.error('清理缓存失败:', e);
        }
    }
}

export default FontLoader;