/**
 * 带自动清理的保存文件方法
 * @param tempFilePath 临时文件路径
 * @param targetPath 目标保存路径
 * @returns 保存成功后的路径，失败返回空字符串
 */
export async function saveFileWithCleanup(tempFilePath: string, targetPath?: string): Promise<string> {
    try {
        // 尝试直接保存
        const savedPath = wx.getFileSystemManager().saveFileSync(tempFilePath, targetPath);
        console.log('保存成功:', savedPath);
        return savedPath;
    } catch (err: any) {
        // 检查是否是空间不足错误 (错误码 1300202)
        if ((err?.errMsg || err?.message).includes('exceeded the maximum size') || err.errno === 1300202) {
            console.warn('存储空间不足，开始清理旧文件...');

            // 执行清理并重试
            const cleaned = await cleanOldFilesAndRetry(tempFilePath, targetPath);
            if (cleaned) {
                return cleaned;
            }
        }

        console.error('保存失败:', err);
        throw err;
    }
}

/**
 * 清理旧文件后重试保存
 */
async function cleanOldFilesAndRetry(tempFilePath: string, targetPath?: string): Promise<string | null> {
    // 获取所有已保存的文件列表
    const fileList = await getSavedFileList();
    console.log(fileList);
    if (fileList.length === 0) {
        console.error('没有可清理的文件，保存失败');
        return null;
    }

    // 按修改时间排序，删除最早的文件（或最旧的几个）
    const sortedFiles = fileList.sort((a, b) => a.createTime - b.createTime);

    // 计算需要释放的空间（这里简单估算为删除最旧的2个文件）
    let freedSpace = 0;
    const filesToDelete: string[] = [];

    for (const file of sortedFiles) {
        if (filesToDelete.length >= 3) break; // 最多删除3个文件
        filesToDelete.push(file.filePath);
        freedSpace += file.size;
    }

    console.log(`准备删除 ${filesToDelete.length} 个文件，释放约 ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);

    // 执行删除
    for (const filePath of filesToDelete) {
        try {
            wx.getFileSystemManager().removeSavedFile({
                filePath: filePath,
                fail: (err) => console.warn('删除文件失败:', filePath, err)
            });
        } catch (e) {
            console.warn('删除文件异常:', filePath, e);
        }
    }

    // 等待删除完成（微信删除操作是异步的，简单延迟后重试）
    await delay(300);

    // 重试保存
    try {
        const savedPath = wx.getFileSystemManager().saveFileSync(tempFilePath, targetPath);
        console.log('清理后保存成功:', savedPath);
        return savedPath;
    } catch (retryErr) {
        console.error('清理后保存仍然失败:', retryErr);
        return null;
    }
}

/**
 * 获取已保存的文件列表
 */
async function getSavedFileList(): Promise<WechatMiniprogram.FileItem[]> {
    return new Promise((resolve, reject) => {
        wx.getFileSystemManager().getSavedFileList({
            success: (res) => resolve(res.fileList),
            fail: (err) => {
                console.log(err);
                reject(err)
            }
        });
    });
}

/**
 * 延时工具函数
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 手动清理所有缓存文件（供用户主动触发）
 */
async function manualCleanAllFiles(): Promise<void> {
    try {
        const fileList = await getSavedFileList();
        for (const file of fileList) {
            wx.getFileSystemManager().removeSavedFile({
                filePath: file.filePath,
                success: () => console.log('已删除:', file.filePath),
                fail: (err) => console.warn('删除失败:', file.filePath, err)
            });
        }
        console.log(`已清理 ${fileList.length} 个缓存文件`);

        // 可选：提示用户
        wx.showToast({
            title: `已清理 ${fileList.length} 个文件`,
            icon: 'success'
        });
    } catch (err) {
        console.error('清理失败:', err);
        wx.showToast({ title: '清理失败', icon: 'error' });
    }
}