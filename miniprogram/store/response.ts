import { _request, reflectEntity } from "../utils/util";
import { getUserHeader } from "./userSlice";

export type TResponse = {
    id: number,
    invitationId: number,
    userOpenid: string,	            //用户openid（登录用户）
    accommodationDetail: string,	//住宿详情
    blessing: string,	            //祝福语
    date: string,               	//创建时间
    guestCount: number,	            //参加人数
    guestName: string,              //客人姓名
    guestPhone: string,	            //客人手机号
    isSigned: 1 | 0,	            //是否签到
    needAccommodation: 1 | 0, 	    //是否需要住宿
    needPickup: 1 | 0,    	        //是否需要接送
    pickupDetail: string,	        //接送详情
    responseType: number,   	    //回复类型：1参加 2缺席 3待定		
    seatInfo: string,       	    //座位信息
    signTime: string,	            //签到时间
    status: number,             	//状态：0取消 1有效

    _date?: string,
}

export const ResponseSlice = {
    name: 'response',
    initialState: [],
    reducers: {
        setResponse: (responses: TResponse[]) => {
            const app = getApp();
            app.proxyData.response = responses;
        },
        updateResponse: (response: TResponse) => {
            const app = getApp(), responses = app.proxyData.response,
                index = responses.findIndex((Response_: TResponse) => Response_.id === response.id);
            index >= 0 ? responses.splice(index, 1, response) : responses.unshift(response);
            app.proxyData.response = [...responses];
        },
        removeResponse: (id: number) => {
            const app = getApp(),
                responses = app.proxyData.response,
                index = responses.findIndex((Response_: TResponse) => Response_.id === id);
            if (index < 0) return;
            responses.splice(index, 1);
            app.proxyData.response = [...responses];
        },
    },
}

export const {
    setResponse, updateResponse, removeResponse,
} = ResponseSlice.reducers;

export const queryResponse = () => getApp().globalData.response;

/***
 * 获取我的应邀列表
 */
export const selectResponse = ({ page, pageSize } = { page: 1, pageSize: 20 }) =>
    _request({
        url: `/witinvite/response/myResponseList`, header: getUserHeader(),
        query: { page, pageSize }
    }).then((r: any) => {
        if (r.result >= 0) {
            const list = Array.isArray(r.message) ? r.message : [];
            setResponse(list);
            return Promise.resolve({ list, total: Number(r.total || list.length) });
        } else {
            return Promise.reject(r);
        }
    })

/***
 * 创建应邀
 */
export const createResponse = (entity: TResponse) =>
    _request({
        url: `/witinvite/response/add`, header: getUserHeader(),
        params: reflectEntity(entity), formData: !1,
    }).then((r: any) => {
        if (r.result >= 0) {
            updateResponse(r.message);
            return Promise.resolve(r.message);
        } else {
            return Promise.reject(r);
        }
    })

/***
 * 查询应邀
 */
export const checkResponse = (invitationId: number) =>
    _request({
        url: `/witinvite/response/check`, header: getUserHeader(),
        query: { invitationId },
    }).then((r: any) => {
        if (r.result >= 0) {
            return Promise.resolve(r.message);
        } else {
            return Promise.reject(r);
        }
    })

export default ResponseSlice.reducers;
