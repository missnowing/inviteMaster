/*时间相关函数和滚轮选择器*/
//输入格式（yyMMdd hh:mm）输出日期时间，输入格式（cY年cNcD 生肖cX）输出农历，可与阳历混合使用
Date.prototype.lunarDate = function (fmt) {
	var o = { "M+": this.getMonth() + 1, "d+": this.getDate(), "w+": "日一二三四五六".charAt(this.getDay()), "h+": this.getHours(), "m+": this.getMinutes(), "s+": this.getSeconds(), "S": this.getMilliseconds(), "q+": Math.floor((this.getMonth() + 3) / 3) };
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
		}
	}
	if (/(c+)/.test(fmt)) {//农历格式
		e2c(this);
		if (new RegExp("(cY)").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, "甲乙丙丁戊己庚辛壬癸".charAt((date_vi.cYear - 4) % 10) + "子丑寅卯辰巳午未申酉戌亥".charAt((date_vi.cYear - 4) % 12));
		}
		if (new RegExp("(cN)").test(fmt)) {
				fmt = fmt.replace(RegExp.$1, date_vi.cMonthName || monStrs[date_vi.cMonth - 1]);
		}
		if (new RegExp("(cD)").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, dayString[date_vi.cDay - 1]);
		}
		if (new RegExp("(cX)").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, "鼠牛虎兔龙蛇马羊猴鸡狗猪".charAt((date_vi.cYear - 4) % 12));
		}
	}
	return fmt;
}
//农历换算字典
var CalendarData = [
	0xA4B, 0x5164B, 0x6A5, 0x6D4, 0x415B5, 0x2B6, 0x957, 0x2092F, 0x497, 0x60C96,
	0xD4A, 0xEA5, 0x50DA9, 0x5AD, 0x2B6, 0x3126E, 0x92E, 0x7192D, 0xC95, 0xD4A,
	0x61B4A, 0xB55, 0x56A, 0x4155B, 0x25D, 0x92D, 0x2192B, 0xA95, 0x71695, 0x6CA,
	0xB55, 0x50AB5, 0x4DA, 0xA5B, 0x30A57, 0x52B, 0x8152A, 0xE95, 0x6AA, 0x615AA,
	0xAB5, 0x4B6, 0x414AE, 0xA57, 0x526, 0x31D26, 0xD95, 0x70B55, 0x56A, 0x96D,
	0x5095D, 0x4AD, 0xA4D, 0x41A4D, 0xD25, 0x81AA5, 0xB54, 0xB6A, 0x612DA, 0x95B,
	0x49B, 0x41497, 0xA4B, 0xA164B, 0x6A5, 0x6D4, 0x615B4, 0xAB6, 0x957, 0x5092F,
	0x497, 0x64B, 0x30D4A, 0xEA5, 0x80D65, 0x5AC, 0xAB6, 0x5126D, 0x92E, 0xC96,
	0x41A95, 0xD4A, 0xDA5, 0x20B55, 0x56A, 0x7155B, 0x25D, 0x92D, 0x5192B, 0xA95,
	0xB4A, 0x416AA, 0xAD5, 0x90AB5, 0x4BA, 0xA5B, 0x60A57, 0x52B, 0xA93, 0x40E95,
	0x6AA, 0xAD5, 0x209B5, 0x4B6, 0x614AE, 0xA4E, 0xD26, 0x51D26, 0xD53, 0x5AA,
	0x30D6A, 0x96D, 0x11095D, 0x4AD, 0xA4D, 0x61A4B, 0xD25, 0xD52, 0x51B54, 0xB5A, 0x56D, 0x2095B, 0x49B, 0x71497, 0xA4B, 0xAA5, 0x516A5, 0x6D2, 0xADA, 0x30AB6, 0x937, 0x8092F, 0x497, 0x64B, 0x60D4A, 0xEA5, 0x6B2, 0x4156C, 0xAAE, 0x92E, 0x3192E, 0xC96, 0x71A95, 0xD4A, 0xDA5, 0x50B55, 0x5EA, 0xA6D, 0x40A5D, 0x52D, 0x8152B, 0xA95, 0xB4A, 0x616AA, 0xAD5, 0x55A, 0x414BA, 0xA5B, 0x52B, 0x21527, 0x693, 0x70E53, 0x6AA, 0xAD5, 0x509B5, 0x4B6, 0xA57, 0x40A4E, 0xD26, 0x81D6A, 0xD52, 0xDAA, 0x60D6A, 0x56D, 0x4AE, 0x4149D, 0xA5D, 0xD15, 0x21B25, 0xD52, 0x70B52, 0xB5D, 0x55D, 0x5095B, 0x49B, 0xA4B, 0x41A4B, 0xAA5, 0x916A5, 0x6D3, 0xAD6, 0x60AB6, 0x937, 0x497, 0x41C97, 0x74B, 0x6A5],
	monStrs = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"],
	dayString = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "廿十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"],
	//世界城市和时差
	worldtime = [['阳历', '首尔', '东京', '悉尼', '夏威夷', '洛杉矶', '墨西哥', '纽约', '圣保罗', '伦敦', '巴黎', '罗马', '莫斯科', '迪拜', '日内瓦', '开罗', '新加坡', '曼谷', '雅加达'], [0, -1, -1, -2, 18, 15, 13, 12, 11, 7, 6, 6, 5, 4, 6, 6, 0, 1, 1]],
	date_vi = { year: 1970, month: 0, day: 1, hour: 0, minute: 0, second: 0, weekn: 0, weeki: 0, dayn: 0, cYear: 2024, cMonth: 0, cDay: 1, first_val: 0, last_val: 0, dhm: "", whours: 0 },
	date_show_tp = ["阳历", "阳历"], date_show_tpi = 1,
	date_sli = ['year', 'month', 'day', 'hour', 'minute', 'second', 'weekn', 'weeki', 'dayn'],
	date_sli2 = ['cYear', 'cMonth', 'cDay', 'hour', 'minute'], //农历滚轮列类型
	formi = [1921, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
	formj = [200, 12, 30, 24, 60, 60, 53, 7, 366];//每个周期的开始数和总个数

function e2c(D) {
	var m, n, k, cDays, isEnd = false,
		total = parseInt((D - new Date("1921/2/8")) / 86400000);
	for (m = 0; ; m++) {
		k = (CalendarData[m] < 0xfff) ? 11 : 12;//闰月
		for (n = k; n >= 0; n--) {//某个月的天数
			cDays = 29 + GetBit(CalendarData[m], n);
			if (total <= cDays) { isEnd = true; break; }//当剩余天数小于当月天数时终止循环
			total -= cDays;
		}
		if (isEnd) break;
	}
	date_vi.cYear = 1921 + m; date_vi.cMonth = k - n + 1; date_vi.cDay = total + 1;
	var monthNames = monStrs.slice();
	if (k == 12) {
			var mon = Math.floor(CalendarData[m] / 0x10000);
			monthNames.splice(mon, 0, "闰" + monthNames[mon - 1])
		};
	date_vi.cMonthName = monthNames[date_vi.cMonth - 1];
	return date_vi.cYear + "甲乙丙丁戊己庚辛壬癸".charAt((date_vi.cYear - 4) % 10) + "子丑寅卯辰巳午未申酉戌亥".charAt((date_vi.cYear - 4) % 12) + "(" + "鼠牛虎兔龙蛇马羊猴鸡狗猪".charAt((date_vi.cYear - 4) % 12) + ")年 " + date_vi.cMonthName + dayString[date_vi.cDay - 1];
}//阳历换算农历，分解每列的值
function c2e() {
	var n, k, total = 0;
	for (var m = 0, ln = date_vi.cYear - 1921; m < ln; m++) {
		k = (CalendarData[m] < 0xfff) ? 11 : 12;
		for (n = 0; n <= k; n++) {
			total += 29 + GetBit(CalendarData[m], n);
		}
	}
	k = (CalendarData[ln] < 0xfff) ? 11 : 12;
	for (n = 0; n < date_vi.cMonth - 1; n++) {
		total += 29 + GetBit(CalendarData[m], k - n);
	}
	total += date_vi.cDay - 1;
	date.setTime(total * 86400000 - 1543046400000);
	date.setHours(date_vi.hour, date_vi.minute);
	set_ymdhm(date);
}//农历换算阳历
function GetBit(m, n) { return (m >> n) & 1; }//从低位到高位按索引n获取二进制m在该处的数值0或1；

function set_ymdhm(d) {
	date_vi.second = d.getSeconds(); date_vi.minute = d.getMinutes();
	date_vi.hour = d.getHours();
	date_vi.weeki = d.getDay(); date_vi.day = d.getDate();
	date_vi.month = d.getMonth() + 1; date_vi.year = d.getFullYear();
}//分解日期
function get_ymdhm(d, i) {
	switch (i) {
		case 0:
			return d.getFullYear();
			break;
		case 1:
			return d.getMonth() + 1;
			break;
		case 2:
			return d.getDate();
			break;
		case 3:
			return d.getHours();
			break;
		case 4:
			return d.getMinutes();
			break;
		case 5:
			return d.getSeconds();
			break;
		default:
			return 0;
			break;
	}
}//返回某个时间单位
//调用及生成时间滚轮
function creat_date(n, gs) {
	//n字符串长度表示滚轮个数，数字n表示滚轮类型date_sli[n[i]]，当n首字符为c时表示农历（滚轮类型为date_sli2）;gs回传给输入栏的格式(每个时间后的符号,农历的年月初）；默认滚轮格式与输入栏相同，但滚轮的样式可以被切换；传给输入栏title的时间类型只能是标准的“yy-MM-dd hh:mm:ss”格式；滚轮会复原已有值，缺乏时用当前时间。
	last_obj = event.srcElement;//保存末次事件对象，作为返回目标；
	date_show_tp[1] = date_show_tp[0] = n == "c" ? "农历" : '阳历';
	if (last_obj.title) {
		date_vi.last_val = last_obj.title;//复原已有时间
	}
	date_vi.whours = 0;
	set_ymdhm(new Date(date_vi.last_val));
	//网页端生成方法
	if (date_show_tp[1] == "农历") n = n.substr(1);
	scrolltp1 = n;//保存原始滚轮格式
	date_geshi = gs;//保存输入栏格式
	creat_date5(n, gs);
}
function creat_date5(n, gs) {
	document.body.style.overflow = "hide";
	if (date_show_tp[1] == "农历") { e2c(date) }
	scrolltp = n;
	var cont = '<div class="W11 H11 bgca" onClick="hide(&quot;s_select&quot;)"></div><div id="sle" class="fix bottom0 W11 H35M bgc102 PB1"><div id="change_table" class="none index999 fix bottom0 FL W11 H35M AC" ></div><div id="tt" class="FR MRT MB BTN bgc16 rad1" onclick="P_V(&quot;inputdate&quot;)">确认</div><div id="inputmess" class="FR MT C14M H AC rad1 bgc9"></div><div id="date_showtp" class="FL MLT B6M H4M F3 LH15 AC rad1 border " onclick="c_datetype()">' + date_show_tp[0] + '</br>' + date_show_tp[1] + '</div><div id="scr_pp" class="FL ML C2M H28M" >';
	for (var i = 0, nl = n.length; i < nl; i++) {
		cont += '<div id="' + (date_show_tp[1] == "农历" ? date_sli2[n.charAt(i)] : date_sli[n.charAt(i)]) + '" name="s" class="ofa FL H11 W' + nl + '1 bgc' + (1 + i) + '" ></div>'
	}//设置滚轮框架
	document.getElementById('s_select').innerHTML = cont + '<div class="no_event index990 absolute bottom13 W11 H bgc9 alpha"></div></div></div>';
	show('s_select'); C_scrolli5(0);
}//生成时间滚轮，每列的id是时间类型
function C_scrolli5(k) {
	var ye = scrolltp[k], //创建第k个滚轮的样式
		scrp = document.getElementById("scr_pp").children[k],
		cont = "<ul class='FL W11 color1'><li class='W11 H' ></li><li class='W11 H' ></li><li class='W11 H' ></li>";
	if (ye < 3 && date_show_tp[1] == "农历") {//农历的年月日
		var cdt = CalendarData[date_vi.cYear - 1921], ln = 196;//某年农历特征值，农历年滚轮行数
			if (ye == 1) {//设置月滚轮行数=每年月数12（闰月13）
				ln = cdt < 0xfff ? 12 : 13;
				var monthNames = monStrs.slice();
				if (ln == 13) {
					var mon = Math.floor(cdt / 0x10000);
					monthNames.splice(mon, 0, "闰" + monthNames[mon - 1])
				};
		} else if (ye == 2) {//日滚轮行数=大小月的天数
			ln = 29 + GetBit(cdt, (cdt < 0xfff ? 12 : 13) - date_vi.cMonth);
		}
		for (i = 0; i < ln; i++) {
			var j = i + formi[ye]; //console.log(i,j);
				cont += "<li class='W11 H AC' data-v=" + j + " onclick='turn5()' >" + (ye == 2 ? dayString[j - 1] : (ye == 1 ? monthNames[j - 1] : j + "年")) + "</li>"
		}
	}
	else {
		if (ye == 2) {//设置日滚轮行数为本月的天数formj[2]，w为首行周几
			var w = (new Date(date_vi.year, date_vi.month - 1, 1)).getDay();//月初是周几
			formj[2] = new Date(date_vi.year, date_vi.month, 0).getDate();//本月天数（最后一天）
		};
		for (i = 0; i < formj[ye]; i++) {
			var j = i + formi[ye];
			cont += "<li class='W11 H AC " + (ye == 3 && i > 11 ? "colorY" : "") + ((ye == 2 && (j + w) % 7 < 2) ? " colorR" : "") + "' data-v=" + j + " onclick='turn5()' >" + (ye != 8 && j < 10 ? ("0" + j) : j) + (ye == 3 ? ":" : "") + "</li>"
		};//周六周日用红色字，下午用黄色字
	}
	scrp.innerHTML = cont + "<li class='W11 H' ></li><li class='W11 H' ></li><li class='W11 H' ></li></ul>";
	var st = date_show_tp[1] == "农历" ? date_vi[date_sli2[k]] - formi[k] : date_vi[date_sli[ye]] - formi[ye];
	scrp.scrollTop = M * 4 * st;//滚动到当前时间
	scrp.addEventListener('touchend', alladjust, false);
	scrp.addEventListener('wheel', alladjust, false);
	if (k < scrolltp.length - 1) {
		C_scrolli5(k + 1);//继续生成下一个滚轮
	} else { displaydate5("inputmess") }//显示结果
}//创建滚轮列
function turn5() {
	var eob = event.srcElement, ppobj = eob.parentNode.parentNode;
	ppobj.scrollTop = eob.offsetTop - eob.parentNode.offsetTop - M * 12;
	date_vi[ppobj.id] = 1 * eob.dataset.v;//把每列滚轮的值赋给滚轮框架列
	if ((ppobj.id == "cYear") && scrolltp.indexOf("1") >= 0) {//农历年继发
		C_scrolli5(1);
	} else if ((ppobj.id == "year" || ppobj.id == "month" || ppobj.id == "cMonth") && scrolltp.indexOf("2") >= 0) {
		C_scrolli5(2);//年月的改变要触发日滚轮重新生成
	}
	else {
		displaydate5("inputmess")
	}
}//单击跳转居中，根据id赋值给每列
function alladjust() {
	var ob = event.srcElement.name == "s" ? event.srcElement : event.srcElement.parentNode.parentNode;
	setTimeout(function () { ob.childNodes[0].childNodes[Math.round(0.25 * ob.scrollTop / M) + 3].click(); }, 500);
}//滚动延时停止 
function displaydate5(d) {//显示到输入预显框
	var outtext = "", tob = document.getElementById(d);//输出目标对象
	if (date_show_tp[1] == "农历") {
		c2e();//更新date和并分解日期
	}
	else {//阳历及世界时更新date
		date = new Date(date_vi.year, date_vi.month - 1, date_vi.day, date_vi.hour + date_vi.whours, date_vi.minute);
	}
	if (date_show_tp[0] == "农历") {
		if (date_show_tp[1] == "农历") {
			outtext = date_vi.cYear + "甲乙丙丁戊己庚辛壬癸".charAt((date_vi.cYear - 4) % 10) + "子丑寅卯辰巳午未申酉戌亥".charAt((date_vi.cYear - 4) % 12) + "(" + "鼠牛虎兔龙蛇马羊猴鸡狗猪".charAt((date_vi.cYear - 4) % 12) + ")年 " + monStrs[date_vi.cMonth - 1] + dayString[date_vi.cDay - 1];
		} else {
			outtext = e2c(date.setHours(d.getHours() + date_vi.whours));
			date_vi.hour = date.getHours();
		}
		if (scrolltp.indexOf("3") >= 0) { outtext += date_vi.hour + "时" }
		if (scrolltp.indexOf("2") >= 0) { outtext += date_vi.minute + "分" }
	}
	else {//阳历及世界时
		var date1 = new Date(date_vi.year, date_vi.month - 1, date_vi.day, date_vi.hour + date_vi.whours, date_vi.minute);
		for (var i = 0; i < scrolltp1.length; i++) {
			var dxt = get_ymdhm(date1, i);
			if (date_geshi[i] != " " || i > 0) {
				outtext += (dxt > 9 ? dxt : "0" + dxt) + (date_geshi[i] ? date_geshi[i] : "");
			}
		}
		if (date_geshi.indexOf('周') >= 0 && date_geshi.length > scrolltp.length) { outtext += "周" + "日一二三四五六".charAt(date1.getDay()) };
	}
	if (tob.tagName == "INPUT") { tob.value = outtext; } else { tob.innerHTML = outtext; }
}
function c_datetype() {
	date_show_tpi = 1;
	var cont = '<div class="FR MRT BTN bgc16 rad1" onclick="hide()">OK</div><div class="clear FL W11 H30M F3 LH25 AC bgc6 ofa" ><div class="FR MRT A41 H AC bgc93" onclick="cg_datetp()">农历</div><div class="FR MRT MB A41 H AC bgc93" onclick="cg_datetp()">阳历</div><div class="clear W11 F3">世界时换算</div>';
	for (var i = 1, ln = worldtime[0].length; i < ln; i++) {
		cont += '<div class="FL MLT A51 bgc73" onclick="cg_datetp()">' + worldtime[0][i] + '</div>';
	}
	document.getElementById('change_table').innerHTML = cont + '</div>';
	show("change_table");
}//设置滚轮和换算栏格式
function cg_datetp(t) {
	date_show_tp[1] = event.srcElement.innerHTML;
	document.getElementById('date_showtp').innerHTML = date_show_tp[0] + '</br>' + date_show_tp[1];
	if (date_show_tp[1] == "农历") {
		creat_date5(scrolltp1)
	} else {
		set_ymdhm(date);
		date_vi.whours = worldtime[1][worldtime[0].indexOf(date_show_tp[1])] - date_vi.whours;
		date = new Date(date_vi.year, date_vi.month - 1, date_vi.day, date_vi.hour - date_vi.whours, date_vi.minute);
		creat_date5(scrolltp1)
	}
}//设置滚轮和换算栏格式
function P_V(d) {
	var vobj = document.getElementById("inputmess");
	if (last_obj.tagName == "INPUT") { last_obj.value = vobj.innerHTML || vobj.value || ""; }
	else { last_obj.innerHTML = vobj.innerHTML || vobj.value || ""; }
	last_obj.title = date.Format('yyyy-MM-dd hh:mm:ss');
	hide("s_select"); document.body.style.overflow = "auto";
	if (last_obj.dataset.finp) { eval(last_obj.dataset.finp + "()") }
}//时间滚轮回传

function returndate(t, da) {
	var outtext = "";
	if (da) { date = new Date(da.rtrim(".0").replace(/\-/g, "/")) } else { date = new Date() };
	year = date.getFullYear(); month = date.getMonth() + 1; day = date.getDate();
	hour = date.getHours(); minute = date.getMinutes();
	week = "周" + "日一二三四五六".charAt(date.getDay());
	if (!t) t = "// : ";
	for (var i = 0; i < t.length; i++) {
		if (i == 6) {
			outtext += week
		} else {
			if (t[i] != "@") {
				var dxt = eval(date_sli[i]);
				outtext += (dxt > 9 ? dxt : "0" + dxt) + t[i];
			}
		}
	}
	return outtext;
}//根据格式返回时间形式
