import { uploadImage } from "../../../store/global";
import instance from "../../../utils/instance";

Component({
    data: {
        loading: !1,
        popFocus: !1,

        perlogo: getApp().globalData.perlogo,
    },
    properties: {
        title: {
            type: String,
            value: "请传入标题",
        },
        placeholder: {
            type: String,
            value: '请传入placeholder',
        },
        popText: {
            type: String,
            value: '',
            observer(popText) {
                //data覆盖property后父组件更新不会生效，这里同步保证可重复预填
                if (popText !== this.data.popText) {
                    this.setData({ popText });
                }
            },
        },
        cancel: {
            type: String,
            value: '取消'
        },
        confirm: {
            type: String,
            value: '保存'
        },
        type: {
            type: String,
            value: 'return'
        },

        popImage: {
            type: Object,
            value: {
                show: !1,
                title: '上传',
                dir: 'logo',
                src: '',
            },
        },
    },
    lifetimes: {
        ready() {
            this.setData({ perlogo: getApp().globalData.perlogo })
        },
        attached() { },
    },
    methods: {
        bindLayout() {
            console.log("【single-edit】bindLayout");
            const component = this.selectComponent("#the-dialog");
            component.onTap();
        },
        tapCancel() {
            const component = this.selectComponent("#the-dialog");
            component.onClose();
        },
        tapConfirm() {
            const popText = this.data.popText.trim(),
                popImage = this.data.popImage;
            if (!popText.length) {
                this.setData({ popFocus: !0 });
                return;
            };
            this.setData({ loading: !0 });
            this.triggerEvent('bindSave', { popText, popImage });
            setTimeout(this.hideLoading.bind(this), 5000);
        },
        tapUpload(e: any) {
            wx.chooseMedia({
                count: 1,
                mediaType: ['image'/* , 'video' */],
                sourceType: ['album', 'camera'],
                camera: 'back',
                success: (res) => {
                    instance.showLoading({ title: "上传中" });
                    wx.cropImage({
                        src: res.tempFiles[0].tempFilePath, // 图片路径
                        cropScale: '1:1', // 裁剪比例
                        success: (res) => {
                            const tempPath = res.tempFilePath, suffix = tempPath.split(".")[1];
                            uploadImage({ tempPath, suffix, dir: "logo" }).then((url: any) => {
                                console.log(url);
                                wx.hideLoading();
                                this.setData({
                                    popImage: {
                                        ...this.data.popImage,
                                        src: url.url,
                                    }
                                });
                            }).catch(e => instance.showToast({ title: e.toString(), duration: 5000, icon: "error" }));
                        },
                        fail() { wx.hideLoading(); },
                        complete() { }
                    })
                },
                fail() { wx.hideLoading(); },
                complete() { }
            })
        },
        onInput(e: any) {
            const { value, cursor, keyCode } = e.detail;
            this.setData({
                popText: value
            });
        },
        hideLoading() {
            this.setData({ loading: !1 });
        },
        hideLayout() {
            this.setData({ loading: !1 });
            this.tapCancel();
        }
    },
})