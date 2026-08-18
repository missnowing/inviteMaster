Component({
    data: {

    },
    properties: {
        show: {
            type: Boolean,
            value: false,
        }
    },
    observers: {
    },
    lifetimes: {
        attached: function () {
            const app = getApp(), menu = app.globalData.menu;
            const { rect, ios, sideWidth, statusBarHeight } = menu;
            wx.checkIsAddedToMyMiniProgram({
                success: ({ added }) => {
                    !added && this.setData({ show: !0, rect, ios, sideWidth, statusBarHeight });
                }
            })
        }
    },
    methods: {
        close() {
            this.setData({ show: !1 });
        }
    },
})