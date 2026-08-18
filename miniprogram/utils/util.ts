import { wxLogin } from '../store/global';
import FormData from './formdata';
import MD5 from './lib/MD5';
import instance from './instance';
export const _Server = "https://witknow.com/";
export const _CDN = "https://cdniwallet.apisesame.com/";

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
  console.log(urlencoded);
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
  params?: {
    [key: string]: string | number
  },
  header?: object,
  timeout?: number,
  delay?: number,
  loadingTip?: string,
  mask?: boolean,
  loading?: boolean,
  throwCatch?: boolean,
  failModel?: boolean,
  contentType?: string,
  formData?: boolean,
  then_?: Function,
  catch_?: Function,
};
export const reflectEntity = <T>(entity: T): T => {
  for (let key in entity) {
    if (key.search(/^_/) >= 0) {
      delete entity[key];
    }
  }
  return entity;
}
export const _request = (opt: TOption): Promise<Object> => {
  // console.log(opt);
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
      then_: () => { },
      catch_: () => { },
    }, ...opt
  };
  let formData = new FormData();
  const { server, method, url, params, header, timeout, delay, mask, loadingTip } = option;
  console.log(option, option.formData);
  for (let k in params) {
    formData.append(k, params[k]);
  }
  const data = formData.getData();

  let max = 3;
  return new Promise<Object>((resolve, reject) => {
    let st: number;
    if (option.loading) st = setTimeout(() => instance.showLoading({ title: loadingTip as string, mask }), delay);
    console.log("params:", params, option.formData);
    const request = () => wx.request({
      method: method,
      url: server + url,
      // data: data.buffer,
      data: option.formData ? data.buffer : params,
      timeout,
      header: {
        ...header,
        'content-type': option.formData ? data.contentType : option.contentType,
        "url": url
      },
      success(res) {
        if (res?.data) {
          // console.log(res.data.code);
          if (res.data.code === 400) {
            console.log("wxLogin", url);
            wxLogin(({ token, openid }) => {
              header.token = token;
              header.openid = openid;
              max--;
              max > 0 && request();
            })
            return;
          }
          resolve(res.data);
        } else reject({ status: 501, message: res });
      },
      fail(err) {
        console.log(err, url);
        option.failModel && wx.showModal({
          content: "网络异常！",
          confirmText: "重试",
          complete: (e) => {
            const { cancel, confirm, errMsg } = e;
            if (confirm) {
              _request(opt).then(option.then_).catch(option.catch_);
            } else if (cancel) {
            }
          }
        })
        option.throwCatch ? reject({ status: 401, message: err }) : instance.showToast({ title: "网络异常", icon: "error", duration: 2000 });
        return;
        if (err.errMsg.indexOf('request:fail timeout') >= 0) {
          instance.showToast({ title: "网络超时，请重试", icon: "error", duration: 2000 });
        } else if (err.errMsg.indexOf('request:fail') >= 0) {
          // const net = await wx.getNetworkType().networkType === 'none';
          instance.showToast({ title: "网络异常", icon: "error", duration: 2000 });
        } else instance.showToast({ title: err.errMsg.toString(), icon: "error", duration: 2000 })
      },
      complete() {
        st && delay && delay > 0 && clearTimeout(st);
        // option.loading && setTimeout(() => wx.hideLoading(), 0);
        option.loading && wx.hideLoading();
      }
    })
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