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
    },
    lifetimes: {
        created() {
        },
        ready() {
            console.log("ready-----");
        },
    },
    observers: {
        theResponse(current) {
            console.log("observers:response-----", current);
            this.setData({
                form: {
                    ...this.data.form,
                    ...this.properties.theResponse
                }
            })
        },
        theInvitation(invitation) {
            console.log("observers:invitation-----", invitation);
            this.setData({
                invitation
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
            const { value } = e.currentTarget.dataset;
            this.setData({
                form: { ...this.data.form, responseType: value }
            });
        },
        onCountChange(e: WechatMiniprogram.TouchEvent) {
            const { op } = e.currentTarget.dataset;
            let count = this.data.form.guestCount;
            count = op === '-' ? Math.max(1, count - 1) : count + 1;
            this.setData({
                form: { ...this.data.form, guestCount: count }
            });
        },
        onSubmit() {
            const { form } = this.data;
            if (!form.guestName.trim()) {
                wx.showToast({ title: '请填写姓名', icon: 'error' });
                return;
            }
            if (!form.guestPhone.trim() || !/^1\d{10}$/.test(form.guestPhone)) {
                wx.showToast({ title: '请填写正确的手机号', icon: 'error' });
                return;
            }
            const entity = {
                ...form,
                invitationId: this.data.invitation.id,
            } as unknown as TResponse;
            wx.showLoading({ title: '提交中...' });
            createResponse(entity).then(() => {
                wx.hideLoading();
                wx.showToast({ title: '回复成功！', icon: 'success' });
                this.onTrigger('success');
            }).catch(() => {
                wx.hideLoading();
                wx.showToast({ title: '回复失败', icon: 'error' });
            });
        },
        onTrigger(status: string) {
            this.triggerEvent('trigger', { status });
        },
        prevent() { },
    },
});
