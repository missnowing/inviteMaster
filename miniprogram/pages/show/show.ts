import { TInvitation, selectInvitationInfo } from "../../store/invitation";
import { TTemplate, selectTemplateInfo } from "../../store/template";
import { _CDN, restoreUserSession } from "../../store/global";
import {
    cancelTemplateFavorite,
    checkTemplateFavorite,
    createTemplateFavorite,
} from "../../store/templateFavorite";

type PreviewPageState = "loading" | "ready" | "error";

const assetUrl = (path = "") => {
    if (!path) return "";
    return /^https?:\/\//.test(path) ? path : _CDN + path;
};

const previewCandidateUrl = (candidate: unknown): string => {
    if (typeof candidate === "string") return assetUrl(candidate.trim());
    if (!candidate || typeof candidate !== "object") return "";
    const image = candidate as { url?: string, src?: string, image?: string };
    return assetUrl(image.url || image.src || image.image || "");
};

const templatePreviewImage = (previewImages: unknown): string => {
    if (Array.isArray(previewImages)) {
        return previewCandidateUrl(previewImages[0]);
    }
    if (typeof previewImages !== "string" || !previewImages.trim()) return "";
    try {
        const parsed = JSON.parse(previewImages);
        return Array.isArray(parsed)
            ? previewCandidateUrl(parsed[0])
            : previewCandidateUrl(parsed);
    } catch (_) {
        return previewCandidateUrl(previewImages);
    }
};

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
        play: !1,
        pageState: "loading" as PreviewPageState,
        errorMessage: "",
        templateId: 0,
        invitationId: 0,
    },
    onUnload() {
        const routeFallbackTimer = (this as any)._routeFallbackTimer;
        if (routeFallbackTimer) clearTimeout(routeFallbackTimer);
        (this as any)._routeFallbackTimer = null;
        this.release();
    },
    onLoad(props: { se?: string, templateId?: string, invitationId?: string }) {
        const se = props.se || "";
        const templateId = Number(props.templateId || 0);
        const invitationId = Number(props.invitationId || 0);
        this.setData({ se, templateId, invitationId });
        const channel = this.getOpenerEventChannel();
        channel.on('dataFromIndex', ({ template }) => {
            (this as any)._routePayloadReceived = true;
            this.bindTemplate(template);
        });
        channel.on('dataFromMine', ({ template, invitation }) => {
            (this as any)._routePayloadReceived = true;
            this.bindInvitation(invitation, template);
        });
        (this as any)._routeFallbackTimer = setTimeout(() => {
            if (!(this as any)._routePayloadReceived && !this.data.template && !this.data.invitation) {
                this.hydrateFromQuery();
            }
        }, 50);
    },
    bindTemplate(template: TTemplate, isDetail = false) {
        if (!template || !template.id) return;
        const previewImage = templatePreviewImage(template.previewImages);
        if (!previewImage && !isDetail) {
            this.setData({ pageState: "loading", errorMessage: "", templateId: template.id });
            selectTemplateInfo(template.id).then((detail) => {
                this.bindTemplate(detail, true);
            }).catch(() => {
                this.setData({
                    pageState: "error",
                    errorMessage: "模板预览图加载失败，请稍后重试。",
                });
            });
            return;
        }
        if (!previewImage) {
            this.setData({
                template,
                templateId: template.id,
                bg: "",
                pageState: "error",
                errorMessage: "当前模板暂未配置预览图。",
            });
            return;
        }
        this.setData({
            template,
            templateId: template.id,
            bg: previewImage,
            pageState: "ready",
            errorMessage: "",
        });
        checkTemplateFavorite(template.id).then((favorite) => {
            this.setData({ favorite });
        }).catch(() => {
            this.setData({ favorite: false });
        });
        if (template.backgroundMusic) this._playMusic(template.backgroundMusic);
    },
    bindInvitation(invitation: TInvitation, template?: TTemplate) {
        if (!invitation || !invitation.id) return;
        if (!template || !template.id) {
            const invitationTemplateId = Number(invitation.templateId || 0);
            if (!invitationTemplateId) {
                this.setData({
                    pageState: "error",
                    errorMessage: "当前邀请函缺少可用模板，暂时无法继续制作。",
                });
                return;
            }
            this.setData({ pageState: "loading", errorMessage: "" });
            selectTemplateInfo(invitationTemplateId).then((resolvedTemplate) => {
                this.bindInvitation(invitation, resolvedTemplate);
            }).catch(() => {
                this.setData({
                    pageState: "error",
                    errorMessage: "邀请函模板加载失败，请稍后重试。",
                });
            });
            return;
        }
        this.setData({
            invitation,
            invitationId: invitation.id,
            template,
            bg: assetUrl(invitation.coverImage),
            pageState: "ready",
            errorMessage: "",
        });
        checkTemplateFavorite(template.id).then((favorite) => {
            this.setData({ favorite });
        }).catch(() => this.setData({ favorite: false }));
        if (invitation.backgroundMusic) this._playMusic(invitation.backgroundMusic);
    },
    hydrateFromQuery() {
        const { templateId, invitationId } = this.data;
        this.setData({ pageState: "loading", errorMessage: "" });
        if (invitationId) {
            restoreUserSession().then(() => {
                return selectInvitationInfo(invitationId).then((invitation) => {
                    this.bindInvitation(invitation);
                });
            }).catch(() => {
                this.setData({
                    pageState: "error",
                    errorMessage: "作品预览加载失败，请稍后重试。",
                });
            });
            return;
        }
        if (templateId) {
            restoreUserSession().then(() => {
                return selectTemplateInfo(templateId).then((template) => {
                    this.bindTemplate(template, true);
                });
            }).catch(() => {
                this.setData({
                    pageState: "error",
                    errorMessage: "模板预览加载失败，请稍后重试。",
                });
            });
            return;
        }
        this.setData({
            pageState: "error",
            errorMessage: "缺少可预览的模板或邀请函信息。",
        });
    },
    tapRetry() {
        this.hydrateFromQuery();
    },
    /**
     * 制作
     */
    tapCreate() {
        const { template } = this.data;
        if (!template || !template.id) {
            wx.showToast({ title: "模板信息不完整", icon: "none" });
            return;
        }
        wx.navigateTo({
            url: `./create/create?templateId=${template.id}`,
            routeType: "wx://zoom",
            events: {
                // 为指定事件添加一个监听器，获取被打开页面传送到当前页面的数据
                dataFromIndex: function () { },
            },
            success: (res) => {
                // 通过eventChannel向被打开页面传送数据
                res.eventChannel.emit('dataFromShow', { template })
                this.tapPause();
            },
        })
    },
    /**
     * 收藏模板
     */
    tapFavorite() {
        const { favorite, template } = this.data;
        if (!template || !template.id) {
            wx.showToast({ title: "模板信息不完整", icon: "none" });
            return;
        }
        const request = favorite
            ? cancelTemplateFavorite(template.id)
            : createTemplateFavorite(template.id);
        request.then(() => {
            this.setData({ favorite: !favorite });
            wx.showToast({ title: favorite ? '已取消收藏' : '已收藏', icon: 'success' });
        }).catch(() => {
            wx.showToast({ title: '收藏失败，请稍后重试', icon: 'none' });
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
