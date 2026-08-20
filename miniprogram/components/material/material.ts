import { IMaterial, TMaterial, TMaterialCategory, createMaterial, queryMaterial, queryMaterialCategory, selectMaterial, selectMaterialCategory } from "../../store/material";
import { _CDN, uploadImage } from "../../store/global";
type TMode = "upload" | "select";
Component({
    data: {
        _CDN: _CDN,
        material: {
            category: "",
            coverUrl: "",
            fileKey: "",
            fileSize: 0,
            fileType: "",
            mimeType: "",
            name: "",
            remark: "",
            sortOrder: 0,
            status: 0,
            url: "",
        } as TMaterial,
        play: !1,
        selectSwiper: 0,
        materialCategorys: [] as TMaterialCategory[],
        materials: {} as IMaterial,
    },
    properties: {
        mode: {
            type: String,
            value: "upload" as TMode,
        },
        select: {
            type: String,
            observer(newVal, oldVal) {
                if (!newVal) return;
                const _materialCategorys = getApp().globalData.materialCategory,
                    materialCategorys = _materialCategorys.filter((cate: TMaterialCategory) => cate.code === newVal)
                if (!materialCategorys.length) return;
                this.setData({
                    materialCategorys,
                    material: { ...this.data.material, category: materialCategorys[0].code }
                })
            }
        },
    },
    lifetimes: {
        async attached() {
            const app = getApp();
            (this as any)._unsubscribeMaterial = app.setProxy("material", {
                set: (target: any, key: string, value: IMaterial, receiver: any) => {
                    this.setData({
                        materials: { ...value }
                    })
                }
            })
            let materialCategorys = queryMaterialCategory(), materials = queryMaterial();
            try {
                if (!materialCategorys.length) {
                    materialCategorys = await selectMaterialCategory();
                }
                if (!materials.load) {
                    await selectMaterial();
                }
            } catch (_) {
                wx.showToast({ title: "素材加载失败", icon: "none" });
            }
            materials = queryMaterial();
            if (materials.load) this.setData({ materials })
            const { select, material } = this.data;
            const visibleCategories = select
                ? materialCategorys.filter((category: TMaterialCategory) => category.code === select)
                : materialCategorys;
            this.setData({
                materialCategorys: visibleCategories,
                material: visibleCategories[0]
                    ? { ...material, category: visibleCategories[0].code }
                    : material,
            });
        },
        detached() {
            (this as any)._unsubscribeMaterial?.();
            (this as any)._unsubscribeMaterial = null;
        },
    },
    methods: {
        tapSwiper(e: WechatMiniprogram.TouchEvent) {
            const { index: selectSwiper } = e.currentTarget.dataset;
            this.setData({ selectSwiper })
        },
        tapChanged(e: WechatMiniprogram.TouchEvent) {
            const { current: selectSwiper } = e.detail,
                { material } = this.data, { materialCategorys } = this.data;
            if (!materialCategorys[+selectSwiper]) return;
            this.setData({ selectSwiper, material: { ...material, category: materialCategorys[+selectSwiper].code } });
        },
        tapPreviewMaterial(e: WechatMiniprogram.TouchEvent) {
            const { item: material } = e.currentTarget.dataset;
            const { mode, select } = this.data;
            if (mode === "select") {
                if (select && material.category !== select) return;
                this.triggerEvent('trigger', { material });
                return;
            }
            if (material.category === "music") {
                const backgroundAudioManager = wx.getBackgroundAudioManager();
                backgroundAudioManager.title = material.name;
                backgroundAudioManager.src = _CDN + material.url;
                backgroundAudioManager.play();
                return;
            }
            if (material.category === "image") {
                const { material: materialMap } = getApp().globalData,
                    list: TMaterial[] = materialMap[material.category]?.list;
                const current = list.findIndex(material_ => material_.id === material.id),
                    sources = list.map(material_ => {
                        return {
                            url: _CDN + material_.url,
                            type: material.category,
                            poster: material.coverUrl,
                        };
                    });
                wx.previewMedia({
                    current,
                    sources
                })
                return;
            }
        },
        tapMaterialUpload() {
            const { material } = this.data;
            switch (material.category) {
                case 'font':
                    wx.chooseMessageFile({
                        count: 1,
                        type: 'file',
                        extension: ['ttf', 'otf', 'woff', 'woff2'],
                        success: (res) => {
                            const { path: tempPath, name: fileName, size: fileSize } = res.tempFiles[0] as any;
                            const fileType = tempPath.split(".").reverse()[0];
                            if (fileSize / 1024 / 1024 > 20) {
                                wx.showToast({ title: "字体过大，请选择低于20M", icon: "error" });
                                return;
                            }
                            this._doMaterialUpload({
                                tempPath, fileName, fileType,
                            });
                        }
                    })
                    break;
                case "music":
                    const component = this.selectComponent("#the-cut");
                    component.onTap();
                    break;
                case "image":
                    wx.chooseMedia({
                        count: 1,
                        mediaType: ['image'],
                        sourceType: ['album', 'camera'],
                        success: (res) => {
                            const { tempFiles } = res;
                            const { size: fileSize, tempFilePath: tempPath } = tempFiles[0] as any;
                            const ext = tempPath.split(".").reverse()[0];
                            const fileType = ext === "jpg" ? "jpeg" : ext;
                            const fileName = tempPath.split("/").reverse()[0];
                            if (fileSize / 1024 / 1024 > 10) {
                                wx.showToast({ title: "图片过大，请选择低于10M", icon: "error" });
                                return;
                            }
                            this._doMaterialUpload({
                                tempPath, fileName, fileType,
                            });
                        }
                    })
                    break;
                case "video":
                    wx.chooseMedia({
                        count: 1,
                        mediaType: ['video'],
                        sourceType: ['album', 'camera'],
                        sizeType: ['compressed'],
                        maxDuration: 60,
                        success: (res) => {
                            const { tempFiles } = res;
                            const {
                                size: fileSize,
                                tempFilePath: tempPath,
                                duration,
                                fileType: category,
                                height,
                                thumbTempFilePath: coverUrl,
                                width,
                            } = tempFiles[0] as any;
                            const fileType = tempPath.split(".").reverse()[0];
                            const fileName = tempPath.split("/").reverse()[0];
                            if (fileSize / 1024 / 1024 > 50) {
                                wx.showToast({ title: "视频过大，请选择低于50M", icon: "error" });
                                return;
                            }
                            this._doMaterialUpload({
                                tempPath, fileName, fileType,
                                coverUrl,
                            });
                        }
                    })
                    break;
                case "other":
                    wx.chooseMessageFile({
                        count: 1,
                        type: 'file',
                        success: (res) => {
                            const { path: tempPath, name: fileName, size: fileSize } = res.tempFiles[0] as any;
                            const fileType = tempPath.split(".").reverse()[0];
                            if (fileSize / 1024 / 1024 > 20) {
                                wx.showToast({ title: "文件过大，请选择低于20M", icon: "error" });
                                return;
                            }
                            this._doMaterialUpload({
                                tempPath, fileName, fileType,
                            });
                        }
                    })
                    break;
                default: break;
            }
        },
        _doMaterialUpload(partial: Partial<TMaterial> & { tempPath: string, fileType: string, fileName: string }) {
            wx.showLoading({ title: '上传中' });
            const { material } = this.data, { tempPath, fileType, fileName } = partial;
            uploadImage({ tempPath, suffix: fileType }).then((r: any) => {
                const { mimetype: mimeType, url, file_size: fileSize } = r;
                const entity: TMaterial = {
                    ...material,
                    ...partial,
                    fileType,
                    mimeType,
                    fileSize,
                    url,
                    name: fileName,
                };
                if (entity.tempPath) delete entity.tempPath
                if (entity.coverUrl) {
                    return uploadImage({ tempPath: entity.coverUrl, suffix: "jpg" })
                        .then((r: any) => entity.coverUrl = r.url).then(_ => createMaterial(entity))
                } else return createMaterial(entity);
            }).then(() => {
                wx.showToast({ title: "上传成功", icon: "success" });
                this.setData({
                    material: {
                        category: material.category,
                        coverUrl: "",
                        fileKey: "",
                        fileSize: 0,
                        fileType: "",
                        mimeType: "",
                        name: "",
                        remark: "",
                        sortOrder: 0,
                        status: 0,
                        url: "",
                    }
                });
            }).catch(() => {
                wx.showToast({ title: "上传失败", icon: "error" });
            }).finally(() => {
                wx.hideLoading();
            });
        },
        onAudioCutConfirm(e: WechatMiniprogram.CustomEvent) {
            const { tempFilePath, fileName } = e.detail;
            const popup = this.selectComponent("#the-cut");
            popup.onClose();

            wx.showLoading({ title: '上传中' });
            const { material } = this.data;
            const fileType = 'wav';

            uploadImage({ tempPath: tempFilePath, suffix: fileType }).then((r: any) => {
                const { mimetype: mimeType, url, file_size: fileSize } = r;
                const entity: TMaterial = {
                    ...material,
                    fileType,
                    mimeType,
                    fileSize,
                    url,
                    name: fileName || '音频文件',
                };
                // this.triggerEvent("trigger", { material: { url } })
                return createMaterial(entity);
            }).then(() => {
                wx.showToast({ title: "上传成功", icon: "success" });
                this.setData({
                    material: {
                        category: material.category,
                        coverUrl: "",
                        fileKey: "",
                        fileSize: 0,
                        fileType: "",
                        mimeType: "",
                        name: "",
                        remark: "",
                        sortOrder: 0,
                        status: 0,
                        url: "",
                    }
                });
            }).catch(() => {
                wx.showToast({ title: "上传失败", icon: "error" });
            }).finally(() => {
                wx.hideLoading();
                wx.getFileSystemManager().unlink({ filePath: tempFilePath, fail: () => { } });
            });
        },
        onAudioCutCancel() {
            const popup = this.selectComponent("#the-cut");
            popup.onClose();
        },
    },
})
