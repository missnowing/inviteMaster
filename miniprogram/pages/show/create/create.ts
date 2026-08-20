import { TFont, _CDN, restoreUserSession, uploadImage } from "../../../store/global";
import { TInvitation, createInvitation, selectInvitationInfo } from "../../../store/invitation";
import { TMaterial } from "../../../store/material";
import { TTemplate, TTemplateCategory, TTemplateData, selectTemplateInfo, } from "../../../store/template";
import { TUserInfo } from "../../../store/userSlice";
import {
    decodeTemplateData,
    encodeTemplateData,
    getElementLabel,
    toCanvasDisplayStyle,
    updateStyleValue,
} from "./templateCodec";

type TQuickField = "element" | "title" | "eventDate" | "eventTime" | "eventAddress" | "_eventContent" | "hostName";
type TEditorModule = "content" | "style" | "image" | "music" | "settings";

const editorModules: { index: string, label: string, value: TEditorModule }[] = [
    { index: "01", label: "内容", value: "content" },
    { index: "02", label: "样式", value: "style" },
    { index: "03", label: "图片", value: "image" },
    { index: "04", label: "音乐", value: "music" },
    { index: "05", label: "设置", value: "settings" },
];

const contentFields: { label: string, value: Exclude<TQuickField, "element"> }[] = [
    { label: "活动主题", value: "title" },
    { label: "活动日期", value: "eventDate" },
    { label: "活动时间", value: "eventTime" },
    { label: "活动地点", value: "eventAddress" },
    { label: "邀请词", value: "_eventContent" },
    { label: "邀请人", value: "hostName" },
];

const elementContentFields: Record<string, Exclude<TQuickField, "element">> = {
    eventName: "title",
    title: "title",
    eventDate: "eventDate",
    eventTime: "eventTime",
    eventAddress: "eventAddress",
    _eventContent: "_eventContent",
    hostName: "hostName",
};

const getCanvasVwPx = (windowWidth: number) => {
    const horizontalPadding = windowWidth * 36 / 750;
    return Math.max(1, (windowWidth - horizontalPadding - 2) / 100);
};

const toEditorNumber = (value: string | number | null | undefined, fallback: number) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Number(numberValue.toFixed(2)) : fallback;
};

const toEditorColor = (value: string | number) => {
    const color = String(value);
    return /^#[0-9a-f]{3,8}$/i.test(color) ? color.toUpperCase() : color;
};

