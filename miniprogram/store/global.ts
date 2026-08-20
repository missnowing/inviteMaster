import { _request, setAuthRefreshHandler } from "../utils/util";
import Base64 from '../utils/lib/base64';
import { TUser, TUserInfo, setUser, setUserInfo } from "./userSlice";
import { UserSession, readUserSession, writeUserSession } from "../utils/session";

export const _Server = "https://witknow.com";
export const _CDN = "https://cdniwallet.apisesame.com/";

export const Upyun = {
  bucket: 'iwallet',
  operator: 'cvcphp'
};

export type IInterface = {
  code: string,
  message: string,
  result: number,
  perlogo?: string,
}
export type TFont = {
  date: string,
  fontKey: string,
  id: number,
  name: string,
  url: string,
}
export const GlobalSlice = {
  name: 'global',
  initialState: {
    showTabBar: !0,
    perlogo: "",
    fonts: [],
  },
  reducers: {
    setTabbar: (payload: boolean) => {
      const app = getApp();
      app.proxyData.showTabBar = payload;
    },
    setPerlogo: (payload: string) => {
      const app = getApp();
      app.globalData.perlogo = payload;
    },
    setFonts: (payload: TFont[]) => {
      const app = getApp();
      app.proxyData.fonts = payload;
    },
  },
}
export const {
  setTabbar, setPerlogo, setFonts
} = GlobalSlice.reducers;

type LoginResponse = TUser & {
  perlogo: string,
  user: TUserInfo,
  [key: string]: any,
};

let activeLogin: Promise<LoginResponse> | null = null;

const applyUserSession = (session: UserSession<TUserInfo>) => {
  setUser({ token: session.token, openid: session.openid });
  setPerlogo(session.perlogo);
  setUserInfo(session.userinfo);
};

const loginOnce = () => new Promise<WechatMiniprogram.LoginSuccessCallbackResult>((resolve, reject) => {
  wx.login({ success: resolve, fail: reject });
}).then((res) =>
      _request<LoginResponse>({
        url: "/witinvite/user/login",
        query: { code: res.code, },
        mask: !0,
        formData: !1,
        throwCatch: !0,
        skipAuthRefresh: !0,
      })
).then(async (response) => {
  const { token, openid, perlogo = "", user: userinfo } = response;
  if (!token || !openid) {
    throw { status: 401, message: response.message || "登录接口未返回有效凭证" };
  }

  const session: UserSession<TUserInfo> = { token, openid, perlogo, userinfo: userinfo || {} as TUserInfo };
  applyUserSession(session);
  await writeUserSession(session);
  return response;
});

