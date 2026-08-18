import { TOption, _request, reflectEntity } from "../utils/util";
import { _Server, setPerlogo } from "./global";
import { getUserHeader } from "./userSlice";

export type TMaterialCategory = {
  code: string,
  name: string,
  status: number,
};
export type TMaterial = {
  [key: string]: any,
  category: string,
  coverUrl: string,
  date?: string,
  fileKey: string
  fileSize: number
  fileType: string,
  id?: number
  mimeType: string,
  name: string,
  remark: string,
  sortOrder: number,
  status: number,
  url: string,
};
export type IMaterial = {
  [key: string]: {
    list: TMaterial[],
    total: number,
  },
}

export const MaterialSlice = {
  name: 'Material',
  initialState: [],
  reducers: {
    toMaterial: ({ message, total }: { message: TMaterial[], total: number }) => {
      const app = getApp(), materialMap = app.globalData.material;
      message.forEach(material => {
        const category = material.category;
        materialMap[category] = materialMap[category] || { list: [], total };
        materialMap[category].list.push(material);
      });
      materialMap.load = !0;
      app.proxyData.material = { ...materialMap };
    },
    toMaterialCategory: (materialCategorys: TMaterialCategory[]) => {
      const app = getApp();
      app.proxyData.materialCategory = [...materialCategorys];
    },
    updateMaterial: (material: TMaterial) => {
      const app = getApp(), category = material.category,
        materialMap = app.proxyData.material as IMaterial,
        { list, total } = materialMap[category] || { list: [], total: 0 },
        index = list.findIndex((material_) => material_.id === material.id);
      index >= 0 ? list.splice(index, 1, material) : list.unshift(material);
      materialMap[category] = { list, total }
      app.proxyData.material = { ...materialMap };
    },
    removeMaterial: (material: TMaterial) => {
      const app = getApp(), { id } = material,
        materials = app.proxyData.material as TMaterial[],
        index = materials.findIndex((material_) => material_.id === id);
      materials.splice(index, 1);
      app.proxyData.material = [...materials];
    },
  },
}

export const {
  toMaterial, updateMaterial, removeMaterial,
  toMaterialCategory,
} = MaterialSlice.reducers;

export const queryMaterial = () => getApp().globalData.material;
export const queryMaterialCategory = () => getApp().globalData.materialCategory;

/***
 * 获取素材
 */
export const selectMaterial = () =>
  _request({
    url: `/witinvite/material/get`, header: getUserHeader(), formData: !1,
  }).then((r: any) => {
    if (r.result >= 0) {
      toMaterial(r);
      return Promise.resolve(r);
    } else {
      return Promise.reject(r);
    }
  })

/***
* 获取素材分类
*/
export const selectMaterialCategory = () =>
  _request({
    url: `/witinvite/material/category`, header: getUserHeader(),
  }).then((r: any) => {
    if (r.result >= 0) {
      toMaterialCategory(r.message);
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

/***
 * 创建素材
 */
export const createMaterial = (material: TMaterial) =>
  _request({
    url: `/witinvite/material/add`, header: getUserHeader(),
    params: reflectEntity(material),
    formData: !1,
  }).then((r: any) => {
    if (r.result >= 0) {
      updateMaterial(r.message);
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

/***
* 获取素材详情
*/
export const selectNaterialInfo = (id: number) =>
  _request({
    url: `/witinvite/material/getInfo`, header: getUserHeader(),
    params: { id },
  }).then((r: any) => {
    console.log(r);
    if (r.result >= 0) {
      return Promise.resolve(r.message);
    } else {
      return Promise.reject(r);
    }
  })

export default MaterialSlice.reducers;
