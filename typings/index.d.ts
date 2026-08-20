/// <reference path="./types/index.d.ts" />

interface IProxyObserver {
  get?: (target: Record<string, any>, key: PropertyKey, receiver: unknown) => void,
  set?: (target: Record<string, any>, key: PropertyKey, value: any, receiver: unknown) => void,
}

interface IAppOption {
  globalData: Record<string, any>,
  proxyData: Record<string, any>,
  bindProxy: () => void,
  setProxy: (key: PropertyKey, observer: IProxyObserver) => () => void,
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}
