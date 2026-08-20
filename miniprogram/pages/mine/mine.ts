import { TInvitation, selectInvitation } from "../../store/invitation";
import { _CDN } from "../../store/global";

const app = getApp();

const assetUrl = (path = "") => {
    if (!path) return "";
    return /^https?:\/\//.test(path) ? path : _CDN + path;
};

Page({
    data: {
        style: {
            fontsize: app.globalData.style.rem,
        },
        _CDN,
        userinfo: app.globalData.userInfo || {},
        workFilters: [{ name: "全部", value: "all" }, {
            name: "已发布", value: "published",
        }, {
            name: "草稿", value: "draft",
        }, {
            name: "已结束", value: "ended",
        }],
        workFilter: "all" as "all" | "published" | "draft" | "ended",
        invitations: [] as TInvitation[],
        visibleInvitations: [] as TInvitation[],
        publishedCount: 0,
        totalViews: 0,
        totalShares: 0,
        totalResponses: 0,
        loading: false,
        snapItem: null as TInvitation | null,
    },

    onShareAppMessage({ target }) {
        const invitation = target && target.dataset ? target.dataset.item as TInvitation : null;
        if (!invitation || invitation.status === 0) {
            return {
                title: "电子邀请函",
                path: "/pages/index/index",
            };
        }
        const promise = new Promise((resolve, reject) => {
            this.setData({ snapItem: invitation }, () => {
                wx.getImageInfo({
                    src: invitation.coverUrl || assetUrl(invitation.coverImage),
                    success: () => {
                        this.createSelectorQuery().select("#snapshot").node().exec((res) => {
                            const node = res[0] && res[0].node;
                            if (!node) {
                                reject(new Error("分享图片节点不可用"));
                                return;
                            }
                            node.takeSnapshot({
                                type: "arraybuffer",
                                format: "png",
                                success: (snapshot: { data: ArrayBuffer }) => {
                                    const localImg = `${wx.env.USER_DATA_PATH}/${new Date().getTime()}.png`;
                                    try {
                                        wx.getFileSystemManager().writeFileSync(localImg, snapshot.data, "binary");
                                        resolve({
                                            title: `Hi，${invitation.title}`,
                                            path: `/pages/receive/receive?code=${invitation.id}`,
                                            imageUrl: localImg,
                                        });
                                    } catch (error) {
                                        reject(error);
                                    }
                                },
                                fail: reject,
                            });
                        });
                    },
                    fail: reject,
                });
            });
        });
        return {
            title: `Hi，${invitation.title}`,
            path: `/pages/receive/receive?code=${invitation.id}`,
            promise,
        };
    },

    onShow() {
        this.setData({ userinfo: app.globalData.userInfo || {} });
        this.loadData();
    },

    loadData() {
        if (this.data.loading) return;
        this.setData({ loading: true });
        selectInvitation({ page: 1, pageSize: 50 }).then((invitationResult) => {
            const invitations = invitationResult.list.map((invitation: TInvitation) => ({
                ...invitation,
                coverUrl: assetUrl(invitation.coverImage),
                date_: invitation.eventDate
                    ? `${new Date(invitation.eventDate).Format("yyyy-MM-dd")}${invitation.lunarDate ? `（${invitation.lunarDate}）` : ""}`
                    : "时间待定",
            }));
            this.setData({
                invitations,
                visibleInvitations: invitations,
                publishedCount: invitations.filter((item: TInvitation) => item.status === 1).length,
                totalViews: invitations.reduce((total: number, item: TInvitation) => total + Number(item.viewCount || 0), 0),
                totalShares: invitations.reduce((total: number, item: TInvitation) => total + Number(item.shareCount || 0), 0),
                totalResponses: invitations.reduce((total: number, item: TInvitation) => total + Number(item.responseCount || item.respondCount || 0), 0),
            });
            this.applyWorkFilter();
        }).catch(() => {
            wx.showToast({ title: "个人内容加载失败，请稍后重试", icon: "none" });
        }).finally(() => {
            this.setData({ loading: false });
        });
    },

    tapWorkFilter(e: WechatMiniprogram.TouchEvent) {
        this.setData({ workFilter: e.currentTarget.dataset.filter });
        this.applyWorkFilter();
    },

    applyWorkFilter() {
        const filter = this.data.workFilter;
        const visibleInvitations = this.data.invitations.filter((item: TInvitation) => {
            if (filter === "published") return item.status === 1;
            if (filter === "draft") return item.status === 0;
            if (filter === "ended") return item.status === 2 || item.status === 3;
            return true;
        });
        this.setData({ visibleInvitations });
    },

    tapMore() {
        wx.navigateTo({ url: "./info/info" });
    },

    stopPropagation() {
        // `catch:tap` only blocks the row's edit action; sharing is handled by WeChat.
    },

    tapDetail(e: WechatMiniprogram.TouchEvent) {
        const invitation = e.currentTarget.dataset.item as TInvitation;
        wx.navigateTo({
            url: `../show/create/create?invitationId=${invitation.id}`,
            routeType: "wx://zoom",
            success(res) {
                res.eventChannel.emit("dataFromMine", { invitation });
            },
        });
    },

});
