import { TOption, _request, reflectEntity } from "../utils/util";
import { _Server, setPerlogo } from "./global";
import { getUserHeader } from "./userSlice";

export type TFavorite = {
  id: number,
}

export const FavoriteSlice = {
  name: 'favorite',
  initialState: [],
  reducers: {
    setFavorite: (favorites: TFavorite[]) => {
      const app = getApp();
      app.proxyData.favorite = favorites;
    },
    updateFavorite: (favorite: TFavorite) => {
      const app = getApp(), favorites = app.proxyData.favorite,
        index = favorites.findIndex((favorite_: TFavorite) => favorite_.id === favorite.id);
      index >= 0 ? favorites.splice(index, 1, favorite) : favorites.unshift(favorite);
      app.proxyData.favorite = [...favorites];
    },
    removeFavorite: (id: number) => {
      const app = getApp(),
        favorites = app.proxyData.favorite,
        index = favorites.findIndex((favorite_: TFavorite) => favorite_.id === id);
      favorites.splice(index, 1);
      app.proxyData.favorite = [...favorites];
    },
  },
}

export const {
  setFavorite, updateFavorite, removeFavorite,
} = FavoriteSlice.reducers;

export const queryFavorite = () => getApp().favorite;

/***
 * 获取我的邀请函收藏列表
 */
export const selectFavorite = () =>
  _request({
    url: `/witinvite/invitation-favorite/getList`, header: getUserHeader(),
  }).then((r: any) => {
    if (r.result >= 0) {
      setFavorite(r.message);
      return Promise.resolve();
    } else {
      return Promise.reject(r);
    }
  })

/***
 * 收藏邀请函
 */
export const createFavorite = (invitationId: number) =>
  _request({
    url: `/witinvite/invitation-favorite/add`, header: getUserHeader(),
    params: { invitationId },
  }).then((r: any) => {
    if (r.result >= 0) {
      updateFavorite(r.message);
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

/***
* 取消邀请函收藏
*/
export const cancelFavorite = (invitationId: number) =>
  _request({
    url: `/witinvite/invitation-favorite/cancel`, header: getUserHeader(),
    params: { invitationId },
  }).then((r: any) => {
    if (r.result >= 0) {
      removeFavorite(invitationId);
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

/***
* 检查邀请函收藏
*/
export const checkFavorite = (invitationId: number) =>
  _request({
    url: `/witinvite/invitation-favorite/check`, header: getUserHeader(),
    params: { invitationId },
  }).then((r: any) => {
    if (r.result >= 0) {
      return Promise.resolve(!!r.message);
    } else {
      return Promise.reject(r);
    }
  })

export default FavoriteSlice.reducers;
