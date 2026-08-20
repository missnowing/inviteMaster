import { _CDN, restoreUserSession } from "../../store/global";
import { TInvitation, selectInvitationInfo } from "../../store/invitation";
import { cancelFavorite, checkFavorite, createFavorite } from "../../store/favorite";
import { checkResponse, TResponse } from "../../store/response";
import { TTemplate, TTemplateData, selectTemplateInfo } from "../../store/template";

type DisplayElement = TTemplateData & {
    displayStyle: string,
    displayName: string,
};

type ReceivePageState = "loading" | "ready" | "invalid" | "error";

const assetUrl = (path = "") => {
    if (!path) return "";
    return /^https?:\/\//.test(path) ? path : _CDN + path;
};

const parseDisplayElements = (raw = ""): DisplayElement[] => {
    try {
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        return list.map((element: TTemplateData) => {
            const sourceStyle: any = element.style || {};
            let displayStyle = "";
            if (typeof sourceStyle === "string") {
                displayStyle = sourceStyle;
            } else {
                Object.keys(sourceStyle).forEach((key) => {
                    const value = sourceStyle[key];
                    if (value === undefined || value === null) return;
                    if (["width", "height", "left", "top", "font-size", "letter-spacing"].indexOf(key) >= 0) {
                        displayStyle += `${key}:${Number(value) * 100}vw;`;
                    } else if (key === "line-height" && !String(value).includes("rem")) {
                        displayStyle += `${key}:${value}rem;`;
                    } else {
                        displayStyle += `${key}:${value};`;
                    }
                });
            }
            return {
                ...element,
                displayStyle,
                displayName: element.type === "image" ? assetUrl(element.name) : element.name,
            };
        });
    } catch (_) {
        return [];
    }
};

Page({
    data: {
        style: {
            fontsize: getApp().globalData.style.rem,
        },
        invitation: {} as TInvitation,
        template: {} as TTemplate,
        elements: [] as DisplayElement[],
        coverUrl: "",
        backgroundUrl: "",
        eventContent: "",
        eventDateText: "日期待定",
        favorite: false,
        response: null as TResponse | null,
        play: false,
        loading: true,
        pageState: "loading" as ReceivePageState,
        errorMessage: "",
        invitationId: 0,
    },

    onLoad({ code }: { code: string }) {
        const invitationId = Number(code || 0);
        if (!invitationId) {
            this.setData({
                loading: false,
                pageState: "invalid",
                errorMessage: "邀请链接缺少有效凭证，请联系邀请方重新发送。",
            });
            return;
        }
        this.setData({ invitationId });
        this.loadInvitation();
    },

    loadInvitation() {
        const invitationId = Number(this.data.invitationId || 0);
        if (!invitationId) return;
        this.release();
        this.setData({
            loading: true,
            pageState: "loading",
            errorMessage: "",
            invitation: {} as TInvitation,
            template: {} as TTemplate,
            elements: [],
            response: null,
            play: false,
        });
        restoreUserSession().then(() => selectInvitationInfo(invitationId)).then((invitation) => {
            const elements = parseDisplayElements(invitation.customData);
            const eventElement = elements.find((item) => item.key === "_eventContent");
            const eventDate = invitation.eventDate ? new Date(invitation.eventDate) : null;
            this.setData({
                invitation,
                elements,
                coverUrl: assetUrl(invitation.coverImage),
                backgroundUrl: assetUrl(invitation.coverImage),
                eventContent: eventElement ? eventElement.name : "",
                eventDateText: eventDate && !isNaN(eventDate.getTime())
                    ? eventDate.Format("yyyy年MM月dd日")
                    : invitation.eventDate || "日期待定",
                loading: false,
                pageState: "ready",
            });
            if (invitation.backgroundMusic) this._playMusic(invitation.backgroundMusic);
            selectTemplateInfo(invitation.templateId).then((template) => {
                this.setData({
                    template,
                    backgroundUrl: assetUrl(template.bg || template.thumbnail || invitation.coverImage),
                });
            }).catch(() => {
                // The uploaded invitation cover remains available if its template has been removed.
            });
            checkFavorite(invitation.id).then((favorite) => this.setData({ favorite }))
                .catch(() => this.setData({ favorite: false }));
            checkResponse(invitation.id).then((response) => {
                this.setData({ response: response || null });
            }).catch(() => {
                this.setData({ response: null });
            });
        }).catch((error) => {
            const message = error && error.message
                ? error.message
                : "邀请函暂时无法打开，请检查网络后重试。";
            this.setData({
                loading: false,
                pageState: "error",
                errorMessage: message,
            });
        });
    },

    tapRetry() {
        this.loadInvitation();
    },

    onShareAppMessage() {
        const invitation = this.data.invitation;
        return {
            title: invitation.title || invitation.eventName || "一封邀请函",
            path: `/pages/receive/receive?code=${invitation.id}`,
            imageUrl: this.data.coverUrl,
        };
    },

    onUnload() {
        this.release();
    },

    tapHome() {
        wx.reLaunch({ url: "/pages/index/index" });
    },

    tapFavorite() {
        const { favorite, invitation } = this.data;
        const action = favorite ? cancelFavorite(invitation.id) : createFavorite(invitation.id);
        action.then(() => {
            this.setData({ favorite: !favorite });
            wx.showToast({ title: favorite ? "已取消收藏" : "已收藏", icon: "success" });
        }).catch(() => wx.showToast({ title: "操作失败，请重试", icon: "none" }));
    },

    tapReply() {
        const component = this.selectComponent("#the-response");
        component.onTapOpenComment();
    },

    tapLocation() {
        const invitation = this.data.invitation;
        if (!invitation.latitude || !invitation.longitude) {
            wx.showToast({ title: "邀请方暂未提供地图定位", icon: "none" });
            return;
        }
        wx.openLocation({
            latitude: Number(invitation.latitude),
            longitude: Number(invitation.longitude),
            name: invitation.eventName || invitation.title || "活动地点",
            address: invitation.eventAddress,
            scale: 16,
        });
    },

    tapCopyAddress() {
        const address = this.data.invitation.eventAddress;
        if (!address) return;
        wx.setClipboardData({ data: address });
    },

    tapPlay() {
        const audioContext = (this as any)._audioContext;
        if (!audioContext) return;
        const paused = audioContext.paused;
        this.setData({ play: paused }, () => {
            paused ? audioContext.play() : audioContext.pause();
        });
    },

    release() {
        const audioContext = (this as any)._audioContext;
        if (audioContext) audioContext.destroy();
        (this as any)._audioContext = null;
    },

    onCancel() {
        const component = this.selectComponent("#the-response");
        component.onTapCloseComment();
    },

    onSubmit() {
        const component = this.selectComponent("#the-Form");
        component.onSubmit();
    },

    triggerSubmit(e: WechatMiniprogram.CustomEvent) {
        this.onCancel();
        if (e.detail && e.detail.status === "success") {
            checkResponse(this.data.invitation.id).then((response) => {
                this.setData({ response: response || null });
            });
        }
    },

    _playMusic(src: string) {
        let audioContext = (this as any)._audioContext;
        if (audioContext) audioContext.destroy();
        audioContext = wx.createInnerAudioContext();
        audioContext.onPlay(() => this.setData({ play: true }));
        audioContext.onError(() => this.setData({ play: false }));
        audioContext.loop = true;
        audioContext.src = assetUrl(src);
        audioContext.play();
        (this as any)._audioContext = audioContext;
    },
});
