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
