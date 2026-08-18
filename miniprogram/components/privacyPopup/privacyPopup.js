import { setTabbar } from "../../store/global";
Component({
  data: {
    title: "隐私政策",
    desc1: "欢迎您使用ilinks小程序，为了更好地保护您的个人信息，请您仔细阅读并理解我们最新的《隐私政策》。如您同意，我们将严格按照各项条款使用和保护您的个人信息。请您在使用ilinks小程序前点击《隐私政策》并仔细阅读。如您同意《隐私政策》的全部内容，请点击“同意并继续”开始使用我们的服务",
    urlTitle: "《隐私政策》",
    innerShow: false,
    height: 0,
  },
  lifetimes: {
    attached: function () {
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: res => {
            console.log("是否需要授权：", res.needAuthorization, "隐私协议的名称为：", res.privacyContractName)
            if (res.needAuthorization) {
              this.popUp()
            } else {
              this.triggerEvent("agree")
            }
          },
          fail: () => { },
          complete: () => { },
        })
      } else {
        // 低版本基础库不支持 wx.getPrivacySetting 接口，隐私接口可以直接调用
        this.triggerEvent("agree")
      }
    },
  },
  methods: {
    handleDisagree(e) {
      this.triggerEvent("disagree")
      this.disPopUp()
    },
    handleAgree(e) {
      this.triggerEvent("agree")
      this.disPopUp()
    },
    popUp() {
      this.setData({
        innerShow: true
      });
      setTabbar(!1)
    },
    disPopUp() {
      this.setData({
        innerShow: false
      })
      setTabbar(!0)
    },
    openPrivacyContract() {
      wx.openPrivacyContract({
        success: res => {
          console.log('openPrivacyContract success')
        },
        fail: res => {
          console.error('openPrivacyContract fail', res)
        }
      })
    }
  }
})