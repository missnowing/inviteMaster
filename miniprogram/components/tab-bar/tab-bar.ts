import menu from './menu.js';
Component({
    data: {
        show: !0,
        menu
    },
    properties: {
        selected: {
            type: Number,
            value: 0,
        },
    },
    lifetimes: {
        attached() {
            const app = getApp();
            // app.setProxy("showTabBar", {
            //     set: (target, key, value, receiver) => {
            //         console.log(target, key, value, receiver);
            //         this.setDat  ({ show: value })
            //     }
            // })
            app.setProxy("darkmode", {
                set: (target, key, value, receiver) => {
                    console.log(target, key, value, receiver);
                }
            })
        }
    },
    methods: {
        onSwitchTab(e: any) {
            const url = e.currentTarget.dataset.url;
            wx.switchTab({
                url, complete(e) {
                    console.log(e);
                }
            })
        },
    },
})