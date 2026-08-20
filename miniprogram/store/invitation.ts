import { _request, reflectEntity } from "../utils/util";
import { getUserHeader } from "./userSlice";

export type TInvitation = {
  [key: string]: any,
  id: number,
  userOpenid: string,         //创建人openid
  templateId: number,         //使用的模板ID
  title: string,              //请柬标题
  eventType: string,          //活动类型
  eventName: string,          //活动名称/事由
  hostName: string,           //主人姓名
  eventDate: string,          //活动日期
  lunarDate: string,          //农历日期
  eventTime: string,          //活动时间
  eventAddress: string,       //活动地址
  longitude: number,          //经度
  latitude: number,           //纬度
  coverImage: string,         //封面图片
  themeColor: string,         //主题配色
  backgroundMusic: string,    //背景音乐
  customData: string,         //自定义数据JSON
  allowAnonymous: boolean,    //是否允许匿名：0否 1是
  needPhone: boolean,         //是否需要手机号：0否 1是
  allowModifyGuests: boolean, //是否可修改人数：0否 1是
  maxGuests: number,          //最多携带人数
  allowUploadPhotos: boolean, //是否允许上传照片
  allowDownloadPhotos: boolean,   //是否允许下载照片
  enableMessage: boolean,     //是否开通留言
  status: number,             //状态：0草稿 1发布 2结束 3取消
  shareCount: number,         //分享次数
  viewCount: number,          //浏览次数
  publishTime: string,        //发布时间
  endTime: string,            //结束时间
  date: string,

  _address?: string,           //可补充详细地址
  _eventContent?: string,      //邀请词
};

export const InvitationSlice = {
  name: 'invitations',
  initialState: [],
  reducers: {
    setInvitation: (invitations: TInvitation[]) => {
      getApp().proxyData.invitation = invitations.map(invitation => {
        return { ...invitation }
      });
    },
    updateInvitation: (invitation: TInvitation) => {
      const app = getApp(), invitations = app.proxyData.invitation,
        index = invitations.findIndex((invitation_: TInvitation) => invitation_.id === invitation.id);
      index >= 0 ? invitations.splice(index, 1, invitation) : invitations.unshift(invitation);
      app.proxyData.invitation = [...invitations];
    },
    removeInvitation: (invitation: TInvitation) => {
      const app = getApp(), { id } = invitation,
        invitations = app.proxyData.invitation,
        index = invitations.findIndex((invitation: TInvitation) => invitation.id === id);
      if (index < 0) return;
      invitations.splice(index, 1);
      app.proxyData.invitation = [...invitations];
    },
  },
}

export const {
  setInvitation, updateInvitation, removeInvitation,
} = InvitationSlice.reducers;

export const queryInvitation = () => getApp().globalData.invitation;

/***
 * 获取邀请函
 */
export const selectInvitation = ({ page = 1, pageSize = 30 } = {}) =>
  _request({
    url: `/witinvite/invitation/getList`, header: getUserHeader(),
    query: { page, pageSize },
  }).then((r: any) => {
    if (r.result >= 0) {
      const list = Array.isArray(r.message) ? r.message : [];
      setInvitation(list);
      return Promise.resolve({ list, total: Number(r.total || list.length) });
    } else {
      return Promise.reject(r);
    }
  })

/***
 * 创建邀请函
 */
export const createInvitation = (invitation: TInvitation) =>
  _request({
    url: `/witinvite/invitation/add`, header: getUserHeader(),
    params: reflectEntity(invitation),
    formData: !1,
  }).then((r: any) => {
    if (r.result >= 0) {
      updateInvitation(r.message);
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

/***
* 获取邀请函详情
*/
export const selectInvitationInfo = (id: number) =>
  _request({
    url: `/witinvite/invitation/getInfo`, header: getUserHeader(),
    query: { id },
  }).then((r: any) => {
    if (r.result >= 0) {
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

export default InvitationSlice.reducers;
