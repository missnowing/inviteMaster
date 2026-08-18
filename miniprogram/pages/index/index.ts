import { TFont, selectFonts, setPerlogo, wxLogin } from "../../store/global";
import { ITemplate, TTemplate, TTemplateCategory, selectTemplate, selectTemplateCategory } from "../../store/template";
import { selectUserInfo, setUser, setUserInfo } from "../../store/userSlice";

Page({
  data: {
    style: {
      fontsize: getApp().globalData.style.rem,
    },
    types: [] as TTemplateCategory[],
    templates: {} as ITemplate,
    selectIndex: 0,
    selectCategory: 0,
  },
  onLoad() {
    getApp().setProxy("template", {
      set: (target: typeof Proxy, key: string, value: ITemplate, receiver) => {
        console.log(target, key, value, receiver);
        this.setData({
          templates: { ...value }
        })
      }
    })
    const success = () => {
      console.log("success");
      selectTemplateCategory().then(({ list: types }) => {
        this.setData({
          types,
          selectCategory: types[0].id,
        });
        selectTemplate({ parentCategoryId: types[0].id });
      });
      selectFonts().then(fonts => {
        // console.log(fonts);return;
        let index = 0, count = fonts.list.length;
        const fs = wx.getFileSystemManager();
        {
          //不缓存方案，让微信webview自行实现
          const _fonts = fonts.list.map((font: TFont) => {
            return {
              family: font.fontKey,
              url: font.url,
              name: font.name,
              key: font.fontKey
            }
          });
          const { family: fontFamily, url: fontURL } = _fonts[index];
          const loadFont = (fontFamily: string, fontURL: string) => {
            console.log(fontFamily, fontURL)
            wx.loadFontFace({
              family: fontFamily,
              // global: true,
              source: `url("${fontURL}")`,
              success() {
                console.log(`${fontFamily} 加载成功`);
              },
              fail(err) {
                console.error('字体加载失败', err);
              },
              complete: (message) => {
                console.log("complete", message);
                index++;
                if (index >= count) return;
                const { family: fontFamily, url: fontURL } = _fonts[index];
                loadFont(fontFamily, fontURL);
              },
            });
          }
          loadFont(fontFamily, fontURL);
        }
        return;
        {
          // 无法解决转到base64后导致的主线程阻塞问题，因此暂时只能尽量使用webview的缓存机制
          const loadFont = (filePath: string, fontFamily: string) => {
            fs.readFile({
              filePath: filePath,
              encoding: 'base64',
              success(res) {
                wx.loadFontFace({
                  family: fontFamily,
                  global: true,
                  source: `url("data:font/truetype;charset=utf-8;base64,${res.data}")`,
                  success() {
                    console.log(`${fontFamily} 加载成功`);
                  },
                  fail(err) {
                    console.error('字体加载失败', err);
                  },
                  complete: (message) => {
                    console.log("complete", message);
                    index++;
                    if (index >= count) return;
                    const { family: fontFamily, url: fontURL } = _fonts[index];
                    readFont(fontFamily, fontURL);
                  },
                });
              },
              fail(err) {
                console.error('读取字体文件失败', err);
              }
            });
          };
          const downloadFont = (fontURL: string, filePath: string, fontFamily: string) => {
            wx.downloadFile({
              url: fontURL,
              success: ({ tempFilePath }) => {
                fs.saveFile({
                  tempFilePath,
                  filePath,
                  success: () => {
                    loadFont(filePath, fontFamily);
                  },
                  fail: console.log
                });
              },
              fail: console.log,
              complete: console.log
            });
          };
          const readFont = (fontFamily: string, fontURL: string) => {
            console.log(fontFamily, fontURL)
            const filePath = `${wx.env.USER_DATA_PATH}/${fontFamily}.ttf`
            fs.access({
              path: filePath,
              success() {
                // 本地已有，直接读取并加载
                console.log('从本地加载字体');
                loadFont(filePath, fontFamily);
              },
              fail() {
                // 本地没有，下载后再加载
                console.log('从网络下载字体');
                downloadFont(fontURL, filePath, fontFamily);
              }
            });
          };
          const _fonts = fonts.list.map((font: TFont) => {
            return {
              family: font.name,
              url: font.url,
              name: font.name,
              key: font.fontKey
            }
          });
          const { family: fontFamily, url: fontURL } = _fonts[index];
          readFont(fontFamily, fontURL);
        }
      });
    };
    wx.getStorage({
      key: "user",
      success(res) {
        const { token, openid, base, perlogo, userinfo } = res.data;
        setUser({ token, openid });
        setUserInfo(userinfo);
        setPerlogo(perlogo);
        success();
        // getUserInfo(success)
      },
      fail(e) {
        wxLogin(success);
      },
      complete(e) {
      }
    });
  },
  tapMenu(e: any) {
    const { index } = e.currentTarget?.dataset || { index: e };
    const { templates, types } = this.data;
    console.log(types, index);
    const parentCategoryId = types[index].id;
    this.setData({ selectIndex: index, selectCategory: parentCategoryId });
    if (templates?.[parentCategoryId]?.total) return;
    else {
      selectTemplate({ parentCategoryId });
    }
  },
  tabChanged(e: any) {
    const index = e.detail.current;
    this.setData({
      selectIndex: index,
    });
    this.tapMenu(index);
  },
  tapSelect(e: any) {
    const { se, bg, item: template } = e.currentTarget.dataset;
    console.log(se, bg);
    wx.navigateTo({
      url: `../show/show?se=${se}&&bg=${bg}`,
      routeType: "wx://zoom",
      events: {
        // 为指定事件添加一个监听器，获取被打开页面传送到当前页面的数据
        dataFromInfo: function ({ data }: any) {
        },
      },
      success: function (res) {
        // 通过eventChannel向被打开页面传送数据
        res.eventChannel.emit('dataFromIndex', { template })
      },
    })
  },
})