const loginWithRetry = (): Promise<LoginResponse> => loginOnce().catch((error) =>
  new Promise<LoginResponse>((resolve, reject) => {
      wx.showModal({
        title: "登录失败",
        content: error.message || error.errMsg || "网络异常，请重试",
        confirmText: "重试",
        success(res) {
          if (res.confirm) {
            loginWithRetry().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        },
        fail: reject,
      });
    })
);

export const wxLogin = (success?: (response: LoginResponse) => void) => {
  if (!activeLogin) {
    activeLogin = loginWithRetry().finally(() => {
      activeLogin = null;
    });
  }

  return activeLogin.then((response) => {
    success && success(response);
    return response;
  });
}

export const restoreUserSession = (success?: (session: UserSession<TUserInfo>) => void) =>
  readUserSession<TUserInfo>().then((session) => {
    if (!session) {
      return wxLogin().then((response) => {
        const restored: UserSession<TUserInfo> = {
          token: response.token,
          openid: response.openid,
          userinfo: response.user || {} as TUserInfo,
          perlogo: response.perlogo || "",
        };
        success && success(restored);
        return restored;
      });
    }

    applyUserSession(session);
    success && success(session);
    return session;
  });

export const persistCurrentUserInfo = (userinfo: TUserInfo) => {
  const app = getApp();
  const { token = "", openid = "" } = app.globalData.user || {};
  const session: UserSession<TUserInfo> = {
    token,
    openid,
    userinfo,
    perlogo: app.globalData.perlogo || "",
  };
  return writeUserSession(session);
};

setAuthRefreshHandler(() => wxLogin().then(({ token, openid }) => ({ token, openid })));

/**
 * 获取 又拍云 的验证
 * @param typename 
 * @param suffix 
 * @param name 
 * @param date 
 * @returns 
 * 信息保存：
    个人信息要目录
    iwallet/user

    个人图像、单位图像：
    iwallet/user/[openid]/logo

    个人名片，名片绘制的内容
    iwallet/user/[openid]/card

    个人名片壁纸
    iwallet/user/[openid]/bgimg
    
    个人名片二维码
    iwallet/user/[openid]/qr

    个人上的名片模版图
    iwallet/user/openid/cardimg
 */
export const getSignature = (
  typename = "user",
  suffix = "png",
  dir = (new Date() as any).Format('yyyy-MM-dd'),
  name = new Date().getTime() + Math.random().toString(16).slice(2),
  date = new Date().toUTCString(),
) => {
  const path = ["witinvite", typename, getApp().globalData.user.openid, dir, name].join("/") + "." + suffix;
  let opts = {
    'save-key': path,
    bucket: Upyun.bucket,
    expiration: Math.round(new Date().getTime() / 1000) + 3600,
    date: date
  }
  let policy = Base64.encode(JSON.stringify(opts));
  let data = ['POST', '/' + Upyun.bucket, date, policy].join('&');
  return _request({ server: "https://apisesame.com", url: `/iwallet/base/getSignature`, params: { data, }, loading: !1 })
    .then((r: any) => {
      if (r.result >= 0) {
        return Promise.resolve({ ...r, policy });
      } else if (r.status === 98) {
        return Promise.reject(r.message)
      } else return Promise.reject(r.message)
    });
};

/**
 * 上传图片到 又拍云
 * @param param0 
 * @returns 
 */
export const uploadImage = ({
  tempPath,
  typename,
  suffix,
  dir,
  onProgress
}: {
  tempPath: string,
  typename?: string,
  suffix?: string,
  dir?: string,
  onProgress?: Function
}) => {
  return getSignature(typename, suffix, dir).then(({ message, policy }: any) => {
    return new Promise((resolve, reject) => {
      const task = wx.uploadFile({
        url: `https://v0.api.upyun.com/${Upyun.bucket}`,
        filePath: tempPath,
        name: 'file',
        formData: {
          policy,
          authorization: `UPYUN ${Upyun.operator}:${message}`,
          "x-gmkerl-type": "get_theme_color"
        },
        success(res) {
          resolve(JSON.parse(res.data));
        },
        fail(err) {
          reject(err.errMsg);
        },
      });
      task.onProgressUpdate((res) => {
        onProgress?.(res);
        console.log('上传进度', res.progress)
        console.log('已经上传的数据长度', res.totalBytesSent)
        console.log('预期需要上传的数据总长度', res.totalBytesExpectedToSend)
      })
    })
  })
}

// /**
//  * 上传图片到 又拍云
//  * @param param0 
//  * @returns 
//  */
// export const uploadImage = ({
//   tempPath,
//   fileName,
//   onProgress
// }: {
//   tempPath: string,
//   fileName: string,
//   onProgress?: Function
// }) => {
//   return new Promise((resolve, reject) => {
//     const task = wx.uploadFile({
//       url: _Server + `/witinvite/user/upFileYun`,
//       filePath: tempPath,
//       name: 'file',
//       formData: {
//         fileName
//       },
//       header: {
//         token: getApp().globalData.user.token,
//         openid: getApp().globalData.user.openid,
//       },
//       success(res) {
//         // console.log(res);
//         resolve(JSON.parse(res.data));
//       },
//       fail(err) {
//         console.log(err);
//         reject(err?.errMsg);
//       },
//     });
//     task.onProgressUpdate((res) => {
//       onProgress?.(res);
//       console.log('上传进度', res.progress)
//       // console.log('已经上传的数据长度', res.totalBytesSent)
//       // console.log('预期需要上传的数据总长度', res.totalBytesExpectedToSend)
//     })
//   })
// }

/***
 * 获取名片模板
 */
export const selectFonts = () => {
  return _request({
    url: `/witinvite/fonts/get`, params: {
    }, header: {
      token: getApp().globalData.user.token,
      openid: getApp().globalData.user.openid,
    }
  }).then((r: any) => {
    if (r.result >= 0) {
      setFonts(r.message);
      return Promise.resolve({ list: r.message, perlogo: r.perlogo });
    } else {
      return Promise.reject(r);
    }
  }).catch(error => {
    return Promise.reject(error);
  })
}

export default GlobalSlice.reducers;
