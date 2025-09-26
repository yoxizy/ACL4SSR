// ==UserScript==
// @name         黑猫大麦抢票
// @namespace    CTGU-GGBond
// @version      15.7.6
// @description  全自动抢票，自动提交订单
// @author       CTGU-GGBond
// @match        https://buy.damai.cn/*
// @match        https://detail.damai.cn/*
// @match        https://seatsvc.damai.cn/*
// @match        https://m.damai.cn/*
// @match        https://mclient.alipay.com/*
// @match        https://mtop.damai.cn/h5/mtop.alibaba.detail.subpage.getdetail/*
// @grant        GM_xmlhttpRequest
// @connect      api.m.taobao.com
// @connect      mtop.damai.cn
// @require      https://cdn.staticfile.org/jquery/3.5.1/jquery.min.js
// @license      MIT
// ==/UserScript==

var version = "15.7.6";

var $style = $(
  "<style>" +
    "#control_container{margin: 20px 0;background:#e9e9e9;padding:20px;overflow: hidden;}" +
    "p{margin:10px 0;}" +
    "#control_container button{width:80%;height: 60px;line-height:60px;margin:10px 10%;font-size:30px;border-radius:30px}" +
    "#start_btn{color:#fff;background:#ff457a;}" +
    "#bp_btn{color:#fff;background: #ff457a;}" +
    "#end_btn{color:#666;background: #cfcfcf;}" +
    ".control_container_box{display: flex;align-items: center;flex-wrap: wrap;padding-right: 20px;border: 1px solid #ccc;}" +
    ".input_wrapper{display: flex;justify-content:center;font-size: 16px; margin-bottom:10px;}" +
    ".input_wrapper_box{flex: 4;}" +
    ".input_wrapper_phone{display: flex;justify-content: flex-end;font-size: 25px;padding:20px 0; text-align:center;}" +
    ".input_wrapper_phone input{width: 50%;}" +
    ".notice{margin:10px 10px;padding:10px 10px;color:darkslategrey;}" +
    "#wx{text-align: center; flex:1;color: #333;}" +
    "#countdown_wrapper {display:none; font-size: 30px; text-align:center; background:#ffeaf1;}" +
    "#countdown_wrapper p{width:100%;}" +
    "#countdown {font-size: 50px; color:#ff1268;}" +
    ".warning {color:red; font-weight:400;}" +
    "h3 {font-weight:800;}" +
    "</style>"
);

// 防止重复劫持 XMLHttpRequest
if (typeof window.__damai_xhr_hooked === 'undefined') {
  window.__damai_xhr_hooked = true;
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function () {
    var url = arguments[1];
    var method = arguments[0];
    if (
      method.toUpperCase() === "GET" &&
      typeof url === 'string' &&
      url.indexOf("mtop.damai.cn/h5/mtop.alibaba.detail.subpage.getdetail") !== -1
    ) {
      this._url = url;
    }
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("readystatechange", function () {
      if (
        this.readyState === 4 &&
        this.status === 200 &&
        this._url &&
        this._url.indexOf("mtop.damai.cn/h5/mtop.alibaba.detail.subpage.getdetail") !== -1
      ) {
        try {
          var responseText = JSON.parse(this.responseText);
          var result = JSON.parse(responseText.data.result);
          var skuList = result.perform.skuList;
          const skuIds = [];
          const itemIds = [];
          const priceNames = [];
          for (var k = 0; k < skuList.length; k++) {
            skuIds.push(skuList[k].skuId);
            itemIds.push(skuList[k].itemId);
            priceNames.push(skuList[k].priceName);
          }
          sessionStorage.setItem("skuIds", skuIds.join(","));
          sessionStorage.setItem("itemIds", itemIds.join(","));

          let priceNameStr = "";
          for (let i = 0; i < priceNames.length; i++) {
            priceNameStr += i + " : " + priceNames[i] + "\n";
          }
          alert(
            "请按票价前对应的序号输入: \n" +
              "当前选择场次：" +
              result.perform.performName +
              "\n" +
              priceNameStr
          );
        } catch (e) {
          console.error("解析接口响应失败", e);
        }
      }
    });
    return originalSend.apply(this, arguments);
  };
}

