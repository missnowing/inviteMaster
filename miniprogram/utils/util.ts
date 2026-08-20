import FormData from './formdata';
import instance from './instance';
export const _Server = "https://witknow.com";
export const _CDN = "https://cdniwallet.apisesame.com/";

type AuthCredentials = {
  token: string;
  openid: string;
};

export type RequestError = {
  status: number;
  message: string;
  detail?: unknown;
  url?: string;
};

let authRefreshHandler: null | (() => Promise<AuthCredentials>) = null;
let activeAuthRefresh: Promise<AuthCredentials> | null = null;
let activeRequestLoadings = 0;

export const setAuthRefreshHandler = (handler: () => Promise<AuthCredentials>) => {
  authRefreshHandler = handler;
};

const refreshAuth = (): Promise<AuthCredentials> => {
  if (!authRefreshHandler) {
    return Promise.reject({
      status: 401,
      message: "登录刷新器尚未初始化",
    } as RequestError);
  }

  if (!activeAuthRefresh) {
    activeAuthRefresh = authRefreshHandler().finally(() => {
      activeAuthRefresh = null;
    });
  }

  return activeAuthRefresh;
};

const showRequestLoading = (title: string, mask: boolean) => {
  activeRequestLoadings += 1;
  if (activeRequestLoadings === 1) {
    instance.showLoading({ title, mask });
  }
};

const hideRequestLoading = () => {
  if (activeRequestLoadings > 0) {
    activeRequestLoadings -= 1;
  }
  if (activeRequestLoadings === 0) {
    wx.hideLoading();
  }
};

export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

//x-www-form-urlencoded
export const formatUrlencoded: object = (urlencoded: string) => {
  const splits = urlencoded.split("&");
  if (splits.length <= 1) {
    const [key, value] = urlencoded.split("=");
    return { [key]: value };
  }
  return splits.reduce((a: any, b: string) => {
    if (typeof a === 'string') {
      const [key, value] = a.split("=");
      a = { [key]: value };
    }
    const [key, value] = b.split("=");
    return { ...a, ...{ [key]: value } };
  });
};


