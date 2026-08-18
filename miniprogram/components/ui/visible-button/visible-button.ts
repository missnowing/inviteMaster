Component({
    properties: {
        title: {
            type: String,
            value: "点击"
        },
        delay: {
            type: Number,
            value: 2000,
        },
        custom: {
            type: Boolean,
            value: false
        },
        transition: {
            type: Boolean,
            value: true
        }
    },
    data: {
        progress: 0,
    },
    observers: {
    },
    lifetimes: {
        attached: function () {
            this._triggle = !0;
        },
    },
    methods: {
        tapSubmit() {
            const { delay } = this.data;
            this.setData({ progress: 100 });
            this._triggle && this.triggerEvent('submit', {});
            this._triggle = !1;
            setTimeout(() => {
                this._triggle = !0;
                this.setData({ progress: 0 });
            }, delay)
        },
    },
});
