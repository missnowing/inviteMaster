Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    title: {
      type: String,
      value: '',
    },
    background: {
      type: String,
      value: '',
    },
    color: {
      type: String,
      value: '',
    },
    back: {
      type: Boolean,
      value: false,
    },
    loading: {
      type: Boolean,
      value: false,
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1,
    },
    sideWidth: {
      type: Number,
      value: 0,
    },
    //  左部和右面statusBar一样宽度的占位空间
    leftPart: {
      type: Boolean,
      value: false,
    },
  },

  attached() {
    const isSupport = !!wx.getMenuButtonBoundingClientRect;
    const rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    wx.getSystemInfo({
      success: (res) => {
        console.log(res);
        const ios = !!(res.system.toLowerCase().search('ios') + 1);
        const sideWidth = isSupport ? res.windowWidth - rect.left : 0;
        this.setData({
          rect,
          ios,
          sideWidth: this.data.sideWidth || sideWidth,
          statusBarHeight: res.statusBarHeight,
        });
        getApp().globalData.menu = {
          rect,
          ios,
          sideWidth: this.data.sideWidth || sideWidth,
          statusBarHeight: res.statusBarHeight,
        };
        this.triggerEvent('bindMenu', {
          rect,
          ios,
          sideWidth: this.data.sideWidth || sideWidth,
          statusBarHeight: res.statusBarHeight,
        });
      },
    });
  },
  /**
   * 组件的方法列表
   */
  methods: {
    back() {
      const { data } = this;
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta,
        });
      }
      this.triggerEvent('back', { delta: data.delta }, {});
    },
  },
});
