
export default function format() {
    Date.prototype.Format = function (fmt) {
        const o = {
            "M+": this.getMonth() + 1, //月份
            "d+": this.getDate(), //日
            "h+": this.getHours(), //小时
            "m+": this.getMinutes(), //分
            "s+": this.getSeconds(), //秒
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度
            "S": this.getMilliseconds(), //毫秒
            "w+": "日一二三四五六".charAt(this.getDay())
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (let k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    };
    Date.prototype.nextDay = function (n = 1) {
        const d = this;
        d.setDate(d.getDate() + n);
        return d;
    };
    String.prototype.toDateString = function () {
        const d = new Date(), d0 = new Date(this), sub = (d - d0) / 1000;
        console.log(sub);
        return sub < 0 ? d0.Format("yyyy-MM-dd") : sub < 60 ? "刚刚" : sub < 3600 ? (sub / 60 | 0) + "分钟前" : sub < 86400 ? (sub / 3600 | 0) + "小时前" :
            sub < 172800 ? "昨天" : d.getFullYear() === d0.getFullYear() ? d0.Format("MM-dd") : d0.Format("yyyy-MM-dd");
    };
    String.prototype.rtrim = function (str) {
        return this.replace(new RegExp(`(.*)${str}$`), "$1");
    };
    String.prototype.ltrim = function (str) {
        return this.replace(new RegExp(`^${str}(.*)`), "$1");
    };
    String.prototype.lappend = function (str) {
        return str + this;
    };
    String.prototype.ascLength = function () {
        let len = 0;
        for (let i = 0; i < this.length; i++) {
            if (this.charCodeAt(i) > 127 || this.charCodeAt(i) === 94) {
                len += 2;
            } else {
                len++;
            }
        }
        return len;
    };
    String.prototype.toDate = function () {
        const numbers = this.match(/\d+/g);
        if (!numbers || numbers.length < 3) {
            return null;
        }
        const year = parseInt(numbers[0]);
        const month = parseInt(numbers[1]) - 1;
        const day = parseInt(numbers[2]);
        const hour = numbers[3] ? parseInt(numbers[3]) : 0;
        const minute = numbers[4] ? parseInt(numbers[4]) : 0;
        const second = numbers[5] ? parseInt(numbers[5]) : 0;

        return new Date(year, month, day, hour, minute, second);
    }
}

export function simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
}