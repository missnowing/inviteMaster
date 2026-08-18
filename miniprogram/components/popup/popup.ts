Component({
    properties: {
        maskClosable: {
            type: Boolean,
            value: true,
        },
        mask: {
            // 是否需要 遮罩层
            type: Boolean,
            value: true,
        },
        maskStyle: {
            // 遮罩层的样式
            type: String,
            value: '',
        },
        show: {
            // 是否开启弹窗
            type: Boolean,
            value: false,
        },
    },
    data: {
    },
    lifetimes: {
        attached: function () {
            console.log("popup attached!", this.data.mask);
            this.triggerEvent('attached', {}, {});
        }
    },
    methods: {
        close() {
            const { data } = this;
            console.log('@@@ close', data.maskClosable)
            if (!data.maskClosable) return;
            this.triggerEvent('close', {}, {});
        },
        // stopEvent() {},
    },
});