export type TOption = {
  server?: string,
  method?: | 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT',
  url?: string,
  params?: Record<string, any>,
  query?: Record<string, any>,
  header?: Record<string, any>,
  timeout?: number,
  delay?: number,
  loadingTip?: string,
  mask?: boolean,
  loading?: boolean,
  throwCatch?: boolean,
  failModel?: boolean,
  contentType?: string,
  formData?: boolean,
  skipAuthRefresh?: boolean,
  maxAuthRetries?: number,
  then_?: Function,
  catch_?: Function,
};
export const reflectEntity = <T>(entity: T): T => {
  const result = { ...entity };
  for (let key in result) {
    if (key.search(/^_/) >= 0) {
      delete result[key];
    }
  }
  return result;
}
export const _request = <T = any>(opt: TOption): Promise<T> => {
  const option: TOption = {
    ...{
      server: _Server,
      method: "POST",
      params: {},
      timeout: 5000,
      delay: 2000,
      loadingTip: "加载中...",
      mask: !0,
      loading: !0,
      throwCatch: !1,
      failModel: !1,
      contentType: "application/json",
      formData: !0,
      skipAuthRefresh: !1,
      maxAuthRetries: 2,
      then_: () => { },
      catch_: () => { },
    }, ...opt
  };
  const formData = new FormData();
  const { server, method, url, params, timeout, delay, mask, loadingTip } = option;
  const headers: Record<string, any> = { ...(option.header || {}) };
  const query = option.query || {};
  const queryString = Object.keys(query)
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== "")
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join("&");
  const requestUrl = `${String(server).replace(/\/$/, "")}/${String(url || "").replace(/^\//, "")}${queryString ? `?${queryString}` : ""}`;
  for (let k in params) {
    formData.append(k, params[k]);
  }
  const data = formData.getData();

  let authRetries = 0;
  return new Promise<T>((resolve, reject) => {
    let loadingTimer: number | undefined;
    let loadingShown = false;
    let settled = false;

    const beginLoading = () => {
      if (!option.loading || loadingTimer || loadingShown) return;
      loadingTimer = setTimeout(() => {
        loadingTimer = undefined;
        loadingShown = true;
        showRequestLoading(loadingTip as string, !!mask);
      }, delay) as unknown as number;
    };

    const endLoading = () => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = undefined;
      }
      if (loadingShown) {
        loadingShown = false;
        hideRequestLoading();
      }
    };

    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      endLoading();
      resolve(value);
    };

    const rejectOnce = (error: RequestError) => {
      if (settled) return;
      settled = true;
      endLoading();
      reject(error);
    };

    const request = () => wx.request({
      method: method,
      url: requestUrl,
      data: option.formData ? data.buffer : params,
      timeout,
      header: {
        ...headers,
        'content-type': option.formData ? data.contentType : option.contentType,
        "url": url
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          rejectOnce({
            status: res.statusCode,
            message: `请求失败（HTTP ${res.statusCode}）`,
            detail: res.data,
            url: requestUrl,
          });
          return;
        }

        const responseData = res.data as any;
        if (responseData && responseData.code === 400 && !option.skipAuthRefresh) {
          if (authRetries >= (option.maxAuthRetries || 0)) {
            rejectOnce({
              status: 401,
              message: "登录状态已失效，请重新进入小程序",
              detail: responseData,
              url: requestUrl,
            });
            return;
          }

          authRetries += 1;
          refreshAuth().then(({ token, openid }) => {
            headers.token = token;
            headers.openid = openid;
            request();
          }).catch((error: RequestError) => {
            rejectOnce({
              status: error.status || 401,
              message: error.message || "登录刷新失败",
              detail: error,
              url: requestUrl,
            });
          });
          return;
        }

        if (responseData !== undefined && responseData !== null) {
          resolveOnce(responseData as T);
          return;
        }

        rejectOnce({
          status: 502,
          message: "服务返回了空响应",
          detail: res,
          url: requestUrl,
        });
      },
      fail(err) {
        const isTimeout = err.errMsg.indexOf("timeout") >= 0;
        const error: RequestError = {
          status: isTimeout ? 408 : 0,
          message: isTimeout ? "网络超时，请重试" : "网络异常，请检查网络连接",
          detail: err,
          url: requestUrl,
        };

        if (option.failModel) {
          endLoading();
          wx.showModal({
            content: error.message,
            confirmText: "重试",
            success: (e) => {
              if (e.confirm) {
                beginLoading();
                request();
              } else {
                rejectOnce(error);
              }
            },
            fail: () => rejectOnce(error),
          });
          return;
        }

        if (!option.throwCatch) {
          instance.showToast({ title: error.message, icon: "none", duration: 2000 });
        }
        rejectOnce(error);
      }
    });

    beginLoading();
    request();
  });
}


/**
 * 地址转换
 * @param address 
 * @returns 
 */
export const extractProvinceCityDistrict = (address: string) => {
  const regex = /(?<province>[^省]+省|[^自治区]+自治区|[^特别行政区]+特别行政区|[^市]+市)(?<city>[^市]+市|[^自治州]+自治州|[^地区]+地区|[^盟]+盟)?(?<district>[^县]+县|[^区]+区|[^旗]+旗|[^镇]+镇)?/;
  const match = address.match(regex);

  if (match) {
    return {
      province: match?.groups?.province || null,
      city: match?.groups?.city || null,
      district: match?.groups?.district || null
    };
  }
  return { province: null, city: null, district: null };
}

/**
 * 判断亮色
 * @param hexColor 
 * @returns 
 */
export const isLightColor = (hexColor: string) => {
  // 移除前导的#符号（如果存在）
  hexColor = hexColor.replace('#', '');

  // 将十六进制字符串转换为 RGB 值
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  // 计算亮度
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // 判断亮度是否大于128（或其他阈值）
  return luminance >= 128;
}
