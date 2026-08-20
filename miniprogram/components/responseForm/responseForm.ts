import { TInvitation } from "../../store/invitation";
import { createResponse, TResponse } from "../../store/response";

const RESPONSE_TYPES = [
    { value: 1, label: '参加' },
    { value: 2, label: '缺席' },
    { value: 3, label: '待定' },
];

// type TFormData = Pick<TResponse, 'guestName' | 'guestPhone' | 'guestCount' | 'responseType' | 'blessing' | 'needAccommodation' | 'accommodationDetail' | 'needPickup' | 'pickupDetail' | 'seatInfo'>;
type TFormData = Pick<TResponse, keyof TResponse>;

Component({
    properties: {
        theInvitation: {
            type: Object,
            value: void 0 as TInvitation | undefined,
        },
        theResponse: {
            type: Object,
            value: void 0 as TResponse | undefined,
        },
    },
    data: {
        invitation: {} as TInvitation,
        visible: false,
        responseTypes: RESPONSE_TYPES,
        form: {
            guestName: '',
            guestPhone: '',
            guestCount: 1,
            responseType: 1,
            blessing: '',
            needAccommodation: 0,
            accommodationDetail: '',
            needPickup: 0,
            pickupDetail: '',
            seatInfo: '',
        } as TFormData,
        submitting: false,
    },
    observers: {
        theResponse(current) {
            if (!current) return;
            this.setData({
                form: {
                    ...this.data.form,
                    ...current,
                }
            })
        },
        theInvitation(invitation) {
            if (!invitation) return;
            const userInfo = getApp().globalData.userInfo || {};
            const form = this.properties.theResponse ? this.data.form : {
                ...this.data.form,
                guestName: this.data.form.guestName || userInfo.realName || userInfo.nickName || "",
                guestPhone: this.data.form.guestPhone || userInfo.phone || "",
            };
            this.setData({
                invitation,
                form,
            })
        },
    },
    methods: {
        onInput(e: WechatMiniprogram.Input) {
            const { key } = e.currentTarget.dataset;
            this.setData({
                form: { ...this.data.form, [key]: e.detail.value }
            });
        },
        onSwitchChange(e: WechatMiniprogram.SwitchChange) {
            const { key } = e.currentTarget.dataset;
            this.setData({
                form: { ...this.data.form, [key]: +e.detail.value }
            });
        },
        onResponseTypeTap(e: WechatMiniprogram.TouchEvent) {
            const value = Number(e.currentTarget.dataset.value);
            this.setData({
                form: {
                    ...this.data.form,
                    responseType: value,
                    guestCount: value === 1 ? Math.max(1, this.data.form.guestCount || 1) : 1,
                    needAccommodation: value === 1 ? this.data.form.needAccommodation : 0,
                    needPickup: value === 1 ? this.data.form.needPickup : 0,
                }
            });
        },
        onCountChange(e: WechatMiniprogram.TouchEvent) {
            const { op } = e.currentTarget.dataset;
            const currentCount = Number(this.data.form.guestCount || 1);
            let count = currentCount;
            const maxGuests = Math.max(1, Number(this.data.invitation.maxGuests || 1));
            count = op === '-' ? Math.max(1, count - 1) : Math.min(maxGuests, count + 1);
            if (op === '+' && currentCount >= maxGuests) {
                wx.showToast({ title: `最多可填写 ${maxGuests} 人`, icon: 'none' });
            }
            this.setData({
                form: { ...this.data.form, guestCount: count }
            });
        },
        onSubmit() {
            if (this.data.submitting) return;
            const { form, invitation } = this.data;
            if (!invitation.allowAnonymous && !form.guestName.trim()) {
                wx.showToast({ title: '请填写姓名', icon: 'error' });
                return;
            }
            const phone = form.guestPhone.trim();
            if (invitation.needPhone && !phone) {
                wx.showToast({ title: '请填写手机号', icon: 'error' });
                return;
            }
            if (phone && !/^1\d{10}$/.test(phone)) {
                wx.showToast({ title: '请填写正确的手机号', icon: 'error' });
                return;
            }
            const entity = {
                ...form,
                invitationId: invitation.id,
                guestPhone: phone,
                guestCount: form.responseType === 1 && invitation.allowModifyGuests
                    ? Math.min(Number(form.guestCount || 1), Math.max(1, Number(invitation.maxGuests || 1)))
                    : 1,
                needAccommodation: form.responseType === 1 ? form.needAccommodation : 0,
                accommodationDetail: form.responseType === 1 && form.needAccommodation
                    ? form.accommodationDetail
                    : "",
                needPickup: form.responseType === 1 ? form.needPickup : 0,
                pickupDetail: form.responseType === 1 && form.needPickup ? form.pickupDetail : "",
                status: form.status === undefined ? 1 : form.status,
                isSigned: form.isSigned || 0,
            } as unknown as TResponse;
            this.setData({ submitting: true });
            wx.showLoading({ title: '提交中...' });
            createResponse(entity).then(() => {
                wx.showToast({ title: '回复成功！', icon: 'success' });
                this.onTrigger('success');
            }).catch(() => {
                wx.showToast({ title: '回复失败', icon: 'error' });
            }).finally(() => {
                wx.hideLoading();
                this.setData({ submitting: false });
            });
        },
        onTrigger(status: string) {
            this.triggerEvent('trigger', { status });
        },
        prevent() { },
    },
});
