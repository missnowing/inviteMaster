
import { _request } from "./utils/util"
import format from "./utils/format/index"
import "./utils/format/lunarDate"

// app.ts
App({
  globalData: {
    style: {
      rem: "32rpx",
      size: {
        s: ".75rem",
        m: "1rem",
        l: "1.25rem",
        title: "2rem",
        icon: "3rem",
      },
      color: {
        font: "black",
        bg: "#fff",
        section: "#F5F5F5",
        gray: "#999",
        button: "#1B72C0",
        active: "#269299",
      },
      lenth: {
        width: "4rem",
        height: "4rem",
        margin: "1rem",
        padding: "1rem",
      },
    },
    system: {},
    menu: {},
    showTabBar: !0,
    perlogo: "",

    user: {},
    userInfo: {},
    template: { infos: [] },  //模板 {模板分类id:[]...}
    templateInfo: [],
    invitation: [],
    category: [],   //模板分类
    favorite: [],   //请柬收藏
    material: {},   //素材 {素材分类id:[]...
    materialCategory: [], //素材分类
    response: [],   //应邀
  },
  bindProxy() {
    /** proxyMap 示例
     * {
     *  [model1]:[
     *    {
     *      get:()=>{},
     *      set:()=>{},
     *    }    
     *  ],
     *  [model2]:[
     *      get:()=>{},
     *      set:()=>{},
     *  ],
     * ...
     * }
     */
    const proxyMap = new Map();
    const handler = {
      get(target, key, receiver) {
        // console.log(`proxyData-get:${key}`, { target, key, receiver });
        proxyMap.get(key)?.map(obj => {
          obj.get?.(target, key, receiver);
        })
        return Reflect.get(target, key, receiver);
      },
      set(target, key, value, receiver) {
        console.log(`proxyData-set:${key}`, { target, key, value, receiver });
        proxyMap.get(key)?.map(obj => {
          obj.set?.(target, key, value, receiver);
        })
        return Reflect.set(target, key, value, receiver);
      }
    }
    this.proxyData = new Proxy(this.globalData, handler);
    this.setProxy = (key, { get, set }) => {
      const arr = proxyMap.get(key) || [];
      proxyMap.set(key, [...arr].concat({ get, set }));
    }
  },
  onShow() {
    console.log("onShow", getApp());
  },
  onThemeChange({ theme }) {
    console.log("themeChange", { theme });
    const app = getApp();
    app.proxyData.system.theme = theme;
  },
  onLaunch() {
    console.log("App onLaunch");
    // wx.setBackgroundFetchToken({
    //   token: 'iwallet'
    // })
    // wx.getStorage({
    //   key: "version", success(res) {

    //   }, fail() {
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        console.log("检测到新版本");
      }
    });
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: "更新提示",
        content: "新版本已准备好，是否立即重启应用？",
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate(); // 强制应用新版本并重启
          }
        },
      });
    });
    updateManager.onUpdateFailed(() => {
      console.log("新版本下载失败");
    });

    wx.getSkylineInfo({
      success(r) {
        if (+r.version.split(".").join("") < 142)
          wx.showModal({
            content: `您当前的版本${r.version}过低，部分功能可能无法正常使用，建议将您的微信更新至最新版本以获得更好的体验！`,
            // content: `原因：${r.reason}`,
            showCancel: !1,
            confirmText: "了解"
          });
        // wx.setStorage({ key: "version", data: r.version })
      }
    })
    //   }
    // })
    wx.hideTabBar({});
    // const logs = wx.getStorageSync('logs') || []
    // logs.unshift(Date.now())
    // wx.setStorageSync('logs', logs)
    this.globalData.system = wx.getSystemInfoSync();
    format();
    const appBaseInfo = wx.getAppBaseInfo()
    // console.log(appBaseInfo.fontSizeScaleFactor)
    // console.log(appBaseInfo.fontSizeSetting)
    this.bindProxy();
    this.proxyData.style = { ...this.globalData.style, rem: `${appBaseInfo.fontSizeSetting}px` };
    // this.globalData.style.rem = `${appBaseInfo.fontSizeSetting * 2}px`;
  },
})