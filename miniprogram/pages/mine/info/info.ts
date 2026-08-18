import { _CDN, uploadImage } from "../../../store/global";
import { TUserInfo, selectUserInfo, updatetUserInfo } from "../../../store/userSlice";
import instance from "../../../utils/instance";

const app = getApp();
const GenderRange = ["未知", "男", "女"];

//表单行配置
type TFormRow = {
    name: string,        //行名称
    icon: string,        //行图标
    key: keyof TUserInfo,//对应TUserInfo字段
    type: "image" | "input" | "picker", //行类型
    mode?: string,       //picker模式
    range?: string[],    //picker选项
    value?: any,         //picker当前值
    display: string,     //展示值
    placeholder: string, //空值提示
    sep: string,         //分组圆角样式
    noArrow?: boolean,   //不显示右箭头
}

Page({
    data: {
        style: {
            fontsize: app.globalData.style.rem,
        },
        _CDN: _CDN,
        userInfo: {} as TUserInfo,
        selectForm: 0,
        forms: [] as { name: string, list: TFormRow[] }[],
        //single-edit弹窗配置
        edit: {
            key: "",
            title: "",
            placeholder: "",
            popText: "",
        },
    },
    prevent() {
        console.log("prevent")
    },
    onLoad() {
        wx.getStorage({
            key: 'user',
            success: (res) => {
                const { token, openid, base, perlogo, userinfo } = res.data;
                this.setData({ userInfo: userinfo });
                this.buildForms();
            }
        })
    },
    //根据userInfo构建表单展示值
    buildForms() {
        const { userInfo } = this.data;
        const display = (key: keyof TUserInfo) => `${userInfo[key] || ""}`;
        const lists: TFormRow[][] = [
            [
                { name: "头像", icon: "iconfont icon-xiangjixiao", key: "avatarUrl", type: "image", display: display("avatarUrl"), placeholder: "点击上传", sep: "", noArrow: !0 },
                { name: "昵称", icon: "iconfont icon-wode", key: "nickName", type: "input", display: display("nickName"), placeholder: "未填写", sep: "" },
                { name: "真实姓名", icon: "iconfont icon-renyuan", key: "realName", type: "input", display: display("realName"), placeholder: "未填写", sep: "" },
                { name: "手机号", icon: "iconfont icon-xiaoxi", key: "phone", type: "input", display: display("phone"), placeholder: "未填写", sep: "" },
            ],
            [
                { name: "性别", icon: "iconfont icon-xingbienan1", key: "gender", type: "picker", mode: "selector", range: GenderRange, value: userInfo.gender || 0, display: GenderRange[userInfo.gender] || "未知", placeholder: "请选择", sep: "" },
                { name: "生日", icon: "iconfont icon-star", key: "birthday", type: "picker", mode: "date", value: userInfo.birthday, display: display("birthday"), placeholder: "请选择", sep: "" },
            ],
        ];
        const forms = lists.map((list, index) => {
            list[0].sep = "top";
            list[list.length - 1].sep = "bottom";
            return { name: index === 0 ? "基本资料" : "更多信息", list };
        });
        this.setData({ forms });
    },
    tapChangeMenu(e: any) {
        const { index } = e.currentTarget.dataset || {}
        this.setData({
            selectForm: index,
        })
    },
    changeSwiper(e: any) {
        this.setData({
            selectForm: e.detail.current,
        })
    },
    //输入类行 打开编辑弹窗
    onTapEdit(e: any) {
        const { item } = e.currentTarget.dataset;
        this.setData({
            edit: {
                key: item.key,
                title: item.name,
                placeholder: `请输入${item.name}`,
                popText: item.display,
            }
        });
        this.selectComponent("#singleEdit").bindLayout();
    },
    //编辑弹窗保存
    bindSave(e: any) {
        const { popText } = e.detail;
        const { key } = this.data.edit;
        const text = `${popText}`.trim();
        if (key === "phone" && !/^1\d{10}$/.test(text)) {
            instance.showToast({ title: "手机号格式不正确", icon: "error" });
            return;
        }
        this.save({ [key]: text } as Partial<TUserInfo>);
    },
    //上传头像
    onUploadPortrait() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            camera: 'back',
            success: (res) => {
                instance.showLoading({ title: "上传中" });
                wx.cropImage({
                    src: res.tempFiles[0].tempFilePath, // 图片路径
                    cropScale: '1:1', // 裁剪比例
                    success: (r) => {
                        const tempPath = r.tempFilePath,
                            suffix = tempPath.split(".").pop() || "png";
                        uploadImage({ tempPath, suffix, dir: "logo" }).then((up: any) => {
                            wx.hideLoading();
                            this.save({ avatarUrl: up.url });
                        }).catch(e => {
                            wx.hideLoading();
                            instance.showToast({ title: "头像上传失败", icon: "error" });
                            console.error(e);
                        });
                    },
                    fail() { wx.hideLoading(); },
                })
            }
        })
    },
    //选择类行 修改后直接保存
    onPickerChange(e: any) {
        const { item } = e.currentTarget.dataset;
        if (item.key === "gender") {
            this.save({ gender: Number(e.detail.value) });
        } else if (item.key === "birthday") {
            this.save({ birthday: new Date(e.detail.value).Format('yyyy-MM-dd hh:mm:ss') });
        }
    },
    //保存修改
    save(kv: Partial<TUserInfo>) {
        updatetUserInfo({ ...this.data.userInfo, ...kv }).then((r: any) => {
            const userInfo = r.message || {};
            this.setData({ userInfo });
            this.buildForms();
            instance.showToast({ title: "保存成功" });
            this.selectComponent("#singleEdit").hideLayout();
            wx.setStorage({ key: 'user', data: JSON.stringify(userInfo) })
        }).catch((e: any) => {
            //失败不关闭弹窗，保留内容可重试
            instance.showToast({ title: e?.message || "保存失败", icon: "error" });
        });
    },
})
