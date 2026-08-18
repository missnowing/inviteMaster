import { _request } from "../utils/util";
import { _Server } from "./global";

export type TUser = {
  token: string,
  openid: string,
};
export type TUserInfo = {
  id: number,
  openid: number,       //微信open_id
  unionId: number,      //微信union_id
  nickName: string,     //昵称
  avatarUrl: string,    //头像URL
  realName: string,     //真实姓名
  phone: string,        //手机号
  gender: number,       //性别：0未知 1男 2女
  birthday: string,     //生日
  status: number,       //状态：0禁用 1正常
  date: string,
};
const initUser: TUser = {
  token: "",
  openid: "",
};
export const UserSlice = {
  name: 'user',
  initialState: initUser,
  reducers: {
    setUser: (payload: TUser) => {
      const app = getApp();
      app.globalData.user = payload;
    },
    setUserInfo: (payload: TUserInfo) => {
      const app = getApp();
      app.proxyData.userInfo = payload || {};
    },

    getUserHeader: () => {
      const app = getApp();
      return {
        token: app.globalData.user.token,
        openid: app.globalData.user.openid,
      }
    }
  },
}

export const {
  setUser,
  setUserInfo,

  getUserHeader,
} = UserSlice.reducers;

export const queryUser = () => getApp().globalData.userInfo;

export const selectUserInfo = () => _request({
  url: `/witinvite/base/get`, header: getUserHeader(), mask: !0, throwCatch: !0,
}).then((r: any) => {
  if (r.result >= 0) {
    setUserInfo(r.message);
    return Promise.resolve(r);
  } else {
    return Promise.reject(r);
  }
});

export const updatetUserInfo = (map: TUserInfo) => _request({
  url: `/witinvite/user/add`, params: map, header: getUserHeader(), formData: !1
}).then((r: any) => {
  if (r.result >= 0) {
    // setUserInfo({ ...getApp().globalData.userInfo, ...JSON.parse(map) });
    setUserInfo(r.message);
    return Promise.resolve(r);
  } else {
    return Promise.reject(r);
  }
});

export default UserSlice.reducers;
