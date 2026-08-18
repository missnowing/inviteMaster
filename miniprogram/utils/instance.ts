/**
 * mask为true的实例
 * @returns 
 */
const showLoading = () => (option: any) => {
    wx.showLoading({ mask: !0, ...option });
}
const showToast = () => (option: any) => {
    wx.showToast({ mask: !0, duration: 2000, ...option });
}

export default {
    showLoading: showLoading(),
    showToast: showToast(),
};