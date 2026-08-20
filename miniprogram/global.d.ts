// src/global.d.ts
export { }; // 这一行确保文件被视为模块，使 declare global 生效

declare global {
    namespace WechatMiniprogram {
        interface Wx {
            /** [wx.cropImage(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.cropImage.html)
             *
             * 裁剪图片，1:1裁剪 */
            cropImage(option: {
                /** 图片路径，目前只支持本地路径 */
                src: string
                /** 裁剪比例，目前只支持1:1 */
                cropScale?: string
                /** 接口调用成功的回调函数 */
                success?: (res: { tempFilePath: string }) => void
                /** 接口调用失败的回调函数 */
                fail?: (res?: any) => void
                /** 接口调用结束的回调函数（调用成功、失败都会执行）*/
                complete?: (res?: any) => void
            }): void
        }
    }
    interface Date {
        Format: (formatString: string) => string;
        nextDay: (nextDay: number) => Date;
        lunarDate: (formatString: string) => string;
    }
    interface String {
        toDateString: () => string;
        rtrim: (str: string) => string;
        ltrim: (str: string) => string;
        lappend: (str: string) => string;
        ascLength: () => number;
        toDate: () => Date | null;
    }
    //获取对象中非对象的键
    export type BasicKeys<T> = {
        [K in keyof T]: T[K] extends object ? never : K;
    }[keyof T];

    //获取对象中对象的键
    export type ObjectKeys<T> = {
        [K in keyof T]: T[K] extends object ? K : never;
    }[keyof T];
}
