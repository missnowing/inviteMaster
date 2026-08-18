import { formatUrlencoded } from "../utils/util";

export enum RefreshStatus {
    // 空闲
    Idle,
    // 超过下拉刷新阈值，同 bind:refresherwillRefresh 触发时机
    CanRefresh,
    // 下拉刷新，同 bind:refresherrefresh 触发时机
    Refreshing,
    // 下拉刷新完成，同 bind:refresherrestore 触发时机
    Completed,
    // 下拉刷新失败
    Failed,
    // 超过下拉二级阈值
    CanTwoLevel,
    // 开始打开二级
    TwoLevelOpening,
    // 打开二级
    TwoLeveling,
    // 开始关闭二级
    TwoLevelClosing,
}

type TNavigator = {
    note: string,
};
const navigatorMap: TNavigator = {
    note: '/pages/set/note/note',
};
type TQuery = {
    url: keyof TNavigator,
};

export const customNavigator = (query: { [key: string]: string } & TQuery) => {
    const { url: key } = query;
    const url = navigatorMap[key];
    url && wx.navigateTo({
        url,
    })
};