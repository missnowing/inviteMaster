export const USER_STORAGE_KEY = "user";

export type UserSession<TUserInfo = Record<string, unknown>> = {
  token: string;
  openid: string;
  userinfo: TUserInfo;
  perlogo: string;
};

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeUserSession = <TUserInfo = Record<string, unknown>>(
  raw: unknown,
): UserSession<TUserInfo> | null => {
  let value = raw;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  if (!isRecord(value) || typeof value.token !== "string" || typeof value.openid !== "string") {
    return null;
  }

  if (!value.token || !value.openid) {
    return null;
  }

  return {
    token: value.token,
    openid: value.openid,
    userinfo: (isRecord(value.userinfo) ? value.userinfo : {}) as TUserInfo,
    perlogo: typeof value.perlogo === "string" ? value.perlogo : "",
  };
};

export const readUserSession = <TUserInfo = Record<string, unknown>>() =>
  new Promise<UserSession<TUserInfo> | null>((resolve) => {
    wx.getStorage({
      key: USER_STORAGE_KEY,
      success: (res) => resolve(normalizeUserSession<TUserInfo>(res.data)),
      fail: () => resolve(null),
    });
  });

export const writeUserSession = <TUserInfo>(session: UserSession<TUserInfo>) =>
  new Promise<void>((resolve, reject) => {
    wx.setStorage({
      key: USER_STORAGE_KEY,
      data: session,
      success: () => resolve(),
      fail: reject,
    });
  });

export const clearUserSession = () =>
  new Promise<void>((resolve) => {
    wx.removeStorage({
      key: USER_STORAGE_KEY,
      complete: () => resolve(),
    });
  });
