import { _CDN, persistCurrentUserInfo, restoreUserSession, uploadImage } from "../../../store/global";
import { TUserInfo, setUserInfo, updatetUserInfo } from "../../../store/userSlice";
import instance from "../../../utils/instance";

const app = getApp();
const GenderRange = ["未知", "男", "女"];

//表单行配置
type TFormRow = {
    name: string,        //行名称
    key: keyof TUserInfo,//对应TUserInfo字段
    type: "input" | "picker", //行类型
    mode?: string,       //picker模式
    range?: string[],    //picker选项
    value?: any,         //picker当前值
    display: string,     //展示值
    placeholder: string, //空值提示
}

Page({
    data: {
        style: {
            fontsize: app.globalData.style.rem,
        },
        _CDN: _CDN,
        userInfo: {} as TUserInfo,
        forms: [] as { name: string, hint: string, list: TFormRow[] }[],
        //single-edit弹窗配置
        edit: {
            key: "",
            title: "",
            placeholder: "",
            popText: "",
        },
    },
    onLoad() {
        restoreUserSession().then(({ userinfo }) => {
            this.setData({ userInfo: userinfo });
            this.buildForms();
        }).catch(() => wx.showToast({ title: "用户信息加载失败", icon: "none" }));
    },
    //根据userInfo构建表单展示值
    buildForms() {
        const { userInfo } = this.data;
        const display = (key: keyof TUserInfo) => {
            const value = `${userInfo[key] || ""}`;
            if (key === "phone" && /^1\d{10}$/.test(value)) {
                return `${value.slice(0, 3)} **** ${value.slice(-4)}`;
            }
            if (key === "birthday" && value) {
                return value.slice(0, 10);
            }
            return value;
        };
        const lists: TFormRow[][] = [
            [
                { name: "昵称", key: "nickName", type: "input", display: display("nickName"), placeholder: "未填写" },
                { name: "真实姓名", key: "realName", type: "input", display: display("realName"), placeholder: "未填写" },
                { name: "手机号", key: "phone", type: "input", display: display("phone"), placeholder: "未填写" },
            ],
            [
                { name: "性别", key: "gender", type: "picker", mode: "selector", range: GenderRange, value: userInfo.gender || 0, display: GenderRange[userInfo.gender] || "未知", placeholder: "请选择" },
                { name: "生日", key: "birthday", type: "picker", mode: "date", value: display("birthday"), display: display("birthday"), placeholder: "请选择" },
            ],
        ];
        const forms = [
            { name: "常用资料", hint: "署名与联系", list: lists[0] },
            { name: "个人信息", hint: "选填", list: lists[1] },
        ];
        this.setData({ forms });
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
                        }).catch(() => {
                            wx.hideLoading();
                            instance.showToast({ title: "头像上传失败", icon: "error" });
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
            setUserInfo(userInfo);
            this.buildForms();
            instance.showToast({ title: "保存成功" });
            this.selectComponent("#singleEdit").hideLayout();
            persistCurrentUserInfo(userInfo).catch(() => {
                instance.showToast({ title: "本地信息同步失败", icon: "none" });
            });
        }).catch((e: any) => {
            //失败不关闭弹窗，保留内容可重试
            instance.showToast({ title: (e && e.message) || "保存失败", icon: "error" });
        });
    },
})
