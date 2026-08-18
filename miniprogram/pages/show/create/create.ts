import { TFont, _CDN, selectFonts, uploadImage } from "../../../store/global";
import { TInvitation, createInvitation } from "../../../store/invitation";
import { TMaterial } from "../../../store/material";
import { TTemplate, TTemplateCategory, TTemplateData, selectTemplateInfo, } from "../../../store/template";
import { TUserInfo } from "../../../store/userSlice";
Page({
    data: {
        style: {
            fontsize: getApp().globalData.style.rem,
        },
        userInfo: {} as TUserInfo,
        invitation: {
        } as TInvitation,
        audioPlayer: null as any,
        newBuffer: !1 as any,
        play: !1,
        musicName: "",
        attrs: {
            select: 0,
            list: ["字体", "大小", "间距", "行距", "对齐", "字色"],
            key: ["font-family", "font-size", "letter-spacing", "line-height", "text-align", "color"]
        },
        editTemplateData: {
            fontFamily: {
                select: 0,
                list: [
                    // { name: "宋体", key: "SimSun" },
                    // { name: "楷体", key: "KaiTi" },
                    // { name: "新宋体", key: "NSimSun" },
                ] as { name: string, key: string }[]
            },
            fontSize: undefined as unknown as number,
            letterSpacing: undefined as unknown as number,
            lineHeight: undefined as unknown as number,
            textAlign: {
                select: 1,
                list: [
                    { name: "icon-zuoduiqi", key: "left" },
                    { name: "icon-juzhongduiqi", key: "center" },
                    { name: "icon-youduiqi", key: "right" },
                ],
                value: { name: "icon-juzhongduiqi", key: "center" },
            },
            color: "",
        },
        template: {} as TTemplate,
        popElement: {
            element: {},
            index: 0,
        } as {
            element: TTemplateData,
            index: number,
        },
        editMode: !0,

        material: null as null | TMaterial,

        startDate: new Date().Format("yyyy-MM-dd") as string,

        showLunar: !1,
    },
    onUnload() {
        this.release();
    },
    onLoad() {
        this.setData({ userInfo: getApp().globalData.userInfo });
        this.getOpenerEventChannel().on('dataFromShow', ({ template }) => {
            console.log("dataFromShow:template", template);
            const formatTemplate = { ...template, _templateData: JSON.parse(template.templateData) }
            // this.setData({ template: formatTemplate })
            this.tapShowEdit();
            this.bindTemplateData(formatTemplate);
            if (template.backgroundMusic) {
                this._playMusic(template.backgroundMusic);
            }
        })
        this.getOpenerEventChannel().on('dataFromMine', ({ invitation }) => {
            console.log("dataFromMine:invitation", invitation);
            (this as any)._originCustomData = invitation.customData;
            (this as any)._originBgMusic = invitation.backgroundMusic || "";
            const infos = getApp().globalData.template.infos,
                template = infos.find((info: TTemplate) => info.id === invitation.templateId);
            if (template) {
                const formatTemplate = { ...template, _templateData: JSON.parse(invitation.customData) }
                this.setData({ invitation }, () => {
                    this.bindTemplateData({ ...formatTemplate }, invitation);
                })
            } else
                selectTemplateInfo(invitation.templateId).then(template => {
                    const formatTemplate = { ...template, _templateData: JSON.parse(invitation.customData) }
                    // console.log(formatTemplate); return;
                    this.setData({ invitation }, () => {
                        this.bindTemplateData(formatTemplate, invitation);
                    })
                });
            if (invitation.backgroundMusic) {
                this._playMusic(invitation.backgroundMusic);
            }
        })
        const initFont = () => {
            const app = getApp(), list = app.globalData.fonts.map((font: TFont) => {
                return {
                    name: font.name,
                    key: font.name
                };
            });
            this.setData({
                editTemplateData: {
                    ...this.data.editTemplateData,
                    fontFamily: {
                        select: 0,
                        list,
                    },
                }
            })
        }
        getApp().setProxy('fonts', {
            set: (target: typeof Proxy, key: string, value: TFont[], receiver: any) => {
                console.log(target, key, value, receiver);
                initFont()
            }
        });
        initFont();
    },
    //填充Invitation和templateData数据
    bindTemplateData(template: TTemplate, fromInvitation: TInvitation | undefined = undefined) {
        let invitation = this.data.invitation;
        try {
            invitation.templateId = template.id;
            console.log(template._templateData);
            // return;
            template._templateData.forEach(data => {
                const key = data.key;
                const styles: any = data.style;
                const visible = data.visible;
                invitation[`${key}_`] = visible;
                let style = "";
                for (let key in styles) {
                    let value = styles[key];
                    switch (key) {
                        case 'width':
                        case 'height':
                        case 'left':
                        case 'top':
                            style += `${key}:${(value * 100)}vw;`
                            break;
                        case 'font-size':
                        case 'letter-spacing':
                            style += `${key}:${(value * 100)}vw;`
                            break;
                        case 'line-height':
                            style += `${key}:${(value + "").includes('rem') ? `${value}` : `${value}rem`};`
                            break;
                        default:
                            style += `${key}:${styles[key]};`
                            break;
                    }
                }
                // console.log(style);
                data.style = style;
                if (key === 'eventDate') {
                    const date = (data.name as any).toDate();
                    if (!date) return;
                    invitation.lunarDate = date.lunarDate("cYcNcD");
                    invitation.eventDate = date.Format("yyyy-MM-dd");
                    invitation.eventTime = date.Format("hh:mm:ss");
                } else if (key) {
                    invitation[key] = data.name;
                }
                if (key === '_eventContent') {
                    if (fromInvitation !== undefined) {
                        invitation._eventContent = data.name;
                    }
                    invitation.__eventContent = data.name;
                    invitation._eventContent = data.name
                        .replace(/\[日期：.*\]/i, invitation.eventDate || "[日期]")
                        .replace(/\[时间：.*\]/i, invitation.eventTime || "[时间]")
                        .replace(/\[农历：.*\]/i, invitation.lunarDate || "[农历]")
                        .replace(/\[地点：.*\]/i, invitation.eventAddress || "[地点]");
                }
            });
            console.log("template:", template)
        } catch (e) {
            console.log(e);
        }
        if (fromInvitation === undefined) {
            const _invitation = wx.getStorageSync('invitation');
            invitation = { ...invitation, ..._invitation };
            console.log(invitation, _invitation)
            if (invitation.backgroundMusic) {
                //需要单开接口查询
            }
        }
        this.setData({ invitation: { ...invitation }, template: { ...template } });
    },
    //日期选择器回调
    onDateChange(e: any) {
        const eventDate = e.detail.value,
            lunarDate = (new Date(eventDate) as any).lunarDate("yy年cNcD");
        this.setData({
            invitation:
            {
                ...this.data.invitation,
                eventDate,
                lunarDate,
            }
        }, () => {
            this.toEventContent();
        })
    },
    //时间选择器回调
    onTimeChange(e: any) {
        const eventTime = e.detail.value;
        this.setData({
            invitation:
            {
                ...this.data.invitation,
                eventTime,
            }
        }, () => {
            this.toEventContent();
        })
    },
    //input和textarea的回调
    onInput(e: any) {
        const name = e.detail.value, index = this.data.popElement.index;
        const _templateData = this.data.template._templateData;
        _templateData[index].name = name;
        this.setData({
            popElement: { ...this.data.popElement, element: { ...this.data.popElement.element, name } },
            template: { ...this.data.template, _templateData, }
        },)
    },
    //invitation编辑事件
    bindContentChange(e: any) {
        const { key } = e.currentTarget.dataset, value = e.detail.value;
        console.log(key, value);
        this.setData({
            invitation: {
                ...this.data.invitation,
                [key]: value
            }
        })
    },
    //invitation可选事件
    bindOptionChange(e: any) {
        const { key } = e.currentTarget.dataset, syn = e.detail.value;
        console.log(key, syn);
        // const datas = this.data.template.templateData;
        // datas.forEach(data => {
        //     if (data.key === key) {
        //         data.name = syn;
        //     }
        // });
        this.setData({
            // template: { ...this.data.template },
            invitation: {
                ...this.data.invitation,
                [key]: syn ? 1 : 0
            }
        })
    },
    //templateData数据变化（font-family、text-align)
    bindTemplateDataIndexChange(e: any) {
        type TheObjectKeys = ObjectKeys<typeof this.data.editTemplateData>;
        const index = e.detail.value || e.currentTarget.dataset.index,
            index_element = this.data.popElement.index,
            key = e.currentTarget.dataset.key,
            dataKey: TheObjectKeys = key.replace(/-(.*)$/, function (_: never, p1: string) {
                return p1.charAt(0).toUpperCase() + p1.slice(1);
            });
        const _templateData = this.data.template._templateData;
        const styles = _templateData[index_element].style.split(';');
        const theIndex = styles.findIndex(style => style.includes(key));
        console.log(key, dataKey, styles, theIndex, this.data.editTemplateData[dataKey].list[index].key)
        styles.splice(theIndex, 1, `${key}:${this.data.editTemplateData[dataKey].list[index].key}`);
        _templateData[index_element].style = styles.join(";");
        this.setData({
            editTemplateData: {
                ...this.data.editTemplateData,
                [dataKey]: { ...this.data.editTemplateData[dataKey], select: index },
            },
            template: { ...this.data.template, _templateData }
        });
    },
    //templateData数据变化（font-size、letter-spacing、line-height、color）
    bindTemplateDataChange(e: any) {
        type TheBasicKeys = BasicKeys<typeof this.data.editTemplateData>;
        const value = e.detail.value ?? e.detail?.colorData.pickerData.hex,
            key = e.currentTarget.dataset.key,
            px = !!e.currentTarget.dataset.px,
            index_element = this.data.popElement.index,
            dataKey: TheBasicKeys = key.replace(/-(.*)$/, function (_: never, p1: string) {
                return p1.charAt(0).toUpperCase() + p1.slice(1);
            });
        const _templateData = this.data.template._templateData;
        const styles = _templateData[index_element].style.split(';');
        const theIndex = styles.findIndex(style => style.includes(key));
        styles.splice(theIndex, 1, `${key}:${value}${px ? 'vw' : 'rem'}`);
        _templateData[index_element].style = styles.join(";");
        this.setData({
            editTemplateData: {
                ...this.data.editTemplateData,
                [dataKey]: value,
            },
            template: { ...this.data.template, _templateData }
        });
    },
    //attr切换
    tapAttrChange(e: any) {
        const { index: select } = e.currentTarget.dataset;
        this.setData({ attrs: { ...this.data.attrs, select } })
    },
    //templateData元素点击打开编辑窗口
    tapEditElement(e: any) {
        const { item } = e.currentTarget.dataset,
            { element, index } = item;
        console.log(element, index);
        this.setData({ popElement: { element, index } }, () => {
            this.toAttr(element);
            const component = this.selectComponent("#the-elementEdit");
            component.onTapOpenComment();
        })
    },
    //绑定templateData的单个元素内容到编辑内容
    toAttr(element: TTemplateData) {
        const { editTemplateData } = this.data;
        console.log(element, editTemplateData);
        switch (element.type) {
            case 'image':
                break;
            case 'text':
            case 'textarea':
                const indexFamily = editTemplateData.fontFamily.list.findIndex(font => font.key === /font-family:([^;]+)/.exec(element.style)?.[1]),
                    indexTextAlign = editTemplateData.textAlign.list.findIndex(font => font.key === /text-align:([^;]+)(?:;|$)/.exec(element.style)?.[1]);
                const data: typeof editTemplateData = {
                    fontFamily: {
                        ...editTemplateData.fontFamily,
                        select: indexFamily < 0 ? 0 : indexFamily,
                    },
                    fontSize: /font-size:([^;]+)vw(?:;|$)/.exec(element.style)?.[1] as unknown as number,
                    letterSpacing: /letter-spacing:([^;]+)vw(?:;|$)/.exec(element.style)?.[1] as unknown as number,
                    lineHeight: /line-height:([^;]+)rem(?:;|$)/.exec(element.style)?.[1] as unknown as number,
                    textAlign: {
                        ...editTemplateData.textAlign,
                        select: indexTextAlign < 0 ? 0 : indexTextAlign,
                    },
                    color: /color:(\S*?)(?:;|$)/.exec(element.style)?.[1] as string,
                };
                console.log(data);
                this.setData({
                    editTemplateData: {
                        ...this.data.editTemplateData,
                        ...data
                    }
                });
                break;
            default: break;
        }

    },
    //绑定form的表单数据到templateData中
    toForm() {
        const { invitation, showLunar } = this.data,
            { _templateData } = this.data.template;
        console.log(invitation, _templateData);
        const eventNameIndex = _templateData.findIndex(data => data.key === 'eventName'),
            hostNameIndex = _templateData.findIndex(data => data.key === 'hostName'),
            eventAddressIndex = _templateData.findIndex(data => data.key === 'eventAddress'),
            eventDateIndex = _templateData.findIndex(data => data.key === 'eventDate'),
            eventTimeIndex = _templateData.findIndex(data => data.key === 'eventTime'),
            _eventContentIndex = _templateData.findIndex(data => data.key === '_eventContent' || (data.type === 'text' && !data.key));
        invitation.eventName_ && invitation.eventName && eventNameIndex >= 0 && (_templateData[eventNameIndex].name = invitation.title);
        invitation.hostName_ && invitation.hostName && hostNameIndex >= 0 && (_templateData[hostNameIndex].name = invitation.hostName);
        invitation.eventAddress_ && invitation.eventAddress && eventAddressIndex >= 0 && (_templateData[eventAddressIndex].name = invitation.eventAddress);
        invitation._eventContent_ && invitation._eventContent && _eventContentIndex >= 0 && (_templateData[_eventContentIndex].name = invitation._eventContent);
        invitation.eventDate_ && eventDateIndex >= 0 && (_templateData[eventDateIndex].name = `${invitation.eventDate}${showLunar ? '(' + invitation.lunarDate + ')' : ''}`);
        invitation.eventTime_ && eventTimeIndex >= 0 && (_templateData[eventTimeIndex].name = `${invitation.eventTime}`);
        this.setData({ template: { ...this.data.template, _templateData } })
    },
    //快速选择改变时应用到邀请词
    toEventContent() {
        const { invitation } = this.data, { _eventContent, __eventContent } = invitation;
        console.log(invitation.eventDate, __eventContent);
        invitation._eventContent = __eventContent
            .replace(/\[日期：.*\]/i, invitation.eventDate && new Date(invitation.eventDate).Format('yyyy年MM月dd号') || "[日期]")
            .replace(/\[时间：.*\]/i, invitation.eventTime || "[时间]")
            .replace(/\[农历：.*\]/i, invitation.lunarDate || "[农历]")
            .replace(/\[地点：.*\]/i, invitation.eventAddress || "[地点]");
        this.setData({ invitation: { ...invitation } })
    },
    tapLunar() {
        this.setData({ showLunar: !this.data.showLunar });
    },
    tapShowEdit() {
        const component = this.selectComponent("#the-edit");
        component.onTapOpenComment();
    },
    tapHideEdit() {
        const component = this.selectComponent("#the-edit");
        component.onTapCloseComment();
    },
    tapLocation() {
        const { longitude, latitude } = this.data.invitation;
        wx.chooseLocation({
            longitude: +longitude,
            latitude: +latitude,
            success: (res) => {
                this.setData({
                    invitation: {
                        ...this.data.invitation,
                        longitude: +res.longitude,
                        latitude: +res.latitude,
                        // _eventAddress: res.name,
                        // _address: res.address
                        eventAddress: res.name,
                    },
                }, () => {
                    this.toEventContent();
                })
            },
            complete(e) {
                console.log(e);
            }
        })
    },
    tapMaterial(e: any) {
        const { select } = e.currentTarget.dataset;
        this.setData({ materialSelect: select }, () => {
            const component = this.selectComponent("#the-material");
            component.onTap();
            if (select === "music") this.tapPause();
        })
    },
    tapTempSave() {
        const invitation: Partial<TInvitation> = { ...this.data.invitation };
        delete invitation.templateId;
        delete invitation.id;
        wx.setStorage({
            key: 'invitation',
            data: invitation
        }).then(() => {
            this.toForm();
            this.tapHideEdit();
            wx.showToast({ title: '保存成功', icon: 'success', duration: 500 })
        }).catch((e) => {
            console.log(e);
            wx.showToast({ title: '保存失败', icon: 'error', duration: 500 })
        })
    },
    tapTempRemove() {
        wx.removeStorage({
            key: 'invitation',
        }).then(() => {
            wx.showToast({ title: '成功清除', icon: 'success', duration: 500 })
        })
    },
    triggerMaterial(e: WechatMiniprogram.CustomEvent) {
        // console.log(e);
        const { material } = e.detail, { invitation } = this.data;
        switch (material.category) {
            case "font": break;
            case "music":
                this.setData({ material, invitation: { ...invitation, backgroundMusic: material.url } })
                let _audioContext = (this as any)._audioContext;
                _audioContext && _audioContext?.destroy();
                _audioContext = wx.createInnerAudioContext();
                _audioContext.onPlay(() => {
                    this.setData({ play: !0 });
                });
                _audioContext.onError(() => {
                    this.setData({ play: !1 });
                });
                _audioContext.loop = !0;
                _audioContext.src = _CDN + material.url;
                _audioContext.play();
                (this as any)._audioContext = _audioContext;
                break;
            case "image":
                // console.log(this.data.popElement);
                const name = _CDN + e.detail.material.url, index = this.data.popElement.index;
                const _templateData = this.data.template._templateData;
                _templateData[index].name = name;
                this.setData({
                    popElement: { ...this.data.popElement, element: { ...this.data.popElement.element, name } },
                    template: { ...this.data.template, _templateData, }
                },)
                break;
            case "video": break;
            case "other": break;
        }
        const component = this.selectComponent("#the-material");
        component.onClose();
    },
    tapCancelMusic() {
        let _audioContext = (this as any)._audioContext;
        const { invitation } = this.data;
        _audioContext && _audioContext.destroy();
        (this as any)._audioContext = null;
        this.setData({ play: !1, invitation: { ...invitation, backgroundMusic: "" } })
    },
    tapPlay() {
        let _audioContext = (this as any)._audioContext;
        if (!_audioContext) return;
        const paused = _audioContext.paused;
        this.setData({ play: paused ? !0 : !1 }, () => {
            paused ? _audioContext.play() : _audioContext.pause();
        })
    },
    tapPause() {
        let _audioContext = (this as any)._audioContext;
        if (!_audioContext) return;
        const paused = _audioContext.paused;
        if (paused) return;
        this.setData({ play: !1 }, () => {
            _audioContext.pause();
        })
    },
    generateData(template: TTemplate) {
        const templateData_: TTemplateData[] = [];
        console.log(template._templateData)
        template._templateData.forEach(data => {
            const o: any = {};
            data.style.split(";").forEach(s => {
                const [key, value] = s.split(":");
                o[key] = (value + "").includes("vw") ? +value.replace('vw', '') / 100 : value;
            });
            templateData_.push({ ...data, style: o })
        });
        return JSON.stringify(templateData_);
    },
    tapSave() {
        const { invitation, template } = this.data;
        const category = getApp().globalData.category;
        if (!invitation.title || !invitation.eventAddress || !invitation.eventDate) {
            this.tapShowEdit();
            !invitation.title ? this.setData({ titleFocus: !0 }) : wx.showToast({ title: "请完善日期地点", icon: "error" })
            return;
        }
        const EInvitation: any = {
            ...invitation,
            customData: this.generateData(template),
            // coverImage: template.thumbnail,
            // eventAddress: `${invitation._eventAddress || ""}$$${invitation._address || ""}`,
            // eventAddress: invitation._eventAddress,
            eventDate: (new Date(invitation.eventDate) as any).Format("yyyy/MM/dd hh:mm:ss"),
            eventType: category.find((cate: TTemplateCategory) => cate.id === template.parentCategoryId)?.name,
        };
        console.log(template, EInvitation);
        // return;
        const originCustomData = (this as any)._originCustomData;
        const originBgMusic = (this as any)._originBgMusic;
        const customData = EInvitation.customData;
        const bgMusic = EInvitation.backgroundMusic || "";
        const unchanged = originCustomData != null
            && originCustomData === customData
            && originBgMusic === bgMusic;
        if (unchanged) {
            wx.showLoading({ title: "保存中..." });
            createInvitation(EInvitation).then(invitation => {
                wx.hideLoading();
                wx.showToast({ title: "快速保存成功！", icon: 'success' })
                this.release();
                setTimeout(() => wx.navigateBack(), 2000);
            }).catch(e => {
                wx.hideLoading();
                wx.showToast({ title: "保存失败！", icon: "error" });
            }).finally(() => {
                this.setData({ editMode: !0 })
            });
            return;
        }
        wx.showLoading({ title: "制作中..." });
        this.setData({ editMode: !1 }, () => {
            wx.nextTick(() => {
                this.createSelectorQuery()
                    .select(`#snapshot`)
                    .node()
                    .exec(res => {
                        const node = res[0].node
                        console.log(res, node);
                        node.takeSnapshot({
                            type: 'arraybuffer',
                            format: 'png',
                            success: (res: any) => {
                                const dt = new Date().getTime();
                                const tempPath = `${wx.env.USER_DATA_PATH}/${dt}.png`
                                const fs = wx.getFileSystemManager();
                                try {
                                    fs.writeFileSync(tempPath, res.data, 'binary')
                                    console.log(tempPath);
                                    wx.previewImage({ current: tempPath, urls: [] });
                                    // return;
                                    wx.showLoading({ title: "封面生成中..." });
                                    uploadImage({ tempPath, suffix: "png" }).then((r: any) => {
                                        console.log(_CDN + r.url);
                                        EInvitation.coverImage = r.url;
                                        createInvitation(EInvitation).then(invitation => {
                                            wx.hideLoading();
                                            wx.showToast({ title: "保存成功！", icon: 'success' })
                                            this.release();
                                            setTimeout(() => wx.navigateBack(), 2000);
                                        }).catch(e => {
                                            wx.hideLoading();
                                            wx.showToast({ title: "保存失败！", icon: "error" });
                                        }).finally(() => {
                                            this.setData({ editMode: !0 })
                                            fs.unlinkSync(tempPath);
                                        });
                                    }).catch((e: any) => {
                                        wx.hideLoading();
                                        wx.showToast({ title: "封面上传失败！", icon: "error" });
                                        this.setData({ editMode: !0 })
                                        fs.unlinkSync(tempPath);
                                    })
                                } catch (e: any) {
                                    wx.hideLoading();
                                    wx.showModal({
                                        title: '失败！',
                                        content: '缓存已满，请清空缓存重试',
                                    });
                                    this.setData({ editMode: !0 })
                                }
                            },
                            fail() {
                                wx.hideLoading();
                                wx.showToast({ title: '封面生成失败！', duration: 1500, icon: 'error' })
                                this.setData({ editMode: !0 })
                            }
                        })
                    })
                return;
            })
        })
    },
    release() {
        const _audioContext = (this as any)._audioContext;
        if (_audioContext) {
            _audioContext.destroy();
            (this as any)._audioContext = null;
        }
    },

    /**
     * 播放网络地址音乐
     * @param src 网络地址
     */
    _playMusic(src: string) {
        let _audioContext = (this as any)._audioContext;
        _audioContext && _audioContext.destroy();
        _audioContext = wx.createInnerAudioContext();
        _audioContext.onPlay(() => {
            this.setData({ play: !0 });
        });
        _audioContext.onError(() => {
            this.setData({ play: !1 });
        });
        _audioContext.loop = !0;
        _audioContext.src = src.includes(_CDN) ? src : _CDN + src;
        _audioContext.play();
        (this as any)._audioContext = _audioContext;
    },
})