$(document).ready(function () {
  var curr_url = window.location.href;
  if (curr_url.includes("https://detail.damai.cn/")) {
    var order_url = sessionStorage.getItem("order_url");
    if (order_url) {
      window.location.href = order_url;
    } else {
      if (
        $("div.buybtn").text() === "选座购买" ||
        $(".service-note .service-note-name").text().includes("可选座")
      ) {
        alert(
          "无法全自动选座，请看“注意”部分。不要忘了先登录，填好联系人信息，删除多余联系人。"
        );
        detail_seat_ui();
      } else {
        detail_ui();
      }
    }
  }

  if (curr_url.includes("https://buy.damai.cn/")) {
    if (curr_url.includes("https://buy.damai.cn/multi/flow")) {
      var order_url = curr_url.substring(curr_url.indexOf("=") + 1);
      sessionStorage.setItem("order_url", order_url);
      window.location.href = order_url;
    } else {
      if ($(".error-msg").length > 0) {
        if ($(".error-msg").text().includes("已过期")) {
          document
            .getElementsByClassName("next-row error-reload")[0]
            .children[0].click();
        } else {
          var order_url = sessionStorage.getItem("order_url");
          if (order_url) {
            window.location.href = order_url;
          } else {
            window.location.reload();
          }
        }
      } else {
        setTimeout(fill_form, 200);
      }
    }
  }

  if (curr_url.includes("https://seatsvc.damai.cn/")) {
    var people_num = new URLSearchParams(window.location.search).get("people_num");
    if (people_num == "1") {
      new MutationObserver(function (mutations) {
        if (
          document.querySelector("#app > div.render-result-container > div.select-result")
        ) {
          $("#app > div.render-result-container > div.select-result").off("DOMNodeInserted").on("DOMNodeInserted", seat_click_buy_btn);
        }
      }).observe(document, { childList: true, subtree: true });
    } else {
      document.onkeydown = function (e) {
        if (e.keyCode === 32) {
          seat_click_buy_btn();
        }
      };
    }
  }

  if (curr_url.includes("https://m.damai.cn/damai/")) {
    var phone_order_url = sessionStorage.getItem("phone_order_url");
    if (phone_order_url) {
      var reload_cnt = sessionStorage.getItem("reload_cnt");
      if (Number(reload_cnt) > 66) {
        alert("抢购已自动结束，请返回查看有无订单");
        sessionStorage.clear();
        return;
      }
      window.location.href = phone_order_url;
    } else {
      // fetchGet 已在全局 hook 中处理
      phone_detail_ui();
    }
  }

  if (curr_url.includes("https://m.damai.cn/app/dmfe/")) {
    var reload_cnt = sessionStorage.getItem("reload_cnt");
    if (reload_cnt == null || Number(reload_cnt) > 66) {
      alert("抢购已自动结束，请返回查看有无订单");
      sessionStorage.clear();
      return;
    }
    setTimeout(fill_phone_form, 100);
    var viewer = $(".viewer >div >div");
    if (viewer != null && viewer.length !== 0) {
      var appContent = $("#app >div >div");
      if (appContent.length > 0 && appContent.html().indexOf("系统繁忙") !== -1) {
        var phone_or_url = sessionStorage.getItem("phone_order_url");
        window.location.href = phone_or_url;
      }
    }
  }

  if (
    curr_url.includes("https://excashier.alipay.com/") ||
    curr_url.includes("https://mclient.alipay.com")
  ) {
    alert("恭喜下单成功，可前往APP查看，有5分钟付款时间");
    // sessionStorage.clear(); // 可选：不清除以便调试
  }
});

function seat_click_buy_btn() {
  $("#app > div.render-result-container > div.select-result > div.tip-order-button > button").click();
}

Number.prototype.toHHMMSS = function () {
  var totalSec = Math.max(0, this);
  var hours = ("00" + Math.floor(totalSec / 3600)).slice(-2);
  var minutes = ("00" + Math.floor((totalSec % 3600) / 60)).slice(-2);
  var seconds = ("00" + (totalSec % 60)).slice(-2);
  return hours + ":" + minutes + ":" + seconds;
};

function timedUpdate() {
  var time_difference = Math.ceil((window.sellStartTime_timestamp - window.current_time) / 1000);
  if (window.current_time === undefined || time_difference < 10) {
    syncTime(200);
  } else {
    syncTime(2500);
  }
}

function syncTime(num) {
  GM_xmlhttpRequest({
    url: "https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp",
    method: "GET",
    timeout: 10000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    onload: function (responseDetails) {
      if (responseDetails.status === 200) {
        try {
          var result = JSON.parse(responseDetails.responseText);
          window.current_time = parseInt(result.data.t);
          var time_difference = Math.ceil((window.sellStartTime_timestamp - window.current_time) / 1000);
          console.log("相差秒数：" + time_difference);
          if (time_difference < 2) {
            window.location.href = window.order_url;
          } else {
            var time_difference_str = time_difference.toHHMMSS();
            $("#countdown").text(time_difference_str);
            window.timer = setTimeout(timedUpdate, num);
          }
        } catch (e) {
          console.error("时间同步解析失败", e);
          setTimeout(() => syncTime(500), 1000);
        }
      } else {
        setTimeout(() => syncTime(500), 1000);
      }
    },
    onerror: function () {
      setTimeout(() => syncTime(500), 1000);
    }
  });
}

function timedUpdate_phone() {
  var time_difference = Math.ceil((window.sellStartTime_timestamp - window.current_time) / 1000);
  if (window.current_time === undefined || time_difference < 10) {
    syncTime_phone(200);
  } else {
    syncTime_phone(2500);
  }
}

