const AUDIO_CACHE_PREFIX = `${wx.env.USER_DATA_PATH}/audio_`;

export async function saveFileWithCleanup(tempFilePath: string, targetPath?: string): Promise<string> {
    try {
        return wx.getFileSystemManager().saveFileSync(tempFilePath, targetPath);
    } catch (err: any) {
        const message = err?.errMsg || err?.message || "";
        const storageExceeded = message.includes('exceeded the maximum size') || err?.errno === 1300202;
        if (!storageExceeded) throw err;

        const cleaned = await cleanOldAudioFilesAndRetry(tempFilePath, targetPath);
        if (cleaned) {
            return cleaned;
        }
        throw err;
    }
}

async function cleanOldAudioFilesAndRetry(tempFilePath: string, targetPath?: string): Promise<string | null> {
    const fileList = (await getSavedFileList())
        .filter(file => file.filePath.startsWith(AUDIO_CACHE_PREFIX));
    if (fileList.length === 0) {
        return null;
    }

    const sortedFiles = fileList.sort((a, b) => a.createTime - b.createTime);
    await Promise.all(sortedFiles.slice(0, 3).map(file => removeSavedFile(file.filePath)));

    try {
        return wx.getFileSystemManager().saveFileSync(tempFilePath, targetPath);
    } catch (_) {
        return null;
    }
}

async function getSavedFileList(): Promise<WechatMiniprogram.FileItem[]> {
    return new Promise((resolve, reject) => {
        wx.getFileSystemManager().getSavedFileList({
            success: (res) => resolve(res.fileList),
            fail: reject,
        });
    });
}

const removeSavedFile = (filePath: string) => new Promise<void>((resolve) => {
    wx.getFileSystemManager().removeSavedFile({
        filePath,
        complete: () => resolve(),
    });
});
