import type { TTemplate, TTemplateData } from "../../../store/template";

export type TemplateDecodeResult = {
    list: TTemplateData[],
    valid: boolean,
};

const elementLabelMap: Record<string, string> = {
    eventName: "活动主题",
    title: "活动主题",
    eventDate: "活动日期",
    eventTime: "活动时间",
    eventAddress: "活动地点",
    hostName: "邀请人",
    _eventContent: "邀请词",
};

export const decodeTemplateData = (raw: string): TemplateDecodeResult => {
    try {
        const value = JSON.parse(raw || "[]");
        return {
            list: Array.isArray(value) ? value : [],
            valid: Array.isArray(value),
        };
    } catch (_) {
        return { list: [], valid: false };
    }
};

export const updateStyleValue = (style: string, key: string, value: string) => {
    const styles = style.split(";").filter(Boolean);
    const index = styles.findIndex((item) => item.split(":")[0] === key);
    if (index >= 0) styles.splice(index, 1, `${key}:${value}`);
    else styles.push(`${key}:${value}`);
    return styles.join(";");
};

export const toCanvasDisplayStyle = (style: string, canvasVwPx: number) => {
    const unit = Number.isFinite(canvasVwPx) && canvasVwPx > 0 ? canvasVwPx : 1;
    return String(style || "").replace(/(-?\d+(?:\.\d+)?)vw/g, (_match, value) => {
        return `${Number(value) * unit}px`;
    });
};

export const getElementLabel = (element: TTemplateData, index: number) => {
    if (element.type === "image") return `个性图片 ${index + 1}`;
    if (element.key && elementLabelMap[element.key]) return elementLabelMap[element.key];
    return `自定义文字 ${index + 1}`;
};

export const encodeTemplateData = (template: TTemplate) => {
    const templateData = template._templateData.map((data) => {
        const { displayStyle: _displayStyle, ...serializableData } = data;
        const style: Record<string, string | number> = {};
        String(data.style || "").split(";").forEach((entry) => {
            if (!entry) return;
            const separator = entry.indexOf(":");
            if (separator < 1) return;
            const key = entry.slice(0, separator);
            const value = entry.slice(separator + 1);
            if (!key || value === "") return;
            style[key] = value.includes("vw")
                ? Number(value.replace("vw", "")) / 100
                : value;
        });
        return { ...serializableData, style };
    });
    return JSON.stringify(templateData);
};
