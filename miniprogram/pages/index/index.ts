import { TFont, restoreUserSession, selectFonts } from "../../store/global";
import {
  TTemplate,
  TTemplateCategory,
  selectTemplate,
  selectTemplateCategory,
} from "../../store/template";

const visibleItems = <T extends { status: number }>(items: T[]) =>
  items.filter((item) => item.status !== 0);

type TTemplateRow = {
  id: string,
  items: TTemplate[],
};

const templateRows = (items: TTemplate[]) => {
  const rows: TTemplateRow[] = [];
  for (let index = 0; index < items.length; index += 2) {
    const rowItems = items.slice(index, index + 2);
    rows.push({
      id: rowItems.map((item) => item.id).join("-"),
      items: rowItems,
    });
  }
  return rows;
};

Page({
  data: {
    style: {
      fontsize: getApp().globalData.style.rem,
    },
    types: [] as TTemplateCategory[],
    templates: [] as TTemplate[],
    newTemplateRows: [] as TTemplateRow[],
    selectedParentCategoryId: 0,
    inputKeyword: "",
    keyword: "",
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true,
  },

  onLoad() {
    restoreUserSession().then(() => {
      return Promise.all([
        selectTemplateCategory(),
        this.loadFonts(),
      ]);
    }).then(([categoryResult]) => {
      const categoryList = categoryResult.list as TTemplateCategory[];
      const types = visibleItems(categoryList).filter((item) => item.parentId === 0);
      this.setData({ types });
      return this.loadTemplates(true);
    }).catch(() => {
      wx.showToast({ title: "模板加载失败，请稍后重试", icon: "none" });
    });
  },

  loadFonts() {
    return selectFonts().then((fonts) => {
      const fontList = fonts.list || [];
      const loadNextFont = (index: number) => {
        const font: TFont | undefined = fontList[index];
        if (!font) return;
        wx.loadFontFace({
          family: font.fontKey,
          source: `url("${font.url}")`,
          complete: () => loadNextFont(index + 1),
        });
      };
      loadNextFont(0);
    });
  },

  loadTemplates(reset = false) {
    if (this.data.loading || (!reset && !this.data.hasMore)) {
      return Promise.resolve();
    }
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true });
    return selectTemplate({
      parentCategoryId: this.data.selectedParentCategoryId,
      name: this.data.keyword,
      page,
      pageSize: this.data.pageSize,
    }).then((result) => {
      const list = reset ? result.list : this.data.templates.concat(result.list);
      const unique = list.filter((template, index, all) =>
        all.findIndex((item) => item.id === template.id) === index
      );
      this.setData({
        templates: unique,
        newTemplateRows: templateRows(unique.slice(1)),
        total: result.total,
        page,
        hasMore: unique.length < result.total && result.list.length > 0,
      });
    }).catch(() => {
      wx.showToast({ title: "模板加载失败", icon: "none" });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  inputSearch(e: WechatMiniprogram.Input) {
    this.setData({ inputKeyword: e.detail.value });
  },

  confirmSearch() {
    this.setData({ keyword: this.data.inputKeyword.trim() });
    this.loadTemplates(true);
  },

  clearSearch() {
    this.setData({ inputKeyword: "", keyword: "" });
    this.loadTemplates(true);
  },

  tapMenu(e: WechatMiniprogram.TouchEvent) {
    const parentCategoryId = Number(e.currentTarget.dataset.id || 0);
    this.setData({ selectedParentCategoryId: parentCategoryId });
    this.loadTemplates(true);
  },

  loadMore() {
    this.loadTemplates(false);
  },

  tapSelect(e: WechatMiniprogram.TouchEvent) {
    const template = e.currentTarget.dataset.item as TTemplate;
    if (!template) return;
    wx.navigateTo({
      url: `../show/show?templateId=${template.id}&se=se-${template.id}`,
      routeType: "wx://zoom",
      success(res) {
        res.eventChannel.emit("dataFromIndex", { template });
      },
    });
  },
});
