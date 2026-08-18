import { _CDN, setPerlogo, wxLogin } from "../../store/global";
import { TInvitation, selectInvitationInfo } from "../../store/invitation";
import { cancelFavorite, checkFavorite, createFavorite } from "../../store/favorite";
import { setUser, setUserInfo } from "../../store/userSlice";
import { checkResponse } from "../../store/response";

Page({
    data: {
        style: {
            fontsize: getApp().globalData.style.rem,
        },
        _CDN,
        invitation: {
        } as TInvitation,
        favorite: !1 as Boolean,
        response: !1 as Boolean,
    },
    onLoad({ code }: { code: string }) {
        console.log(code);
        const success = () => {
            selectInvitationInfo(+code).then(invitation => {
                this.setData({ invitation })
                checkFavorite(invitation.id).then(favorite => {
                    this.setData({ favorite })
                    if (invitation.backgroundMusic) {
                        this._playMusic(invitation.backgroundMusic);
                    }
                })
                checkResponse(invitation.id).then(response => {
                    console.log("response", response);
                    this.setData({ response })
                })
            });
        };
        wx.getStorage({
            key: "user",
            success(res) {
                const { token, openid, base, perlogo, userinfo } = res.data;
                setUser({ token, openid });
                setUserInfo(userinfo);
                setPerlogo(perlogo);
                success();
            },
            fail(e) {
                wxLogin(success);
            },
            complete(e) {
            }
        })
    },
    tapHome() {
        wx.reLaunch({
            url: '/pages/index/index',
        });
    },
    tapFavorite() {
        const { favorite, invitation } = this.data;
        favorite ? cancelFavorite(invitation.id).then(_ => this.setData({ favorite: !favorite })) :
            createFavorite(invitation.id).then(_ => this.setData({ favorite: !favorite }));
    },
    tapReply() {
        const component = this.selectComponent("#the-response");
        component.onTapOpenComment();
    },
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
    triggerSubmit() {
        this.onCancel();
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
