const { shared, timing, Easing } = wx.worklet

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
        popClose: {
            // pop允许空白关闭
            type: Boolean,
            value: !0,
        },
        show: {
            // 是否开启弹窗
            type: Boolean,
            value: false,
        },

        origin: {
            // 动画出现原点
            type: Object,
            value: {
                x: 0,
                y: 0,
            },
            observer(newOrigin) {
                console.log(newOrigin);
                newOrigin && (this as any).applyAnimatedStyle('.popup', () => {
                    'worklet'
                    return {
                        transformOrigin: `${newOrigin.x}px ${newOrigin.y}px`,
                        //transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }
                })
            }
        },
    },
    data: {
    },
    lifetimes: {
        created: function () {
            this.scale = shared(0);
            this.opacity = shared(.2);

            this.mask = shared(0);
        },
        attached: function () {
            console.log("popup attached!", this.data.mask);
            this.triggerEvent('attached', {}, {});
        },
        ready() {
            (this as any).applyAnimatedStyle('.mask', () => {
                'worklet'
                return {
                    opacity: this.mask.value,
                    transform: `scale(${this.scale.value === 0 ? 0 : 1})`,
                }
            });
            (this as any).applyAnimatedStyle('.popup', () => {
                'worklet'
                return {
                    transform: `scale(${this.scale.value})`,
                    opacity: this.opacity.value,
                    //transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }
            });
        },
    },
    methods: {
        onTap() {
            this.open(300);
        },
        open(duration: number) {
            'worklet';
            this.scale.value = timing(1, { duration, easing: Easing.cubicBezier(0.34, 1.56, 0.64, 1) }, () => { })
            this.opacity.value = timing(1, { duration, easing: Easing.cubicBezier(0.34, 1.56, 0.64, 1) }, () => { })
            this.mask.value = timing(.5, { duration, easing: Easing.cubicBezier(0.34, 1.56, 0.64, 1) }, () => { })
            console.log("open");
        },
        onPopClose() {
            this.data.popClose && this.close();
        },
        onClose() {
            this.close();
        },
        close() {
            'worklet';
            this.scale.value = timing(0, { duration: 200 }, () => { })
            this.opacity.value = timing(.2, { duration: 200 }, () => { })
            this.mask.value = timing(0, { duration: 200 }, () => { })
            console.log("close");
        },
    },
});
