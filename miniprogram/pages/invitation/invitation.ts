import { _CDN } from "../../store/global";
import { TInvitation, selectInvitationInfo } from "../../store/invitation";
import { selectResponse, TResponse } from "../../store/response";

type ResponseItem = TResponse & {
    invitation?: TInvitation,
    invitationTitle: string,
    eventDateText: string,
    eventTimeText: string,
    eventAddressText: string,
    coverUrl: string,
    isHistory: boolean,
};

const assetUrl = (path = "") => {
    if (!path) return "";
    return /^https?:\/\//.test(path) ? path : _CDN + path;
};

Page({
    data: {
        style: {
            fontsize: getApp().globalData.style.rem,
        },
        invitations: [] as ResponseItem[],
        visibleInvitations: [] as ResponseItem[],
        activeFilter: "current" as "current" | "history",
        currentCount: 0,
        historyCount: 0,
        pendingCount: 0,
        loading: false,
    },

    onShow() {
        this.loadResponses();
    },

    loadResponses() {
        if (this.data.loading) return;
        this.setData({ loading: true });
        selectResponse({ page: 1, pageSize: 30 }).then((result) => {
            return Promise.all(result.list.map((response: TResponse) => {
                const embedded = (response as any).invitation as TInvitation | undefined;
                if (embedded && embedded.id) return Promise.resolve({ response, invitation: embedded });
                return selectInvitationInfo(response.invitationId)
                    .then((invitation) => ({ response, invitation }))
                    .catch(() => ({ response, invitation: {} as TInvitation }));
            }));
        }).then((pairs) => {
            const now = Date.now();
            const invitations = pairs.map(({ response, invitation }) => {
                const eventDate = invitation.eventDate ? new Date(invitation.eventDate) : null;
                const validDate = eventDate && !isNaN(eventDate.getTime()) ? eventDate : null;
                if (validDate && invitation.eventTime) {
                    const parts = invitation.eventTime.split(":").map(Number);
                    if (!parts.some(isNaN)) validDate.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
                }
                const isHistory = invitation.status === 2 || invitation.status === 3
                    || !!(validDate && validDate.getTime() < now);
                return {
                    ...response,
                    invitation,
                    invitationTitle: invitation.title || invitation.eventName || "一场雅聚",
                    eventDateText: validDate
                        ? validDate.Format("yyyy年MM月dd日")
                        : invitation.eventDate || new Date(response.date).Format("yyyy-MM-dd"),
                    eventTimeText: invitation.eventTime ? invitation.eventTime.slice(0, 5) : "时间待定",
                    eventAddressText: invitation.eventAddress || "地点待定",
                    coverUrl: assetUrl(invitation.coverImage),
                    isHistory,
                } as ResponseItem;
            });
            this.setData({
                invitations,
                currentCount: invitations.filter((item) => !item.isHistory).length,
                historyCount: invitations.filter((item) => item.isHistory).length,
                pendingCount: invitations.filter((item) => item.responseType === 3 && !item.isHistory).length,
            });
            this.applyFilter();
        }).catch(() => {
            wx.showToast({ title: "应邀记录加载失败", icon: "none" });
        }).finally(() => {
            this.setData({ loading: false });
        });
    },

    tapFilter(e: WechatMiniprogram.TouchEvent) {
        this.setData({ activeFilter: e.currentTarget.dataset.filter });
        this.applyFilter();
    },

    applyFilter() {
        const history = this.data.activeFilter === "history";
        this.setData({
            visibleInvitations: this.data.invitations.filter((item) => item.isHistory === history),
        });
    },

    tapItem(e: WechatMiniprogram.TouchEvent) {
        const invitationId = Number(e.currentTarget.dataset.id || 0);
        if (!invitationId) {
            wx.showToast({ title: "邀请详情暂不可用", icon: "none" });
            return;
        }
        wx.navigateTo({ url: `../receive/receive?code=${invitationId}` });
    },
});
