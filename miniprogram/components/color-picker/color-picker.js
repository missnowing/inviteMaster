Component({
  properties: {
    //单位rpx实际像素
    rpxRatio: {
      type: Number,
      value: 1
    },
    colorData: {
      type: Object,
      value: {}
    },
    value: {
      type: String,
      value: '#000000',
      observer(value) {
        if (this._colorPickerAttached) this._setColorValue(value)
      }
    }
  },
  data: {
    //基础色相(色盘右上顶点的颜色)
    hueData: {
      colorStopRed: 255,
      colorStopGreen: 0,
      colorStopBlue: 0
    },
    //选择点的颜色
    pickerData: {
      x: 120,
      y: 120,
      red: 0,
      green: 0,
      blue: 0,
      hex: '#000000'
    },
    //色相控制条位置
    barY: 0,
    top: 0, //组件的位置
    left: 0,
    scrollTop: 0, //滚动位置
    scrollLeft: 0,
    timer: 0,
  },
  lifetimes: {
    attached() {
      this._colorPickerAttached = true
      this._setColorValue(this.data.value)
      // this.setData({
      //   hueData: this.data.colorData.hueData,
      //   pickerData: this.data.colorData.pickerData,
      //   barY: this.data.colorData.barY
      // })
    },
    detached() {
      this._colorPickerAttached = false
    },
    ready() {
      const query = this.createSelectorQuery();
      query.select('.wrapper').boundingClientRect();
      query.selectViewport().scrollOffset()
      query.exec(res => {
        console.log(res);
        this.setData({
          top: res[0].top,
          left: res[0].left,
          scrollTop: res[1].scrollTop,
          scrollLeft: res[1].scrollLeft
        })
      });
    }
  },
  methods: {
    _setColorValue(value) {
      const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value || '')
      if (!match) return
      const raw = match[1].length === 3
        ? match[1].split('').map(char => char + char).join('')
        : match[1]
      const red = parseInt(raw.slice(0, 2), 16)
      const green = parseInt(raw.slice(2, 4), 16)
      const blue = parseInt(raw.slice(4, 6), 16)
      const max = Math.max(red, green, blue)
      const min = Math.min(red, green, blue)
      const delta = max - min
      let hue = 0
      if (delta) {
        if (max === red) hue = 60 * (((green - blue) / delta) % 6)
        else if (max === green) hue = 60 * ((blue - red) / delta + 2)
        else hue = 60 * ((red - green) / delta + 4)
      }
      if (hue < 0) hue += 360
      const saturation = max ? delta / max : 0
      const brightness = max / 255
      const huePosition = hue / 360 * 245
      this.setData({
        hueData: this._hueColor(hue),
        pickerData: {
          x: saturation * 240,
          y: (1 - brightness) * 240,
          red,
          green,
          blue,
          hex: `#${raw.toLowerCase()}`
        },
        barY: huePosition
      })
    },
    _hueColor(hue) {
      const section = hue / 60
      const cross = Math.round(255 * (1 - Math.abs(section % 2 - 1)))
      if (section < 1) return { colorStopRed: 255, colorStopGreen: cross, colorStopBlue: 0 }
      if (section < 2) return { colorStopRed: cross, colorStopGreen: 255, colorStopBlue: 0 }
      if (section < 3) return { colorStopRed: 0, colorStopGreen: 255, colorStopBlue: cross }
      if (section < 4) return { colorStopRed: 0, colorStopGreen: cross, colorStopBlue: 255 }
      if (section < 5) return { colorStopRed: cross, colorStopGreen: 0, colorStopBlue: 255 }
      return { colorStopRed: 255, colorStopGreen: 0, colorStopBlue: cross }
    },
    //选中颜色
    _chooseColor(e) {
      clearTimeout(this.data.timer)
      let x = (e.changedTouches[0].pageX - this.data.left - this.data.scrollLeft) / this.data.rpxRatio
      let y = (e.changedTouches[0].pageY - this.data.top - this.data.scrollTop) / this.data.rpxRatio
      x = x > 240 ? 240 : x
      y = y > 240 ? 240 : y
      x = x < 0 ? 0 : x
      y = y < 0 ? 0 : y
      const { pickerData } = this.data
      pickerData.x = x
      pickerData.y = y
      this.setData({
        pickerData,
        timer: setTimeout(() => {
          this._changeColor(x, y)
        }, 50)
      })
    },
    //拖动色相bar
    //这个地方选择出来的颜色就是色盘最右上角的颜色
    _changeBar(e) {
      let y = (e.changedTouches[0].pageY - this.data.top - this.data.scrollTop) / this.data.rpxRatio
      y = y > 245 ? 245 : y
      y = y < 0 ? 0 : y
      this.setData({
        barY: y
      })
      this._changeHue(y)
    },
    //改变颜色
    _changeColor(x, y) {
      //获取色相（色盘最右上角的颜色）
      const sRed = this.data.hueData.colorStopRed
      const sGreen = this.data.hueData.colorStopGreen
      const sBlue = this.data.hueData.colorStopBlue
      //选择的颜色
      //实际上这里是先算出假设y等于0时(不考虑Y轴)的颜色，后面需要再减去y*比例的颜色值
      let [pRed, pGreen, pBlue] = [this.data.pickerData.red, this.data.pickerData.green, this.data.pickerData.blue]
      //首先计算X轴
      if (sRed === 255) {
        //移动1单位需要减少多少颜色值
        const greenRatioX = (255 - sGreen) / 240
        const blueRatioX = (255 - sBlue) / 240
        const greenValueX = 255 - x * greenRatioX
        const blueValueX = 255 - x * blueRatioX
        pRed = 255
        pGreen = Math.round(greenValueX > sGreen ? greenValueX : sGreen)
        pBlue = Math.round(blueValueX > sBlue ? blueValueX : sBlue)
      }
      if (sGreen === 255) {
        const redRatioX = (255 - sRed) / 240
        const blueRatioX = (255 - sBlue) / 240
        const redValueX = 255 - x * redRatioX
        const blueValueX = 255 - x * blueRatioX
        pRed = Math.round(redValueX > sRed ? redValueX : sRed)
        pGreen = 255
        pBlue = Math.round(blueValueX > sBlue ? blueValueX : sBlue)
      }
      if (sBlue === 255) {
        const redRatioX = (255 - sRed) / 240
        const greenRatioX = (255 - sGreen) / 240
        const redValueX = 255 - x * redRatioX
        const greenValueX = 255 - x * greenRatioX
        pRed = Math.round(redValueX > sRed ? redValueX : sRed)
        pGreen = Math.round(greenValueX > sGreen ? greenValueX : sGreen)
        pBlue = 255
      }

      //考虑Y轴，减去y*比例的颜色值，得到最终颜色
      const redRatioY = pRed / 240
      const greenRatioY = pGreen / 240
      const blueRatioY = pBlue / 240

      const redValueY = y * redRatioY
      const greenValueY = y * greenRatioY
      const blueValueY = y * blueRatioY
      const hex = this._rgbToHex(pRed - redValueY, pGreen - greenValueY, pBlue - blueValueY)
      const { pickerData } = this.data
      pickerData.red = Math.round(pRed - redValueY)
      pickerData.green = Math.round(pGreen - greenValueY)
      pickerData.blue = Math.round(pBlue - blueValueY)
      pickerData.hex = hex
      this.setData({
        pickerData
      })
      this.triggerEvent('changecolor', {
        colorData: this.data
      })
    },
    //改变色相
    _changeHue(y) {
      //根据色相bar的长度(245)计算出每拖动0.16距离就改变一次色相（R或G或B的值增减1）
      //色相的变化一共分为六个阶段,每次拖动40.83距离就完成一个阶段
      const { hueData } = this.data
      console.log(hueData);
      if (y < 40.83) {
        const value = y / .16 > 255 ? 255 : y / .16
        hueData.colorStopRed = 255
        hueData.colorStopGreen = Math.round(value)
        hueData.colorStopBlue = 0
      }
      if (y >= 40.83 && y < 81.66) {
        const value = (y - 40.83) / .16 > 255 ? 255 : (y - 40.83) / .16
        hueData.colorStopRed = 255 - Math.round(value)
        hueData.colorStopGreen = 255
        hueData.colorStopBlue = 0
      }
      if (y >= 81.66 && y < 122.5) {
        const value = (y - 81.66) / .16 > 255 ? 255 : (y - 81.66) / .16
        hueData.colorStopRed = 0
        hueData.colorStopGreen = 255
        hueData.colorStopBlue = Math.round(value)
      }
      if (y >= 122.5 && y < 163.33) {
        const value = (y - 122.5) / .16 > 255 ? 255 : (y - 122.5) / .16
        hueData.colorStopRed = 0
        hueData.colorStopGreen = 255 - Math.round(value)
        hueData.colorStopBlue = 255
      }
      if (y >= 163.33 && y < 204.16) {
        const value = (y - 163.33) / .16 > 255 ? 255 : (y - 163.33) / .16
        hueData.colorStopRed = Math.round(value)
        hueData.colorStopGreen = 0
        hueData.colorStopBlue = 255
      }
      if (y >= 204.16) {
        const value = (y - 204.16) / .16 > 255 ? 255 : (y - 204.16) / .16
        hueData.colorStopRed = 255
        hueData.colorStopGreen = 0
        hueData.colorStopBlue = 255 - Math.round(value)
      }
      this.setData({
        hueData
      })
      //改变完色相需要再次改变选择的颜色
      this._changeColor(this.data.pickerData.x, this.data.pickerData.y)
    },
    _rgbToHex(r, g, b) {
      let hex = ((r << 16) | (g << 8) | b).toString(16)
      if (hex.length < 6) {
        hex = `${'0'.repeat(6 - hex.length)}${hex}`
      }
      if (hex == '0') {
        hex = '000000'
      }
      return `#${hex}`
    }
  }
})
