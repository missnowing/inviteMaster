import { TInvitation, selectInvitation } from "../../store/invitation";
import { TFavorite, selectFavorite } from "../../store/favorite";
import { _CDN } from "../../store/global";
const app = getApp();
Page({
    data: {
        style: {
            fontsize: app.globalData.style.rem,
        },
        _CDN: _CDN,
        userinfo: app.globalData.userInfo || {},
        navs: [{
            name: "发布列表",
            route: "deploys",
            index: 0,
        }, {
            name: "我的收藏",
            route: "cates",
            index: 1,
        }, {
            name: "我的素材",
            route: "resources",
            index: 2,
        }],

        selectIndex: 0,
        invitations: [] as TInvitation[],
        favorites: [] as TFavorite[],
    },
    onShareAppMessage({ from, target, webViewUrl }) {
        console.log("onShareAppMessage", (this as any)._shareID);
        console.log(target);
        const { item: invitation } = target.dataset;
        console.log(invitation);
        const promise = new Promise((resolve, reject) => {
            this.setData({ snapItem: invitation }, () => {
                wx.getImageInfo({
                    src: _CDN + invitation.coverImage,
                    success: (res) => {
                        // wx.nextTick(() => {
                        console.log(this._shareID);
                        this.createSelectorQuery()
                            .select(`#snapshot`)
                            // .select(`#snapshot-${this._shareID}`)
                            .node()
                            .exec(res => {
                                const node = res[0].node
                                console.log(res, node);
                                node.takeSnapshot({
                                    type: 'arraybuffer',
                                    format: 'png',
                                    success: (res) => {
                                        const localImg = `${wx.env.USER_DATA_PATH}/${new Date().getTime()}.png`
                                        const fs = wx.getFileSystemManager();
                                        fs.writeFileSync(localImg, res.data, 'binary')
                                        // wx.previewImage({
                                        //     current: localImg, // 当前显示图片的http链接
                                        //     urls: [localImg] // 需要预览的图片http链接列表
                                        // })
                                        console.log(localImg);
                                        resolve({
                                            title: `Hi，${invitation.title}`,
                                            path: `/pages/receive/receive?code=${invitation.id}`,
                                            imageUrl: localImg,
                                        });
                                    },
                                    fail(res) {
                                        reject(res);
                                    },
                                    complete(res) {
                                    }
                                })
                            })
                        // })
                    }
                })
            });
        })
        return {
            title: `Hi，${invitation.title}`,
            path: `/pages/receive/receive?code=${invitation.id}`,
            promise
        }
    },
    onShow() {
        //编辑个人信息返回后刷新
        this.setData({ userinfo: app.globalData.userInfo || {} })
    },
    onLoad() {
        app.setProxy("invitation", {
            set: (target: any, key: string, value: any, receiver: any) => {
                console.log(target, key, value, receiver);
                this.setData({
                    invitations:
                        value.map((invitation: TInvitation) => {
                            const date_ = `${new Date(invitation.eventDate).Format('yyyy-MM-dd')}(${invitation.lunarDate})`;
                            return {
                                ...invitation,
                                date_
                            }
                        })

                })
            }
        })
        app.setProxy("favorite", {
            set: (target: any, key: string, value: any, receiver: any) => {
                console.log(target, key, value, receiver);
                this.setData({
                    favorites: { ...value }
                })
            }
        })
        selectInvitation()
        selectFavorite()
    },
    tapNav(e: WechatMiniprogram.TouchEvent) {
        const selectIndex = e.currentTarget.dataset.index;
        this.setData({ selectIndex })
    },
    tapMore() {
        wx.navigateTo({
            url: "./info/info"
        })
    },
    tapShare(e: WechatMiniprogram.TouchEvent) {
        console.log("tapShare");
        const { item } = e.currentTarget.dataset;
        (this as any)._shareID = item.id;
    },
    tapDetail(e: WechatMiniprogram.TouchEvent) {
        const { item: invitation } = e.currentTarget.dataset;
        wx.navigateTo({
            url: `../show/create/create`,
            routeType: "wx://zoom",
            events: {
                dataFromInfo: function ({ data }: any) {
                },
            },
            success: function (res) {
                res.eventChannel.emit('dataFromMine', { invitation })
            },
        })
    },
    tapShow(e: WechatMiniprogram.TouchEvent) {
        const { se, bg, item: invitation } = e.currentTarget.dataset;
        wx.navigateTo({
            url: `../show/show?se=${se}&&bg=${bg}`,
            routeType: "wx://zoom",
            events: {
                dataFromInfo: function ({ data }: any) {
                },
            },
            success: function (res) {
                res.eventChannel.emit('dataFromMine', { invitation })
            },
        })
    },
})
