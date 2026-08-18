import { _CDN } from "../../store/global";
import { selectResponse, TResponse } from "../../store/response";

Page({
    data: {
        style: {
            fontsize: getApp().globalData.style.rem,
        },
        _CDN,
        invitations: [] as TResponse[],
    },
    onLoad() {
        console.log("onload");
        getApp().setProxy("response", {
            set: (target: any, key: string, value: TResponse[], receiver: any) => {
                this.setData({
                    invitations: value.map(response => {
                        return response._date = new Date(response.date).Format('yyyy-MM-dd'), response;
                    })
                })
            }
        })
        selectResponse().catch(e => {
        });
    },
})
