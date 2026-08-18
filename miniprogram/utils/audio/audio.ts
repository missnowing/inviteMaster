
class AudioPlayer {
    #tempPath = ''
    #audioCtx: WechatMiniprogram.WebAudioContext = null
    #newBuffer: any = null
    #audioSource: any = null

    constructor(tempPath: string) {
        this.#tempPath = tempPath;
        this.#audioCtx = wx.createWebAudioContext();
    }

    play() {
        this.playBuffer();
    }
    stop() {
        this.#audioSource.stop();
    }
    destory() {
        this.#audioCtx = null
        this.#newBuffer = null
        this.#audioSource = null
    }

    playBuffer() {
        const audioCtx = this.#audioCtx,
            newBuffer = this.#newBuffer;
        if (!audioCtx) throw new Error("audioCtx not existing!");
        const source = audioCtx.createBufferSource();
        source.buffer = newBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
            source.disconnect();
        };
        source.start();
        this.#audioSource = source;
    }

    uploadAudio({
        length = 30,
        callback = () => { }
    }: {
        length?: number,
        callback: (...args: any) => void
    }) {
        const audioCtx = this.#audioCtx;
        if (!audioCtx) throw new Error("audioCtx not existing!");
        wx.getFileSystemManager().readFile({
            filePath: this.#tempPath,
            success: (fileRes) => {
                console.log(fileRes);
                audioCtx.decodeAudioData(fileRes.data, (buffer: any) => {
                    console.log(buffer);
                    const duration = buffer.duration;
                    const sampleRate = buffer.sampleRate;
                    const channels = buffer.numberOfChannels;
                    // 如果音频不足30秒，裁剪到实际长度
                    let endSample = Math.min(length * sampleRate, buffer.length);
                    let newLength = endSample;
                    // 6. 创建新缓冲并复制前30秒数据
                    const newBuffer = audioCtx.createBuffer(channels, newLength, sampleRate);
                    for (let channel = 0; channel < channels; channel++) {
                        const oldData = buffer.getChannelData(channel);
                        const newData = newBuffer.getChannelData(channel);
                        for (let i = 0; i < newLength; i++) {
                            newData[i] = oldData[i];
                        }
                    }
                    console.log('裁剪完成，新音频时长:', newBuffer.duration, '秒');
                    console.log('newBuffer:', newBuffer);
                    this.#newBuffer = newBuffer;
                    // this.playBuffer();
                    callback?.(newBuffer);
                }, (err) => {
                    console.error('解码失败', err);
                });
            },
            fail: (err) => {
                console.error('读取文件失败', err);
            }
        });
    }

    audioBufferToWavOptimized(audioBuffer) {
        console.log('=== 开始优化转换 ===');

        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const samples = audioBuffer.length;

        const dataSize = samples * numChannels * 2;
        const totalSize = 44 + dataSize;

        console.log(`数据量: ${dataSize} bytes, 总大小: ${totalSize} bytes`);

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        // 写入 WAV 头部（同之前）
        let pos = 0;

        // "RIFF"
        view.setUint8(pos++, 0x52); view.setUint8(pos++, 0x49);
        view.setUint8(pos++, 0x46); view.setUint8(pos++, 0x46);
        view.setUint32(pos, totalSize - 8, true); pos += 4;

        // "WAVE"
        view.setUint8(pos++, 0x57); view.setUint8(pos++, 0x41);
        view.setUint8(pos++, 0x56); view.setUint8(pos++, 0x45);

        // "fmt "
        view.setUint8(pos++, 0x66); view.setUint8(pos++, 0x6D);
        view.setUint8(pos++, 0x74); view.setUint8(pos++, 0x20);

        view.setUint32(pos, 16, true); pos += 4;
        view.setUint16(pos, 1, true); pos += 2;
        view.setUint16(pos, numChannels, true); pos += 2;
        view.setUint32(pos, sampleRate, true); pos += 4;
        view.setUint32(pos, sampleRate * numChannels * 2, true); pos += 4;
        view.setUint16(pos, numChannels * 2, true); pos += 2;
        view.setUint16(pos, 16, true); pos += 2;

        // "data"
        view.setUint8(pos++, 0x64); view.setUint8(pos++, 0x61);
        view.setUint8(pos++, 0x74); view.setUint8(pos++, 0x61);
        view.setUint32(pos, dataSize, true); pos += 4;

        console.log('头部写入完成，开始写入音频数据...');

        // 使用 TypedArray 批量处理，而不是逐样本循环
        const bytesPerChannel = samples * 2; // 每个声道 16-bit
        const interleaved = new Int16Array(samples * numChannels);

        // 批量转换数据
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            const offset = channel;

            for (let i = 0; i < samples; i++) {
                // 将浮点数 (-1..1) 转换为 16-bit 整数
                let sample = channelData[i];
                sample = Math.max(-1, Math.min(1, sample));
                const intSample = Math.floor(sample * 32767);
                interleaved[i * numChannels + offset] = intSample;
            }

            // 每处理完一个声道输出进度
            console.log(`声道 ${channel + 1}/${numChannels} 处理完成`);
        }

        // 一次性写入所有数据
        const dataView = new DataView(buffer, 44);
        for (let i = 0; i < interleaved.length; i++) {
            dataView.setInt16(i * 2, interleaved[i], true);
        }

        console.log('音频数据写入完成');
        return buffer;
    }
}


export default AudioPlayer
