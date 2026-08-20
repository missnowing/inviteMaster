
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
    fonts: [],

    user: {},
    userInfo: {},
    template: { infos: [] },  //模板 {模板分类id:[]...}
    templateInfo: [],
    templateStyle: [],
    invitation: [],
    category: [],   //模板分类
    favorite: [],   //请柬收藏
    material: {},   //素材 {素材分类id:[]...
    materialCategory: [], //素材分类
    response: [],   //应邀
  },
  bindProxy() {
    const app = this as any;
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
    const proxyMap = new Map<PropertyKey, Set<any>>();
    const handler: ProxyHandler<Record<string, any>> = {
      get(target, key, receiver) {
        // console.log(`proxyData-get:${key}`, { target, key, receiver });
        proxyMap.get(key)?.forEach(obj => {
          obj.get?.(target, key, receiver);
        })
        return Reflect.get(target, key, receiver);
      },
      set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        proxyMap.get(key)?.forEach(obj => {
          obj.set?.(target, key, value, receiver);
        })
        return result;
      }
    }
    app.proxyData = new Proxy(this.globalData, handler);
    app.setProxy = (key: PropertyKey, { get, set }: IProxyObserver) => {
      const observers = proxyMap.get(key) || new Set();
      const observer = { get, set };
      observers.add(observer);
      proxyMap.set(key, observers);
      return () => {
        observers.delete(observer);
        if (observers.size === 0) proxyMap.delete(key);
      };
    }
  },
  onShow() {
  },
  onThemeChange({ theme }) {
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
    (wx as any).getSkylineInfo({
      success(r: { version: string }) {
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
    // const logs = wx.getStorageSync('logs') || []
    // logs.unshift(Date.now())
    // wx.setStorageSync('logs', logs)
    this.globalData.system = wx.getSystemInfoSync();
    format();
    const appBaseInfo = (wx as any).getAppBaseInfo() as { fontSizeSetting: number }
    // console.log(appBaseInfo.fontSizeScaleFactor)
    // console.log(appBaseInfo.fontSizeSetting)
    this.bindProxy();
    (this as any).proxyData.style = { ...this.globalData.style, rem: `${appBaseInfo.fontSizeSetting}px` };
    // this.globalData.style.rem = `${appBaseInfo.fontSizeSetting * 2}px`;
  },
})