const parseTemplateData = (raw: string): TTemplateData[] => {
    const result = decodeTemplateData(raw);
    if (!result.valid) {
        wx.showToast({ title: "模板数据格式错误", icon: "none" });
    }
    return result.list;
};

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
            list: [
                { mark: "字", label: "字体" },
                { mark: "12", label: "大小" },
                { mark: "AV", label: "间距" },
                { mark: "行", label: "行距" },
                { mark: "齐", label: "对齐" },
                { mark: "色", label: "字色" },
            ],
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
                    { name: "icon-zuoduiqi", key: "left", label: "左对齐" },
                    { name: "icon-juzhongduiqi", key: "center", label: "居中" },
                    { name: "icon-youduiqi", key: "right", label: "右对齐" },
                ],
                value: { name: "icon-juzhongduiqi", key: "center", label: "居中" },
            },
            color: "",
        },
        colorPresets: [
            { label: "墨", value: "#20211E" },
            { label: "松", value: "#2F4A46" },
            { label: "朱", value: "#B53B2E" },
            { label: "金", value: "#C39445" },
            { label: "纸", value: "#FBF8F1" },
            { label: "白", value: "#FFFFFF" },
        ],
        customColorOpen: !1,
        template: {} as TTemplate,
        popElement: {
            element: {},
            index: -1,
        } as {
            element: TTemplateData,
            index: number,
        },
        selectedElement: !1,
        selectedElementLabel: "",
        selectedElementType: "text",
        quickField: "eventDate" as TQuickField,
        quickFieldIndex: 1,
        quickFieldLabel: "活动日期",
        contentFields,
        editorModules,
        editorModule: "content" as TEditorModule,
        canvasVwPx: 1,
        formTab: "content" as "content" | "permission",
        isDirty: !1,
        isSaving: !1,
        editMode: !0,

        material: null as null | TMaterial,

        startDate: new Date().Format("yyyy-MM-dd") as string,

        showLunar: !1,
        editorState: "loading" as "loading" | "ready" | "error",
        editorError: "",
        routeTemplateId: 0,
        routeInvitationId: 0,
    },
    onUnload() {
        const routeFallbackTimer = (this as any)._routeFallbackTimer;
        if (routeFallbackTimer) clearTimeout(routeFallbackTimer);
        (this as any)._routeFallbackTimer = null;
        const unsubscribeFonts = (this as any)._unsubscribeFonts;
        if (unsubscribeFonts) unsubscribeFonts();
        (this as any)._unsubscribeFonts = null;
        this.disableLeaveAlert();
        this.release();
    },
    onLoad(options: { templateId?: string, invitationId?: string }) {
        const routeTemplateId = Number(options.templateId || 0);
        const routeInvitationId = Number(options.invitationId || 0);
        const wxApi = wx as any;
        const windowInfo = wxApi.getWindowInfo ? wxApi.getWindowInfo() : wx.getSystemInfoSync();
        this.setData({
            userInfo: getApp().globalData.userInfo,
            routeTemplateId,
            routeInvitationId,
            canvasVwPx: getCanvasVwPx(windowInfo.windowWidth),
        });
        const openerEventChannel = this.getOpenerEventChannel();
        if (openerEventChannel && typeof (openerEventChannel as any).on === "function") {
            openerEventChannel.on('dataFromShow', ({ template }) => {
                (this as any)._routePayloadReceived = true;
                this.bindRouteTemplate(template);
            });
            openerEventChannel.on('dataFromMine', ({ invitation }) => {
                (this as any)._routePayloadReceived = true;
                this.bindRouteInvitation(invitation);
            });
        }
        const initFont = () => {
            const app = getApp(), list = app.globalData.fonts.map((font: TFont) => {
                return {
                    name: font.name,
                    key: font.fontKey
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
        (this as any)._unsubscribeFonts = getApp().setProxy('fonts', {
            set: (_target: Record<string, any>, _key: PropertyKey, _value: TFont[], _receiver: any) => {
                initFont()
            }
        });
        initFont();
        (this as any)._routeFallbackTimer = setTimeout(() => {
            if (!(this as any)._routePayloadReceived && !this.data.template.id) {
                this.hydrateEditorFromQuery();
            }
        }, 50);
    },
    onResize(size: any) {
        const windowWidth = Number(size && size.size && size.size.windowWidth);
        if (!windowWidth) return;
        this.syncCanvasDisplayStyles(getCanvasVwPx(windowWidth));
    },
    bindRouteTemplate(template: TTemplate) {
        if (!template || !template.id) return;
        const formatTemplate = {
            ...template,
            _templateData: parseTemplateData(template.templateData),
        };
        this.bindTemplateData(formatTemplate);
        if (template.backgroundMusic) this._playMusic(template.backgroundMusic);
    },
    bindRouteInvitation(invitation: TInvitation) {
        if (!invitation || !invitation.id) return;
        (this as any)._originCustomData = invitation.customData;
        (this as any)._originBgMusic = invitation.backgroundMusic || "";
        const infos = getApp().globalData.template.infos;
        const cachedTemplate = infos.find((info: TTemplate) => info.id === invitation.templateId);
        const bindInvitationTemplate = (template: TTemplate) => {
            const formatTemplate = {
                ...template,
                _templateData: parseTemplateData(invitation.customData),
            };
            this.setData({ invitation }, () => {
                this.bindTemplateData(formatTemplate, invitation);
            });
        };
        if (cachedTemplate) {
            bindInvitationTemplate(cachedTemplate);
        } else {
            selectTemplateInfo(invitation.templateId).then(bindInvitationTemplate).catch(() => {
                this.setData({
                    editorState: "error",
                    editorError: "原模板暂时无法加载，请稍后重试。",
                });
            });
        }
        if (invitation.backgroundMusic) this._playMusic(invitation.backgroundMusic);
    },
    hydrateEditorFromQuery() {
        const { routeTemplateId, routeInvitationId } = this.data;
        this.setData({ editorState: "loading", editorError: "" });
        if (routeInvitationId) {
            restoreUserSession().then(() => {
                return selectInvitationInfo(routeInvitationId).then((invitation) => {
                    this.bindRouteInvitation(invitation);
                });
            }).catch(() => {
                this.setData({
                    editorState: "error",
                    editorError: "邀请函草稿加载失败，请稍后重试。",
                });
            });
            return;
        }
        if (routeTemplateId) {
            restoreUserSession().then(() => {
                return selectTemplateInfo(routeTemplateId).then((template) => {
                    this.bindRouteTemplate(template);
                });
            }).catch(() => {
                this.setData({
                    editorState: "error",
                    editorError: "模板加载失败，请稍后重试。",
                });
            });
            return;
        }
        this.setData({
            editorState: "error",
            editorError: "缺少模板信息，请返回模板页重新选择。",
        });
    },
    tapRetryEditor() {
        this.hydrateEditorFromQuery();
    },
    tapBack() {
        const pages = getCurrentPages();
        if (pages.length > 1) {
            wx.navigateBack();
            return;
        }
        wx.switchTab({ url: "/pages/index/index" });
    },
    //填充Invitation和templateData数据
    bindTemplateData(template: TTemplate, fromInvitation: TInvitation | undefined = undefined) {
        let invitation = this.data.invitation;
        try {
            invitation.templateId = template.id;
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
                data.style = style;
                data.displayStyle = toCanvasDisplayStyle(style, this.data.canvasVwPx);
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
        } catch (_) {
            this.setData({
                editorState: "error",
                editorError: "模板内容格式异常，请返回后重新选择模板。",
            });
            return;
        }
        if (fromInvitation === undefined) {
            const _invitation = wx.getStorageSync('invitation');
            invitation = { ...invitation, ..._invitation };
            if (invitation.backgroundMusic) {
                //需要单开接口查询
            }
        }
        if (!invitation.title && invitation.eventName) invitation.title = invitation.eventName;
        if (!invitation.hostName) {
            const userInfo = this.data.userInfo;
            invitation.hostName = userInfo.nickName || userInfo.realName || "";
        }
        if (!invitation.maxGuests) invitation.maxGuests = 1;
        this.setData({
            invitation: { ...invitation },
            template: { ...template },
            selectedElement: !1,
            selectedElementLabel: "",
            selectedElementType: "text",
            quickField: "eventDate",
            quickFieldIndex: 1,
            quickFieldLabel: "活动日期",
            editorModule: "content",
            popElement: { element: {} as TTemplateData, index: -1 },
            isDirty: !1,
            editorState: "ready",
            editorError: "",
        }, () => {
            this.toForm();
            this.markSaved();
        });
    },
    syncCanvasDisplayStyles(nextCanvasVwPx?: number) {
        const canvasVwPx = nextCanvasVwPx || this.data.canvasVwPx;
        const _templateData = (this.data.template._templateData || []).map(data => ({
            ...data,
            displayStyle: toCanvasDisplayStyle(data.style, canvasVwPx),
        }));
        const selectedIndex = this.data.popElement.index;
        this.setData({
            canvasVwPx,
            template: { ...this.data.template, _templateData },
            ...(selectedIndex >= 0 && _templateData[selectedIndex] ? {
                popElement: { element: _templateData[selectedIndex], index: selectedIndex },
            } : {}),
        });
    },
    //日期选择器回调
    onDateChange(e: any) {
        const eventDate = e.detail.value,
            lunarDate = (new Date(eventDate) as any).lunarDate("yy年cNcD");
        const invitation = this.getInvitationWithEventContent({
            ...this.data.invitation,
            eventDate,
            lunarDate,
        });
        this.setData({
            invitation,
            template: this.getTemplateWithInvitation(invitation),
            isDirty: !0,
        }, () => this.markDirty());
    },
    //时间选择器回调
    onTimeChange(e: any) {
        const eventTime = e.detail.value;
        const invitation = this.getInvitationWithEventContent({
            ...this.data.invitation,
            eventTime,
        });
        this.setData({
            invitation,
            template: this.getTemplateWithInvitation(invitation),
            isDirty: !0,
        }, () => this.markDirty());
    },
    //input和textarea的回调
    onInput(e: any) {
        const name = e.detail.value, index = this.data.popElement.index;
        const _templateData = this.data.template._templateData.map(item => ({ ...item }));
        if (index < 0 || !_templateData[index]) return;
        _templateData[index].name = name;
        const key = _templateData[index].key;
        const invitation: TInvitation = { ...this.data.invitation };
        if (key) invitation[key] = name;
        if (key === "eventName" || key === "title") {
            invitation.title = name;
            invitation.eventName = name;
        }
        if (key === "_eventContent") invitation.__eventContent = name;
        this.setData({
            invitation,
            popElement: { ...this.data.popElement, element: { ...this.data.popElement.element, name } },
            template: { ...this.data.template, _templateData, },
            isDirty: !0,
        }, () => this.markDirty())
    },
    //invitation编辑事件
    bindContentChange(e: any) {
        const { key } = e.currentTarget.dataset, value = e.detail.value;
        const invitation: TInvitation = {
            ...this.data.invitation,
            [key]: value,
        };
        if (key === "title") invitation.eventName = value;
        if (key === "_eventContent") invitation.__eventContent = value;
        const nextInvitation = key === "eventAddress"
            ? this.getInvitationWithEventContent(invitation)
            : invitation;
        this.setData({
            invitation: nextInvitation,
            template: this.getTemplateWithInvitation(nextInvitation),
            isDirty: !0,
        }, () => this.markDirty());
    },
    //invitation可选事件
    bindOptionChange(e: any) {
        const { key } = e.currentTarget.dataset, syn = e.detail.value;
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
            },
            isDirty: !0,
        }, () => this.markDirty())
    },
    //templateData数据变化（font-family、text-align)
    bindTemplateDataIndexChange(e: any) {
        type TheObjectKeys = ObjectKeys<typeof this.data.editTemplateData>;
        const detail = e.detail || {},
            dataset = e.currentTarget.dataset || {},
            index = detail.value !== undefined ? Number(detail.value) : Number(dataset.index),
            index_element = this.data.popElement.index,
            key = dataset.key,
            dataKey: TheObjectKeys = key.replace(/-(.*)$/, function (_: never, p1: string) {
                return p1.charAt(0).toUpperCase() + p1.slice(1);
            });
        const _templateData = this.data.template._templateData;
        const selected = this.data.editTemplateData[dataKey].list[index];
        if (!selected || !_templateData[index_element]) return;
        _templateData[index_element].style = updateStyleValue(
            _templateData[index_element].style,
            key,
            selected.key,
        );
        _templateData[index_element].displayStyle = toCanvasDisplayStyle(
            _templateData[index_element].style,
            this.data.canvasVwPx,
        );
        this.setData({
            editTemplateData: {
                ...this.data.editTemplateData,
                [dataKey]: { ...this.data.editTemplateData[dataKey], select: index },
            },
            template: { ...this.data.template, _templateData },
            isDirty: !0,
        }, () => this.markDirty());
    },
    //templateData数据变化（font-size、letter-spacing、line-height、color）
    bindTemplateDataChange(e: any) {
        type TheBasicKeys = BasicKeys<typeof this.data.editTemplateData>;
        const detail = e.detail || {},
            colorData = detail.colorData && detail.colorData.pickerData,
            dataset = e.currentTarget.dataset || {},
            rawValue = detail.value !== undefined
                ? detail.value
                : colorData && colorData.hex || dataset.value,
            key = dataset.key,
            px = !!dataset.px,
            index_element = this.data.popElement.index,
            dataKey: TheBasicKeys = key.replace(/-(.*)$/, function (_: never, p1: string) {
                return p1.charAt(0).toUpperCase() + p1.slice(1);
            });
        const _templateData = this.data.template._templateData;
        if (!_templateData[index_element] || rawValue === undefined || rawValue === null) return;
        const value = key === "color" ? toEditorColor(rawValue) : toEditorNumber(rawValue, 0);
        const unit = key === "color" ? "" : px ? "vw" : "rem";
        _templateData[index_element].style = updateStyleValue(
            _templateData[index_element].style,
            key,
            `${value}${unit}`,
        );
        _templateData[index_element].displayStyle = toCanvasDisplayStyle(
            _templateData[index_element].style,
            this.data.canvasVwPx,
        );
        this.setData({
            editTemplateData: {
                ...this.data.editTemplateData,
                [dataKey]: value,
            },
            template: { ...this.data.template, _templateData },
            isDirty: !0,
        }, () => this.markDirty());
    },
    //attr切换
    tapAttrChange(e: any) {
        const { index: select } = e.currentTarget.dataset;
        this.setData({ attrs: { ...this.data.attrs, select } })
    },
    toggleCustomColor() {
        this.setData({ customColorOpen: !this.data.customColorOpen });
    },
    //templateData元素点击打开编辑窗口
    tapEditElement(e: any) {
        const { element, index } = e.currentTarget.dataset;
        const elementIndex = Number(index);
        this.setData({
            popElement: { element, index: elementIndex },
            selectedElement: !0,
            selectedElementLabel: getElementLabel(element, elementIndex),
            selectedElementType: element.type,
            quickField: "element",
            editorModule: element.type === "image" ? "image" : "style",
            customColorOpen: !1,
        }, () => {
            this.toAttr(element);
        })
    },
    //绑定templateData的单个元素内容到编辑内容
    toAttr(element: TTemplateData) {
        const { editTemplateData } = this.data;
        switch (element.type) {
            case 'image':
                break;
            case 'text':
            case 'textarea':
                const familyMatch = /font-family:([^;]+)/.exec(element.style),
                    alignMatch = /text-align:([^;]+)(?:;|$)/.exec(element.style),
                    fontSizeMatch = /font-size:([^;]+)vw(?:;|$)/.exec(element.style),
                    letterSpacingMatch = /letter-spacing:([^;]+)vw(?:;|$)/.exec(element.style),
                    lineHeightMatch = /line-height:([^;]+)rem(?:;|$)/.exec(element.style),
                    colorMatch = /color:(\S*?)(?:;|$)/.exec(element.style),
                    familyValue = familyMatch ? familyMatch[1] : "",
                    alignValue = alignMatch ? alignMatch[1] : "center",
                    indexFamily = editTemplateData.fontFamily.list.findIndex(font => font.key === familyValue),
                    indexTextAlign = editTemplateData.textAlign.list.findIndex(font => font.key === alignValue);
                const data: typeof editTemplateData = {
                    fontFamily: {
                        ...editTemplateData.fontFamily,
                        select: indexFamily < 0 ? 0 : indexFamily,
                    },
                    fontSize: toEditorNumber(fontSizeMatch && fontSizeMatch[1], 4),
                    letterSpacing: toEditorNumber(letterSpacingMatch && letterSpacingMatch[1], 0),
                    lineHeight: toEditorNumber(lineHeightMatch && lineHeightMatch[1], 1.5),
                    textAlign: {
                        ...editTemplateData.textAlign,
                        select: indexTextAlign < 0 ? 0 : indexTextAlign,
                    },
                    color: colorMatch ? toEditorColor(colorMatch[1]) : "#20211E",
                };
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
    getTemplateWithInvitation(invitation: TInvitation, forceEmpty = false) {
        const { showLunar } = this.data,
            _templateData = (this.data.template._templateData || []).map(data => ({ ...data }));
        const eventNameIndex = _templateData.findIndex(data => data.key === 'eventName'),
            titleIndex = eventNameIndex >= 0 ? eventNameIndex : _templateData.findIndex(data => data.key === 'title'),
            hostNameIndex = _templateData.findIndex(data => data.key === 'hostName'),
            eventAddressIndex = _templateData.findIndex(data => data.key === 'eventAddress'),
            eventDateIndex = _templateData.findIndex(data => data.key === 'eventDate'),
            eventTimeIndex = _templateData.findIndex(data => data.key === 'eventTime'),
            _eventContentIndex = _templateData.findIndex(data => data.key === '_eventContent' || (data.type === 'text' && !data.key));
        const replace = (index: number, visible: any, value: string) => {
            if (index < 0 || (!forceEmpty && (visible === false || visible === 0))) return;
            _templateData[index].name = value || "";
        };
        const titleKey = titleIndex >= 0 && _templateData[titleIndex].key || 'eventName';
        replace(titleIndex, invitation[`${titleKey}_`], invitation.title || invitation.eventName);
        replace(hostNameIndex, invitation.hostName_, invitation.hostName);
        replace(eventAddressIndex, invitation.eventAddress_, invitation.eventAddress);
        replace(_eventContentIndex, invitation._eventContent_, invitation._eventContent || "");
        replace(
            eventDateIndex,
            invitation.eventDate_,
            invitation.eventDate ? `${invitation.eventDate}${showLunar && invitation.lunarDate ? '(' + invitation.lunarDate + ')' : ''}` : "",
        );
        replace(eventTimeIndex, invitation.eventTime_, invitation.eventTime || "");
        return { ...this.data.template, _templateData };
    },
    //绑定form的表单数据到templateData中
    toForm(forceEmpty = false) {
        this.setData({ template: this.getTemplateWithInvitation(this.data.invitation, forceEmpty) })
    },
    getInvitationWithEventContent(invitation: TInvitation) {
        const { _eventContent, __eventContent } = invitation;
        const source = __eventContent || _eventContent || "";
        if (!source) return invitation;
        return {
            ...invitation,
            _eventContent: source
                .replace(/\[日期：.*\]/i, invitation.eventDate && new Date(invitation.eventDate).Format('yyyy年MM月dd号') || "[日期]")
                .replace(/\[时间：.*\]/i, invitation.eventTime || "[时间]")
                .replace(/\[农历：.*\]/i, invitation.lunarDate || "[农历]")
                .replace(/\[地点：.*\]/i, invitation.eventAddress || "[地点]"),
        };
    },
    //快速选择改变时应用到邀请词
    toEventContent() {
        const invitation = this.getInvitationWithEventContent(this.data.invitation);
        this.setData({
            invitation,
            template: this.getTemplateWithInvitation(invitation),
        })
    },
    tapLunar() {
        const showLunar = !this.data.showLunar;
        this.setData({ showLunar, isDirty: !0 }, () => {
            this.setData({ template: this.getTemplateWithInvitation(this.data.invitation) });
            this.markDirty();
        });
    },
    onLunarChange(e: WechatMiniprogram.SwitchChange) {
        this.setData({ showLunar: !!e.detail.value, isDirty: !0 }, () => {
            this.setData({ template: this.getTemplateWithInvitation(this.data.invitation) });
            this.markDirty();
        });
    },
    bindGuestCount(e: WechatMiniprogram.SliderChange) {
        this.setData({
            invitation: {
                ...this.data.invitation,
                maxGuests: Number(e.detail.value) || 1,
            },
            isDirty: !0,
        }, () => this.markDirty());
    },
    tapShowEdit() {
        this.setData({ formTab: "permission" }, () => {
            const component = this.selectComponent("#the-edit");
            if (component) component.onTapOpenComment();
        });
    },
    tapHideEdit() {
        const component = this.selectComponent("#the-edit");
        if (component) component.onTapCloseComment();
    },
    tapFormTab(e: WechatMiniprogram.TouchEvent) {
        const formTab = e.currentTarget.dataset.tab === "permission" ? "permission" : "content";
        this.setData({ formTab });
    },
    tapSelectedElement() {
        if (!this.data.selectedElement || this.data.popElement.index < 0) {
            wx.showToast({ title: "请先点选画布中的文字或图片", icon: "none" });
            return;
        }
        this.setData({
            quickField: "element",
            editorModule: this.data.selectedElementType === "image" ? "image" : "style",
        });
    },
    tapEditorModule(e: WechatMiniprogram.TouchEvent) {
        const module = e.currentTarget.dataset.module as TEditorModule;
        if (!["content", "style", "image", "music", "settings"].includes(module)) return;
        if (module === "content") {
            const elementKey = this.data.popElement.element && this.data.popElement.element.key || "";
            const quickField = elementContentFields[elementKey]
                || (this.data.quickField === "element" ? "eventDate" : this.data.quickField);
            this.selectContentField(quickField as Exclude<TQuickField, "element">);
            return;
        }
        this.setData({ editorModule: module });
    },
    onContentFieldChange(e: any) {
        const index = Number(e.detail.value);
        const field = contentFields[index];
        if (!field) return;
        this.setData({
            quickField: field.value,
            quickFieldIndex: index,
            quickFieldLabel: field.label,
            editorModule: "content",
        });
    },
    selectContentField(quickField: Exclude<TQuickField, "element">) {
        const index = contentFields.findIndex(field => field.value === quickField);
        const field = contentFields[index < 0 ? 0 : index];
        this.setData({
            quickField: field.value,
            quickFieldIndex: index < 0 ? 0 : index,
            quickFieldLabel: field.label,
            editorModule: "content",
        });
    },
    tapQuickField(e: WechatMiniprogram.TouchEvent) {
        const quickField = e.currentTarget.dataset.field;
        if (quickField === "element" && !this.data.selectedElement) return;
        if (quickField === "element") {
            this.tapSelectedElement();
            return;
        }
        this.selectContentField(quickField);
    },
    layoutClose() {
        this.setData({ popFocus: !1, titleFocus: !1 });
    },
    markDirty() {
        if (!this.data.isDirty) this.setData({ isDirty: !0 });
        const enableAlertBeforeUnload = (wx as any).enableAlertBeforeUnload;
        if (typeof enableAlertBeforeUnload === "function") {
            enableAlertBeforeUnload({ message: "当前修改尚未保存，确定离开吗？" });
        }
    },
    disableLeaveAlert() {
        const disableAlertBeforeUnload = (wx as any).disableAlertBeforeUnload;
        if (typeof disableAlertBeforeUnload === "function") disableAlertBeforeUnload();
    },
    markSaved() {
        this.disableLeaveAlert();
        if (this.data.isDirty) this.setData({ isDirty: !1 });
    },
    tapLocation() {
        const { longitude, latitude } = this.data.invitation;
        wx.chooseLocation({
            longitude: +longitude,
            latitude: +latitude,
            success: (res) => {
                const invitation = this.getInvitationWithEventContent({
                    ...this.data.invitation,
                    longitude: +res.longitude,
                    latitude: +res.latitude,
                    eventAddress: res.name,
                });
                this.setData({
                    invitation,
                    template: this.getTemplateWithInvitation(invitation),
                    isDirty: !0,
                }, () => this.markDirty())
            },
        })
    },
    tapQuickImage() {
        const imageIndex = this.data.template._templateData.findIndex(data => data.type === "image");
        if (imageIndex < 0) {
            wx.showToast({ title: "当前模板没有可替换图片", icon: "none" });
            return;
        }
        const element = this.data.template._templateData[imageIndex];
        this.setData({
            popElement: { element, index: imageIndex },
            selectedElement: !0,
            selectedElementLabel: getElementLabel(element, imageIndex),
            selectedElementType: "image",
            quickField: "element",
            editorModule: "image",
        }, () => this.openMaterial("image"));
    },
    tapMaterial(e: any) {
        const { select } = e.currentTarget.dataset;
        if (select === "image") {
            const selected = this.data.popElement.element;
            if (!this.data.selectedElement || !selected || selected.type !== "image") {
                this.tapQuickImage();
                return;
            }
        }
        this.openMaterial(select);
    },
    openMaterial(select: "image" | "music") {
        this.setData({ materialSelect: select }, () => {
            const component = this.selectComponent("#the-material");
            if (component) component.onTap();
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
            this.setData({ isDirty: !0 }, () => this.markDirty());
            wx.showToast({ title: '内容已替换到画布', icon: 'success', duration: 900 })
        }).catch(() => {
            wx.showToast({ title: '保存失败', icon: 'error', duration: 500 })
        })
    },
    tapTempRemove() {
        wx.showModal({
            title: "清空邀请内容",
            content: "将清空主题、日期、时间、地点、邀请词和邀请人，模板样式不会改变。",
            confirmText: "确认清空",
            confirmColor: "#B53B2E",
            success: (res) => {
                if (!res.confirm) return;
                const invitation: TInvitation = {
                    ...this.data.invitation,
                    title: "",
                    eventName: "",
                    eventDate: "",
                    lunarDate: "",
                    eventTime: "",
                    eventAddress: "",
                    longitude: 0,
                    latitude: 0,
                    _eventContent: "",
                    __eventContent: "",
                    hostName: "",
                };
                wx.removeStorage({ key: 'invitation' });
                this.setData({ invitation, showLunar: !1, isDirty: !0 }, () => {
                    this.toForm(!0);
                    this.markDirty();
                    wx.showToast({ title: '内容已清空', icon: 'success' });
                });
            },
        });
    },
    triggerMaterial(e: WechatMiniprogram.CustomEvent) {
        const { material } = e.detail, { invitation } = this.data;
        switch (material.category) {
            case "font": break;
            case "music":
                this.setData({
                    material,
                    invitation: { ...invitation, backgroundMusic: material.url },
                    isDirty: !0,
                }, () => this.markDirty())
                let _audioContext = (this as any)._audioContext;
                if (_audioContext) _audioContext.destroy();
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
                const name = _CDN + e.detail.material.url, index = this.data.popElement.index;
                const _templateData = this.data.template._templateData;
                if (index < 0 || !_templateData[index] || _templateData[index].type !== "image") {
                    wx.showToast({ title: "未找到可替换图片", icon: "none" });
                    return;
                }
                _templateData[index].name = name;
                this.setData({
                    popElement: { ...this.data.popElement, element: { ...this.data.popElement.element, name } },
                    template: { ...this.data.template, _templateData, },
                    isDirty: !0,
                }, () => this.markDirty())
                break;
            case "video": break;
            case "other": break;
        }
        const component = this.selectComponent("#the-material");
        if (component) component.onClose();
    },
    tapCancelMusic() {
        let _audioContext = (this as any)._audioContext;
        const { invitation } = this.data;
        _audioContext && _audioContext.destroy();
        (this as any)._audioContext = null;
        this.setData({
            play: !1,
            invitation: { ...invitation, backgroundMusic: "" },
            isDirty: !0,
        }, () => this.markDirty())
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
        return encodeTemplateData(template);
    },
    completeSave(savedInvitation: TInvitation, customData: string, bgMusic: string, actionName: string, shouldLeave: boolean) {
        (this as any)._originCustomData = customData;
        (this as any)._originBgMusic = bgMusic;
        this.setData({
            invitation: { ...this.data.invitation, ...savedInvitation },
            isSaving: !1,
            editMode: !0,
        }, () => this.markSaved());
        wx.showToast({ title: `${actionName}成功`, icon: "success", duration: 1000 });
        if (shouldLeave) {
            this.release();
            setTimeout(() => wx.navigateBack(), 900);
        }
    },
    failSave(title = "保存失败！") {
        wx.hideLoading();
        this.setData({ isSaving: !1, editMode: !0 });
        wx.showToast({ title, icon: "error" });
    },
    tapSave(e: WechatMiniprogram.TouchEvent) {
        if (this.data.isSaving) return;
        const { invitation, template } = this.data;
        const category = getApp().globalData.category;
        const requestedStatus = Number(e.currentTarget.dataset.status || 0);
        const status = requestedStatus === 1
            ? 1
            : invitation.id && invitation.status === 1 ? 1 : 0;
        const actionName = requestedStatus === 1 ? "发布" : status === 1 ? "修改保存" : "草稿保存";
        const shouldLeave = requestedStatus === 1;
        if (status === 1 && (!invitation.title || !invitation.eventAddress || !invitation.eventDate)) {
            const quickField = !invitation.title ? "title" : !invitation.eventDate ? "eventDate" : "eventAddress";
            this.selectContentField(quickField);
            wx.showToast({ title: `请完善${quickField === 'title' ? '主题' : quickField === 'eventDate' ? '日期' : '地点'}`, icon: "none" })
            return;
        }
        const EInvitation: any = {
            ...invitation,
            status,
            title: invitation.title || "未命名邀请函",
            eventName: invitation.eventName || invitation.title || "未命名邀请函",
            customData: this.generateData(template),
            // coverImage: template.thumbnail,
            // eventAddress: `${invitation._eventAddress || ""}$$${invitation._address || ""}`,
            // eventAddress: invitation._eventAddress,
            eventDate: invitation.eventDate
                ? (new Date(invitation.eventDate) as any).Format("yyyy/MM/dd hh:mm:ss")
                : "",
            eventType: (() => {
                const matchedCategory = category.find((cate: TTemplateCategory) => cate.id === template.parentCategoryId);
                return matchedCategory ? matchedCategory.name : invitation.eventType;
            })(),
            publishTime: status === 1
                ? invitation.publishTime || new Date().Format("yyyy/MM/dd hh:mm:ss")
                : invitation.publishTime || "",
        };
        // return;
        const originCustomData = (this as any)._originCustomData;
        const originBgMusic = (this as any)._originBgMusic;
        const customData = EInvitation.customData;
        const bgMusic = EInvitation.backgroundMusic || "";
        const unchanged = originCustomData != null
            && originCustomData === customData
            && originBgMusic === bgMusic;
        this.setData({ isSaving: !0 });
        if (unchanged) {
            wx.showLoading({ title: "保存中..." });
            createInvitation(EInvitation).then(savedInvitation => {
                wx.hideLoading();
                this.completeSave(savedInvitation, customData, bgMusic, actionName, shouldLeave);
            }).catch(() => this.failSave());
            return;
        }
        wx.showLoading({ title: "制作中..." });
        this.setData({ editMode: !1 }, () => {
            wx.nextTick(() => {
                this.createSelectorQuery()
                    .select(`#snapshot`)
                    .node()
                    .exec(res => {
                        const node = res[0] && res[0].node;
                        if (!node) {
                            wx.hideLoading();
                            wx.showToast({ title: '封面节点不可用', icon: 'none' });
                            this.setData({ editMode: !0, isSaving: !1 });
                            return;
                        }
                        node.takeSnapshot({
                            type: 'arraybuffer',
                            format: 'png',
                            success: (res: any) => {
                                const dt = new Date().getTime();
                                const tempPath = `${wx.env.USER_DATA_PATH}/${dt}.png`
                                const fs = wx.getFileSystemManager();
                                try {
                                    fs.writeFileSync(tempPath, res.data, 'binary')
                                    // return;
                                    wx.showLoading({ title: "封面生成中..." });
                                    uploadImage({ tempPath, suffix: "png" }).then((r: any) => {
                                        EInvitation.coverImage = r.url;
                                        createInvitation(EInvitation).then(savedInvitation => {
                                            wx.hideLoading();
                                            this.completeSave(savedInvitation, customData, bgMusic, actionName, shouldLeave);
                                        }).catch(() => this.failSave()).finally(() => {
                                            try { fs.unlinkSync(tempPath); } catch (_) { }
                                        });
                                    }).catch(() => {
                                        this.failSave("封面上传失败！");
                                        try { fs.unlinkSync(tempPath); } catch (_) { }
                                    })
                                } catch (_) {
                                    wx.hideLoading();
                                    wx.showModal({
                                        title: '失败！',
                                        content: '缓存已满，请清空缓存重试',
                                    });
                                    this.setData({ editMode: !0, isSaving: !1 })
                                }
                            },
                            fail: () => {
                                wx.hideLoading();
                                wx.showToast({ title: '封面生成失败！', duration: 1500, icon: 'error' })
                                this.setData({ editMode: !0, isSaving: !1 })
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
