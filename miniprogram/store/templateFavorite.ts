import { _request } from "../utils/util";
import { TTemplate } from "./template";
import { getUserHeader } from "./userSlice";

export type TTemplateFavorite = Partial<TTemplate> & {
  id: number,
  templateId?: number,
  template?: TTemplate,
};

const unwrapTemplate = (favorite: TTemplateFavorite): TTemplateFavorite => {
  return favorite.template ? { ...favorite.template, templateId: favorite.template.id } : favorite;
};

export const selectTemplateFavorites = ({ page = 1, pageSize = 30 } = {}) =>
  _request({
    url: "/witinvite/favorite/getList",
    query: { page, pageSize },
    header: getUserHeader(),
  }).then((r: any) => {
    if (r.result < 0) return Promise.reject(r);
    const list = Array.isArray(r.message) ? r.message.map(unwrapTemplate) : [];
    return Promise.resolve({ list, total: Number(r.total || list.length) });
  });

export const createTemplateFavorite = (templateId: number) =>
  _request({
    url: "/witinvite/favorite/add",
    query: { templateId },
    header: getUserHeader(),
  }).then((r: any) => r.result >= 0 ? Promise.resolve(r.message) : Promise.reject(r));

export const cancelTemplateFavorite = (templateId: number) =>
  _request({
    url: "/witinvite/favorite/cancel",
    query: { templateId },
    header: getUserHeader(),
  }).then((r: any) => r.result >= 0 ? Promise.resolve(r.message) : Promise.reject(r));

export const checkTemplateFavorite = (templateId: number) =>
  _request({
    url: "/witinvite/favorite/check",
    query: { templateId },
    header: getUserHeader(),
  }).then((r: any) => r.result >= 0 ? Promise.resolve(!!r.message) : Promise.reject(r));