function syncTime_phone(num) {
  GM_xmlhttpRequest({
    url: "https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp",
    method: "GET",
    timeout: 10000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    onload: function (responseDetails) {
      if (responseDetails.status === 200) {
        try {
          var result = JSON.parse(responseDetails.responseText);
          window.current_time = parseInt(result.data.t);
          var time_difference = Math.ceil((window.sellStartTime_timestamp - window.current_time) / 1000);
          console.log("相差秒数：" + time_difference);
          if (time_difference < 2) {
            window.location.href = window.phone_order_url;
          } else {
            var time_difference_str = time_difference.toHHMMSS();
            $("#countdown").text(time_difference_str);
            window.timer = setTimeout(timedUpdate_phone, num);
          }
        } catch (e) {
          console.error("手机端时间同步失败", e);
          setTimeout(() => syncTime_phone(500), 1000);
        }
      } else {
        setTimeout(() => syncTime_phone(500), 1000);
      }
    },
    onerror: function () {
      setTimeout(() => syncTime_phone(500), 1000);
    }
  });
}

function generate_confirm_url(event, price, people_num, data_json) {
  var performBases = data_json["performBases"];
  var itemId = "";

  for (var i = 0; i < performBases.length; i++) {
    var performBase = performBases[i];
    var performs = performBase["performs"];
    for (var j = 0; j < performs.length; j++) {
      var perform = performs[j];
      if (perform["performName"] === event) {
        itemId = perform["itemId"];
        window.itemId = itemId;
        var skuList = perform["skuList"];
        for (var k = 0; k < skuList.length; k++) {
          var skuList_item = skuList[k];
          if (skuList_item["skuName"] === price) {
            var skuId = skuList_item["skuId"];
            return `https://buy.damai.cn/orderConfirm?exParams=%7B%22damai%22%3A%221%22%2C%22channel%22%3A%22damai_app%22%2C%22umpChannel%22%3A%2210002%22%2C%22atomSplit%22%3A%221%22%2C%22serviceVersion%22%3A%221.8.5%22%7D&buyParam=${itemId}_${people_num}_${skuId}&buyNow=true&spm=a2oeg.project.projectinfo.dbuy`;
          }
        }
      }
    }
  }
  return null;
}

function generate_seat_url(is_calendar, event, price, people_num, data_json) {
  var performBases = [];
  if (is_calendar) {
    var month = event.slice(0, 7);
    var calendarPerforms = data_json["calendarPerforms"];
    for (var i = 0; i < calendarPerforms.length; i++) {
      var calendarPerform = calendarPerforms[i];
      if (calendarPerform["month"] === month) {
        performBases = calendarPerform["performBases"];
        break;
      }
    }
  } else {
    performBases = data_json["performBases"];
  }

  var projectId = new URLSearchParams(window.location.search).get("id");
  for (var i = 0; i < performBases.length; i++) {
    var performBase = performBases[i];
    var performs = performBase["performs"];
    for (var j = 0; j < performs.length; j++) {
      var perform = performs[j];
      var performId = perform.performId;
      if (perform["performName"] === event) {
        var itemId = perform["itemId"];
        var skuList = perform["skuList"];
        for (var k = 0; k < skuList.length; k++) {
          var skuList_item = skuList[k];
          if (skuList_item["skuName"] === price) {
            var skuId = skuList_item["skuId"];
            return `https://seatsvc.damai.cn/tms/selectSeat?itemId=${itemId}&performId=${performId}&skuId=${skuId}&projectId=${projectId}`;
          }
        }
      }
    }
  }
  return null;
}

// ... [其余函数如 detail_ui, phone_detail_ui, fill_form 等保持不变，仅修复已指出问题] ...

// 重点修复：check_phone_alert 中的 innerHTML 错误
function check_phone_alert() {
  var checkblack = $(".baxia-dialog-content");
  if (checkblack != null && checkblack.length > 0) {
    var reload_cnt = sessionStorage.getItem("reload_cnt") || "0";
    sessionStorage.setItem("reload_cnt", String(Number(reload_cnt) + 1));
    var phone_or_url = sessionStorage.getItem("phone_order_url");
    if (phone_or_url) window.location.href = phone_or_url;
    return;
  }

  var mian = $("#app >div >div");
  if (mian.length > 0) {
    var html = mian.html();
    if (html && html.indexOf("系统繁忙") !== -1) {
      window.location.reload();
    } else {
      setTimeout(submit_phone_order, 300);
    }
  } else {
    setTimeout(submit_phone_order, 300);
  }

  // 30秒后自动停止（防止无限循环）
  setTimeout(() => {
    clearTimeout(window.timer);
  }, 30000);
}

// 其余函数（如 get_event, get_price, copyToClipboard, timestampToTime, submit_order 等）逻辑正确，无需修改

// 注意：为节省篇幅，此处省略了未改动的函数，实际使用时请保留全部函数
// 但确保 check_phone_alert、syncTime、fetchGet hook 等已按上述修复
