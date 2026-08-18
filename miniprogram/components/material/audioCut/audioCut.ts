import { saveFileWithCleanup } from "../../../utils/wxapp/clean";

Component({
    properties: {
    },

    data: {
        audioSrc: '',
        audioName: '',
        audioDuration: 0,
        formattedDuration: "0'00\"",

        startTime: 0,
        endTime: 30,
        maxStart: 0,

        startDisplay: '0.0',
        endDisplay: '30.0',
        segmentLen: '30.0',

        isAudioLoaded: false,
        isCropping: false,
        errorMsg: '',

        waveformData: [] as number[],
    },

    lifetimes: {
        attached() {
            (this as any)._innerAudioContext = wx.createInnerAudioContext();
            (this as any)._innerAudioContext.onError((err: any) => {
                console.error('音频播放错误', err);
            });
        },
        detached() {
            if ((this as any)._playInterval) {
                clearInterval((this as any)._playInterval);
                (this as any)._playInterval = null;
            }
            if ((this as any)._innerAudioContext) {
                (this as any)._innerAudioContext.destroy();
                (this as any)._innerAudioContext = null;
            }
            (this as any)._audioBuffer = null;
            (this as any)._croppedSrc = null;
        },
    },

    methods: {
        chooseAudio() {
            wx.chooseMessageFile({
                count: 1,
                type: 'file',
                extension: ['mp3', 'wav', 'aac', 'm4a', 'flac'],
                success: (res) => {
                    const tempFile = res.tempFiles[0];
                    if (tempFile.size > 50 * 1024 * 1024) {
                        this.setData({ errorMsg: '文件不能超过50MB' });
                        return;
                    }
                    this._loadAudio(tempFile.path, tempFile.name || '音频文件');
                },
                fail: (err) => {
                    console.error('选择音频失败', err);
                    this.setData({ errorMsg: '选择音频失败' });
                },
            });
        },

        async _loadAudio(filePath: string, fileName: string) {
            console.log(filePath, fileName)
            wx.showLoading({ title: '加载音频...' });

            const savedPath = `${wx.env.USER_DATA_PATH}/audio_${Date.now()}.mp3`;
            // wx.getFileSystemManager().saveFileSync(filePath, savedPath);
            saveFileWithCleanup(filePath, savedPath);

            // 使用 WebAudioContext.decodeAudioData 获取时长，真机上比 InnerAudioContext 可靠
            // buffer.duration 由解码后的采样数/采样率计算得出，不依赖原生播放器 metadata 解析
            const audioCtx = wx.createWebAudioContext();
            const fs = wx.getFileSystemManager();

            fs.readFile({
                filePath: savedPath,
                success: (res: any) => {
                    audioCtx.decodeAudioData(res.data, (buffer: any) => {
                        (this as any)._audioBuffer = buffer;
                        const duration = buffer.duration;

                        if (!duration || isNaN(duration)) {
                            audioCtx.close();
                            wx.hideLoading();
                            this.setData({ errorMsg: '无法获取音频时长，文件可能损坏' });
                            return;
                        }

                        const endTime = Math.min(duration, 30);
                        const maxStart = Math.max(0, duration - 0.1);
                        const peaks = this._extractPeaks(buffer);

                        // 一次性 setData，让 canvas 随 isAudioLoaded 一起渲染出来
                        this.setData({
                            audioSrc: savedPath,
                            audioName: fileName,
                            audioDuration: duration,
                            formattedDuration: this._formatTime(duration),
                            startTime: 0,
                            endTime: endTime,
                            maxStart: maxStart,
                            isAudioLoaded: true,
                            startDisplay: '0.0',
                            endDisplay: endTime.toFixed(1),
                            segmentLen: endTime.toFixed(1),
                            waveformData: peaks,
                        }, () => {
                            // setData 回调中 canvas 已渲染，可以安全绘制
                            this._drawWaveform();
                        });

                        wx.hideLoading();
                        audioCtx.close();
                    }, (err: any) => {
                        console.error('解码音频失败', err);
                        audioCtx.close();
                        wx.hideLoading();
                        this._useMockWaveform();
                        this.setData({
                            audioSrc: savedPath,
                            audioName: fileName,
                            isAudioLoaded: true,
                            errorMsg: '音频解码失败，波形图不可用',
                        });
                    });
                },
                fail: (err: any) => {
                    console.error('读取文件失败', err);
                    wx.hideLoading();
                    this.setData({ errorMsg: '音频文件读取失败' });
                },
            });
        },

        _analyzeWaveform(filePath: string) {
            const audioCtx = wx.createWebAudioContext();
            const fs = wx.getFileSystemManager();

            fs.readFile({
                filePath,
                success: (res: any) => {
                    audioCtx.decodeAudioData(res.data, (buffer: any) => {
                        this._audioBuffer = buffer;
                        const peaks = this._extractPeaks(buffer);
                        this.setData({ waveformData: peaks });
                        this._drawWaveform();
                        wx.hideLoading();
                        audioCtx.close();
                    }, (err: any) => {
                        console.error('解码音频失败', err);
                        wx.hideLoading();
                        this._useMockWaveform();
                    });
                },
                fail: (err: any) => {
                    console.error('读取文件失败', err);
                    wx.hideLoading();
                    this._useMockWaveform();
                },
            });
        },

        _extractPeaks(buffer: any, targetPoints: number = 100): number[] {
            const channels = buffer.numberOfChannels;
            const length = buffer.length;
            const samplesPerPoint = Math.floor(length / targetPoints);
            const points: number[] = [];

            for (let i = 0; i < targetPoints; i++) {
                let maxAmp = 0;
                const start = i * samplesPerPoint;
                const end = Math.min(start + samplesPerPoint, length);
                for (let ch = 0; ch < channels; ch++) {
                    const data = buffer.getChannelData(ch);
                    for (let j = start; j < end; j++) {
                        const amp = Math.abs(data[j]);
                        if (amp > maxAmp) maxAmp = amp;
                    }
                }
                points.push(maxAmp);
            }

            const maxVal = Math.max(...points, 0.001);
            return points.map(p => 10 + (p / maxVal) * 70);
        },

        _useMockWaveform() {
            const count = 80;
            const points: number[] = [];
            for (let i = 0; i < count; i++) {
                const height = 30 + Math.sin(i * 0.5) * 15 + Math.random() * 20;
                points.push(Math.min(80, Math.max(15, height)));
            }
            this.setData({ waveformData: points });
            this._drawWaveform();
        },

        _drawWaveform() {
            const { waveformData, startTime, endTime, audioDuration } = this.data;
            if (!waveformData.length) return;

            const query = this.createSelectorQuery();
            query.select('#waveformCanvas')
                .fields({ node: true, size: true })
                .exec((res: any) => {
                    if (!res[0] || !res[0].node) return;

                    const canvas = res[0].node;
                    const ctx = canvas.getContext('2d');
                    const width = res[0].width;
                    const height = res[0].height;

                    canvas.width = width;
                    canvas.height = height;
                    ctx.clearRect(0, 0, width, height);

                    const barWidth = width / waveformData.length;

                    for (let i = 0; i < waveformData.length; i++) {
                        const barHeight = Math.max(2, (waveformData[i] / 100) * height);
                        const x = i * barWidth;
                        const y = (height - barHeight) / 2;
                        const timeAtBar = (i / waveformData.length) * audioDuration;
                        const inRange = timeAtBar >= startTime && timeAtBar <= endTime;

                        ctx.fillStyle = inRange ? '#3b82f6' : '#94a3b8';
                        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
                    }
                });
        },

        _applyStartTime(val: number) {
            this.stopAudio();
            const { audioDuration } = this.data;
            const startTime = Math.max(0, Math.min(val, audioDuration - 0.1));
            const endTime = Math.min(startTime + 30, audioDuration);

            this.setData({
                startTime,
                endTime,
                startDisplay: startTime.toFixed(1),
                endDisplay: endTime.toFixed(1),
                segmentLen: (endTime - startTime).toFixed(1),
            });
            this._drawWaveform();
        },

        _applyEndTime(val: number) {
            this.stopAudio();
            const { audioDuration } = this.data;
            const endTime = Math.max(0.1, Math.min(val, audioDuration));
            const startTime = Math.max(0, endTime - 30);

            this.setData({
                startTime,
                endTime,
                startDisplay: startTime.toFixed(1),
                endDisplay: endTime.toFixed(1),
                segmentLen: (endTime - startTime).toFixed(1),
            });
            this._drawWaveform();
        },

        onStartChanging(e: WechatMiniprogram.SliderChanging) {
            this._applyStartTime(e.detail.value);
        },

        onStartChange(e: WechatMiniprogram.SliderChange) {
            this._applyStartTime(e.detail.value);
        },

        onEndChanging(e: WechatMiniprogram.SliderChanging) {
            this._applyEndTime(e.detail.value);
        },

        onEndChange(e: WechatMiniprogram.SliderChange) {
            this._applyEndTime(e.detail.value);
        },

        resetInterval() {
            const { audioDuration } = this.data;
            const endTime = Math.min(30, audioDuration);
            this.setData({
                startTime: 0,
                endTime: endTime,
                startDisplay: '0.0',
                endDisplay: endTime.toFixed(1),
                segmentLen: endTime.toFixed(1),
            });
            this._drawWaveform();
        },

        onWaveformTap(e: WechatMiniprogram.TouchEvent) {
            if (!this.data.isAudioLoaded) return;
            const query = this.createSelectorQuery();
            query.select('#waveformCanvas')
                .fields({ node: true, size: true })
                .exec((res: any) => {
                    if (!res[0]) return;
                    const width = res[0].width;
                    const touchX = e.detail.x;
                    const ratio = Math.max(0, Math.min(1, touchX / width));
                    const { audioDuration } = this.data;
                    const clickTime = ratio * audioDuration;
                    const newStart = Math.max(0, Math.min(clickTime, audioDuration - 0.1));
                    const newEnd = Math.min(newStart + 30, audioDuration);

                    this.setData({
                        startTime: newStart,
                        endTime: newEnd,
                        startDisplay: newStart.toFixed(1),
                        endDisplay: newEnd.toFixed(1),
                        segmentLen: (newEnd - newStart).toFixed(1),
                    });
                    this._drawWaveform();
                });
        },

        playOriginal() {
            if (!this.data.audioSrc) return;

            this.stopAudio();

            const ctx = (this as any)._innerAudioContext as WechatMiniprogram.InnerAudioContext;
            ctx.src = this.data.audioSrc;
            ctx.seek(this.data.startTime);
            ctx.play();

            const intervalId = setInterval(() => {
                if (ctx.currentTime >= this.data.endTime) {
                    ctx.stop();
                }
            }, 100);

            (this as any)._playInterval = intervalId;
            ctx.onStop(() => {
                if ((this as any)._playInterval) {
                    clearInterval((this as any)._playInterval);
                    (this as any)._playInterval = null;
                }
            });
        },

        stopAudio() {
            if ((this as any)._playInterval) {
                clearInterval((this as any)._playInterval);
                (this as any)._playInterval = null;
            }
            if ((this as any)._innerAudioContext) {
                ((this as any)._innerAudioContext as WechatMiniprogram.InnerAudioContext).stop();
            }
        },

        confirmCut() {
            this.stopAudio();

            if (!this._audioBuffer) {
                this.setData({ errorMsg: '请先上传音频' });
                return;
            }

            const { startTime, endTime } = this.data;
            if (startTime >= endTime) {
                this.setData({ errorMsg: '起始时间必须小于结束时间' });
                return;
            }

            this.setData({ isCropping: true, errorMsg: '' });
            wx.showLoading({ title: '裁剪处理中...' });

            try {
                const buffer = this._audioBuffer;
                const sampleRate = buffer.sampleRate;
                const channels = buffer.numberOfChannels;
                const startSample = Math.floor(startTime * sampleRate);
                const endSample = Math.floor(endTime * sampleRate);
                const newLength = endSample - startSample;

                const audioCtx = wx.createWebAudioContext();
                const newBuffer = audioCtx.createBuffer(channels, newLength, sampleRate);

                for (let ch = 0; ch < channels; ch++) {
                    const oldData = buffer.getChannelData(ch);
                    const newData = newBuffer.getChannelData(ch);
                    for (let i = 0; i < newLength; i++) {
                        newData[i] = oldData[startSample + i];
                    }
                }

                const wavBuffer = this._audioBufferToWav(newBuffer);
                const tempFilePath = `${wx.env.USER_DATA_PATH}/cropped_${Date.now()}.wav`;

                const fs = wx.getFileSystemManager();
                fs.writeFile({
                    filePath: tempFilePath,
                    data: wavBuffer,
                    success: () => {
                        wx.hideLoading();
                        this.setData({ isCropping: false });
                        this._croppedSrc = tempFilePath;

                        this.triggerEvent('confirm', {
                            tempFilePath,
                            startTime,
                            endTime,
                            duration: endTime - startTime,
                            fileName: this.data.audioName,
                        });

                        this._resetState();
                    },
                    fail: (err: any) => {
                        console.error('保存裁剪音频失败', err);
                        wx.hideLoading();
                        this.setData({ isCropping: false, errorMsg: '裁剪失败，请重试' });
                    },
                });

                audioCtx.close();
            } catch (e) {
                console.error('裁剪出错', e);
                wx.hideLoading();
                this.setData({ isCropping: false, errorMsg: '裁剪处理出错' });
            }
        },

        _audioBufferToWav(audioBuffer: any): ArrayBuffer {
            const numChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const samples = audioBuffer.length;
            const dataSize = samples * numChannels * 2;
            const totalSize = 44 + dataSize;
            const buffer = new ArrayBuffer(totalSize);
            const view = new DataView(buffer);

            let pos = 0;
            view.setUint8(pos++, 0x52); view.setUint8(pos++, 0x49);
            view.setUint8(pos++, 0x46); view.setUint8(pos++, 0x46);
            view.setUint32(pos, totalSize - 8, true); pos += 4;
            view.setUint8(pos++, 0x57); view.setUint8(pos++, 0x41);
            view.setUint8(pos++, 0x56); view.setUint8(pos++, 0x45);
            view.setUint8(pos++, 0x66); view.setUint8(pos++, 0x6D);
            view.setUint8(pos++, 0x74); view.setUint8(pos++, 0x20);
            view.setUint32(pos, 16, true); pos += 4;
            view.setUint16(pos, 1, true); pos += 2;
            view.setUint16(pos, numChannels, true); pos += 2;
            view.setUint32(pos, sampleRate, true); pos += 4;
            view.setUint32(pos, sampleRate * numChannels * 2, true); pos += 4;
            view.setUint16(pos, numChannels * 2, true); pos += 2;
            view.setUint16(pos, 16, true); pos += 2;
            view.setUint8(pos++, 0x64); view.setUint8(pos++, 0x61);
            view.setUint8(pos++, 0x74); view.setUint8(pos++, 0x61);
            view.setUint32(pos, dataSize, true); pos += 4;

            const interleaved = new Int16Array(samples * numChannels);
            for (let ch = 0; ch < numChannels; ch++) {
                const channelData = audioBuffer.getChannelData(ch);
                for (let i = 0; i < samples; i++) {
                    let sample = Math.max(-1, Math.min(1, channelData[i]));
                    interleaved[i * numChannels + ch] = Math.floor(sample * 32767);
                }
            }

            const dataView = new DataView(buffer, 44);
            for (let i = 0; i < interleaved.length; i++) {
                dataView.setInt16(i * 2, interleaved[i], true);
            }

            return buffer;
        },

        onCancel() {
            this._resetState();
            this.triggerEvent('cancel');
        },

        clearError() {
            this.setData({ errorMsg: '' });
        },

        _resetState() {
            this.stopAudio();
            (this as any)._audioBuffer = null;
            (this as any)._croppedSrc = null;
            this.setData({
                isAudioLoaded: false,
                audioSrc: '',
                audioName: '',
                audioDuration: 0,
                formattedDuration: "0'00\"",
                startTime: 0,
                endTime: 30,
                maxStart: 0,
                startDisplay: '0.0',
                endDisplay: '30.0',
                segmentLen: '30.0',
                isCropping: false,
                errorMsg: '',
                waveformData: [],
            });
        },

        reupload() {
            this._resetState();
            this.chooseAudio();
        },

        _formatTime(seconds: number): string {
            if (!seconds || isNaN(seconds)) return "0'00\"";
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}'${sec.toString().padStart(2, '0')}"`;
        },
    },
});

