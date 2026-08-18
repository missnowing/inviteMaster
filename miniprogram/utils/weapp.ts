type TScopes =
    'userLocation' |
    'userFuzzyLocation' |
    // 'userLocationBackground' |
    'record' |
    'camera' |
    'bluetooth' |
    'writePhotosAlbum' |
    'addPhoneContact' |
    'addPhoneCalendar' |
    'werun' |
    'address' |
    'invoiceTitle' |
    'invoice' |
    'userInfo';
type TModule = {
    scope: `scope.${TScopes}`,
    tip: string,
};
export const authSetting = (module: TModule, callback: Function) => {
    wx.getSetting({
        success(res) {
            console.log(res);
            if (res.authSetting[module.scope] === false) {
                wx.showModal({
                    title: '授权提示',
                    content: module.tip,
                    confirmText: '去设置',
                    success(modalRes) {
                        if (modalRes.confirm) {
                            wx.openSetting({
                                success(settingRes) {
                                    if (settingRes.authSetting[module.scope]) {
                                        wx.showToast({ title: '授权成功' });
                                        callback();
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                callback();
            }
        }
    });
}
