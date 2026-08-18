import { _request } from "../utils/util";
import { _Server } from "./global";
import { ITempType } from "./temptype";
import { getUserHeader } from "./userSlice";

export type TTemplateStyle = {
  id: number,
  parentId: number,       //父风格ID，0表示一级风格
  name: string,           //风格名称
  code: string,           //风格编码
  sortOrder: number,      //排序
  status: number,         //状态：0隐藏 1显示
  date: string,
};
export type TTemplate = {
  id: number,
  parentCategoryId: number, //父分类ID
  categoryId: number,     //分类ID
  styleId: number,        //风格ID
  name: string,           //模板名称
  thumbnail: string,      //缩略图
  bg: string,             //底图
  previewImages: string,  //预览图集，JSON数组
  description: string,    //模板描述
  templateData: string,   //模板数据结构，提交转string
  backgroundMusic: string,//默认背景音乐
  price: number,          //价格，单位分，0表示免费
  isDefault: boolean,     //是否默认模板
  sortOrder: number,      //排序
  status: number,         //状态：0下架 1上架
  viewCount: number,      //浏览次数
  useCount: number,       //使用次数
  date: string,           //创建时间

  _templateData: TTemplateData[]
};
export type TTemplateCategory = {
  id: number,
  parentId: number,       //父分类ID，0表示一级分类
  name: string,           //分类名称
  code: string,           //分类编码
  sortOrder: number,      //排序
  status: number,         //状态：0隐藏 1显示
  date: string,
};
export type TTemplateData = {
  key: string | undefined,
  type: "text" | "textarea" | "image",
  name: string,
  style: string,
  visible: boolean,
};
export interface ITemplate {
  [key: number]: {
    list: TTemplate[],
    page: number,
    parentCategoryId: number,
    total: number,
  },
  infos: [],
}
const initState: ITemplate = {
  infos: [],
};

export const TemplateSlice = {
  name: 'template',
  initialState: initState,
  reducers: {
    toTemplateCategory: (categorys: TTemplateCategory[]) => {
      const app = getApp();
      app.proxyData.category = [...categorys];
    },
    toTemplate: ({ parentCategoryId, page, list, total }: any) => {
      const app = getApp(), template = app.globalData.template;
      template[parentCategoryId] = { list, page, parentCategoryId, total };
      app.proxyData.template = { ...template };
    },
    toTemplateInfo: ({ id, info }:
      { id: number, info: TTemplate }) => {
      const app = getApp(), template = app.globalData.template,
        infos = app.globalData.template.infos;
      const index = infos.findIndex((info: TTemplate) => info.id === id);
      index >= 0 ? infos[index] = info : infos.push(info);
      app.proxyData.template = { ...template, infos };
    },
  },
}

export const {
  toTemplateCategory,
  toTemplate,
  toTemplateInfo,
} = TemplateSlice.reducers;

export const queryTemplate = () => getApp().template;

/***
 * 获取模板分类
 */
export const selectTemplateCategory = () => {
  return _request({
    url: `/witinvite/template-category/get`, params: {
    }, header: getUserHeader()
  }).then((r: any) => {
    if (r.result >= 0) {
      toTemplateCategory(r.message);
      return Promise.resolve({ list: r.message });
    } else {
      return Promise.reject(r);
    }
  }).catch(e => {
    console.log(e);
    return Promise.reject(e);
  })
}

/***
 * 获取名片模板
 */
export const selectTemplate = ({
  parentCategoryId = 0,
  page = 1,
  pageSize = 30 }) => {
  return _request({
    url: `/witinvite/template/get`, params: {
      parentCategoryId, page, pageSize,
    }, header: getUserHeader(), throwCatch: !0, formData: !1,
  }).then((r: any) => {
    console.log(r);
    toTemplate({ parentCategoryId, page, list: r.message, total: r.total });
    if (r.result >= 0) {
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  }).catch(e => {
    console.log(e);
    return Promise.reject({ parentCategoryId, page });
  })
}

/***
 * 获取名片模板详情
 */
export const selectTemplateInfo = (id: number) => {
  return _request({
    url: `/witinvite/template/getInfo`, params: {
      id
    }, header: getUserHeader(), throwCatch: !0
  }).then((r: any) => {
    if (r.result >= 0) {
      const template: TTemplate = r.message;
      toTemplateInfo({ id, info: template });
      return Promise.resolve(template);
    } else {
      return Promise.reject(r);
    }
  }).catch(e => {
    console.log(e);
    return Promise.reject({ id });
  })
}

export default TemplateSlice.reducers;
