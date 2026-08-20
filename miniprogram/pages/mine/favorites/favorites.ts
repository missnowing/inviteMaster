import { selectFavorite } from "../../../store/favorite";
import { _CDN } from "../../../store/global";
import { TInvitation } from "../../../store/invitation";
import { TTemplate, selectTemplateInfo } from "../../../store/template";
import { TTemplateFavorite, selectTemplateFavorites } from "../../../store/templateFavorite";

const app = getApp();

const assetUrl = (path = "") => {
    if (!path) return "";
    return /^https?:\/\//.test(path) ? path : _CDN + path;
};

const invitationFromFavorite = (favorite: any): TInvitation => {
    const invitation = favorite && favorite.invitation ? favorite.invitation : favorite;
    return {
        ...invitation,
        id: Number(favorite.invitationId || invitation.id),
        coverUrl: assetUrl(invitation.coverImage),
    } as TInvitation;
};

Page({
    data: {
        style: {
            fontsize: app.globalData.style.rem,
        },
        templateFavorites: [] as TTemplateFavorite[],
        invitationFavorites: [] as TInvitation[],
        loading: false,
    },

    onShow() {
        this.loadFavorites();
    },

    loadFavorites() {
        if (this.data.loading) return;
        this.setData({ loading: true });
        Promise.all([
            selectTemplateFavorites({ page: 1, pageSize: 50 }),
            selectFavorite({ page: 1, pageSize: 50 }),
        ]).then(([templateResult, invitationResult]) => {
            const templateFavorites = templateResult.list.map((template: TTemplateFavorite) => ({
                ...template,
                thumbnailUrl: assetUrl(template.thumbnail || ""),
            }));
            const invitationFavorites = invitationResult.list.map(invitationFromFavorite);
            this.setData({ templateFavorites, invitationFavorites });
        }).catch(() => {
            wx.showToast({ title: "收藏加载失败，请稍后重试", icon: "none" });
        }).finally(() => {
            this.setData({ loading: false });
        });
    },

    tapTemplateFavorite(e: WechatMiniprogram.TouchEvent) {
        const item = e.currentTarget.dataset.item as TTemplateFavorite;
        const templateId = Number(item.templateId || item.id);
        if (!templateId) return;
        wx.showLoading({ title: "加载模板" });
        selectTemplateInfo(templateId).then((template: TTemplate) => {
            wx.navigateTo({
                url: `/pages/show/show?templateId=${template.id}&se=se-${template.id}`,
                routeType: "wx://zoom",
                success(res) {
                    res.eventChannel.emit("dataFromIndex", { template });
                },
            });
        }).catch(() => {
            wx.showToast({ title: "模板详情加载失败", icon: "none" });
        }).finally(() => wx.hideLoading());
    },

    tapInvitationFavorite(e: WechatMiniprogram.TouchEvent) {
        const invitation = e.currentTarget.dataset.item as TInvitation;
        if (!invitation || !invitation.id) return;
        wx.navigateTo({ url: `/pages/receive/receive?code=${invitation.id}` });
    },
});
