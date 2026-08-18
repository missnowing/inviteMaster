import { TInvitation } from "../../store/invitation";
import { TFavorite, cancelFavorite, checkFavorite, createFavorite } from "../../store/favorite";
import { TTemplate } from "../../store/template";
import { _CDN } from "../../store/global";
import { checkResponse, TResponse } from "../../store/response";

Page({
    data: {
        style: {
            fontsize: getApp().globalData.style.rem,
        },
        se: "",
        bg: "",
        template: null as unknown as TTemplate,
        invitation: null as unknown as TInvitation,
        favorite: !1 as Boolean,
        response: null as TResponse | null,
        play: !1,
    },
    onUnload() {
        this.release();
    },
    onLoad(props) {
        console.log(props);
        const { se, bg } = props;
        const channel = this.getOpenerEventChannel();
        channel.on('dataFromIndex', ({ template }) => {
            console.log("dataFromIndex", template);
            this.setData({ template, se, bg })
            if (template.backgroundMusic) {
                this._playMusic(template.backgroundMusic);
            }
        });
        channel.on('dataFromMine', ({ template, invitation }) => {
            console.log("dataFromMine", template, invitation);
            this.setData({ se, bg });
            if (template) this.setData({ template });
            if (invitation) {
                checkFavorite(invitation.id).then((favorite: Boolean) => {
                    this.setData({ favorite })
                });
                this.setData({ invitation });
                if (invitation.backgroundMusic) {
                    this._playMusic(invitation.backgroundMusic);
                }
                checkResponse(invitation.id).then(response => {
                    this.setData({ response })
                })
            }
        });
    },
    /**
     * 制作
     */
    tapCreate() {
        const { template } = this.data;
        wx.navigateTo({
            url: `./create/create`,
            routeType: "wx://zoom",
            events: {
                // 为指定事件添加一个监听器，获取被打开页面传送到当前页面的数据
                dataFromIndex: function ({ data }: any) {
                    console.log(data);
                },
            },
            success: (res) => {
                // 通过eventChannel向被打开页面传送数据
                res.eventChannel.emit('dataFromShow', { template })
                this.tapPause();
            },
        })
    },
    /**
     * 回复
     */
    tapReply() {
        const component = this.selectComponent("#the-response");
        component.onTapOpenComment();
    },
    /**
     * 收藏
     */
    tapFavorite() {
        const { favorite, invitation } = this.data;
        favorite && cancelFavorite(invitation.id).then(_ => {
            this.setData({ favorite: !favorite });
            wx.showToast({ title: '已取消收藏！', icon: 'success' })
            setTimeout(() => {
                wx.navigateBack();
            }, 1000);
        });
    },
    /**
     * 播放-暂停
     * @returns 
     */
    tapPlay() {
        let _audioContext = (this as any)._audioContext;
        if (!_audioContext) return;
        const paused = _audioContext.paused;
        this.setData({ play: paused ? !0 : !1 }, () => {
            paused ? _audioContext.play() : _audioContext.pause();
        })
    },
    tapPause() {
        let _audioContext = (this as any)._audioContext;
        if (!_audioContext) return;
        const paused = _audioContext.paused;
        if (paused) return;
        this.setData({ play: !1 }, () => {
            _audioContext.pause();
        })
    },
    release() {
        const _audioContext = (this as any)._audioContext;
        if (_audioContext) {
            _audioContext.destroy();
            (this as any)._audioContext = null;
        }
    },

    /**
     * 应邀相关
     */
    onCancel() {
        const component = this.selectComponent("#the-response");
        component.onTapCloseComment();
    },
    onSubmit() {
        const component = this.selectComponent("#the-Form");
        component.onSubmit();
    },
    triggerSubmit(message: 'cancel' | 'submit') {
        if (message) {
            this.onCancel();
        }
    },

    /**
     * 播放网络地址音乐
     * @param src 网络地址
     */
    _playMusic(src: string) {
        let _audioContext = (this as any)._audioContext;
        _audioContext && _audioContext.destroy();
        _audioContext = wx.createInnerAudioContext();
        _audioContext.onPlay(() => {
            this.setData({ play: !0 });
        });
        _audioContext.onError(() => {
            this.setData({ play: !1 });
        });
        _audioContext.loop = !0;
        _audioContext.src = src.includes(_CDN) ? src : _CDN + src;
        _audioContext.play();
        (this as any)._audioContext = _audioContext;
    },
})
