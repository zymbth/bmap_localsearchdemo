$(function() {
	var curCenter = null; // 用户当前位置
	var flag = false;     // 标记地址列表
	var center = "";      // 地图中心点
	var curCity = "";     // 当前城市名

	$(".top-icon-back").on("tap", function(){history.go(-1);});

	var mymap = new BMap.Map("container", {enableMapClick:false});
	mymap.addControl(new BMap.NavigationControl({
		anchor: BMAP_ANCHOR_TOP_RIGHT,
		type: BMAP_NAVIGATION_CONTROL_SMALL
	}));

	/*搜索类配置*/
	var options = {
		onSearchComplete: function(results) {
			if(local.getStatus() == BMAP_STATUS_SUCCESS) {
				var str = "";
				for(var j = 0; j < results.length; j++) {
					for(var i = 0; i < results[j].getCurrentNumPois(); i++) {
						str += `<li data-lng="${results[j].getPoi(i).point.lng}" data-lat="${results[j].getPoi(i).point.lat}" >
									<div class="title">${results[j].getPoi(i).title}</div>
									<div class="address">${results[j].getPoi(i).address || ""}</div>
								</li>`;
					}
				}
				/*渲染检索结果*/
				var ele = flag?$(".addresslist2"):$(".addresslist");
				if(str) ele.html(str);
				else {
					var str = flag?"没有符合地址":"附近没有搜索结果";
					ele.html(str);
				}
			} else {
				if(!flag) $(".addresslist").html("附近没有搜索结果");
			}
		}
	};
	var local = new BMap.LocalSearch(mymap, options); // 搜索类实例
	local.setPageCapacity(30); // 设置每页容量，取值范围：1 - 100. 此值只对下一次检索有效
	var myGeo = new BMap.Geocoder();

	setListeners();

	/*初始中心点为输入坐标*/
	getAddress({"address":"深圳市福田区建业大厦", "location": "114.023061,22.543022"});
	/*初始中心点为当前坐标*/
//	getCurAddress();

	function getAddress(obj){
		if(obj.location && obj.location.length > 0) { // 给定坐标点
			center = new BMap.Point(Number(obj.location.split(",")[0]), Number(obj.location.split(",")[1]));
			mymap.centerAndZoom(center, 14);
			showMap(center);
		} else if(obj.address && obj.address.length > 0) { // 地址转坐标
			myGeo.getPoint(obj.address, function(data){
				center = new BMap.Point(lng, lat);
				mymap.centerAndZoom(center, 14);
				showMap(center);
			});
		}
	}
	
	/*重置map*/
	function showMap(poi) {
		var icon = new BMap.Icon("img/center.png", new BMap.Size(30, 30), {
			anchor: new BMap.Size(15, 30)
		});
		var mk = new BMap.Marker(poi, {icon: icon});
		mymap.clearOverlays();
		mymap.addOverlay(mk);
		myGeo.getLocation(center, function(rs){
			$("ul.center-address li").attr("data-lng",center.lng)
			$("ul.center-address li").attr("data-lat",center.lat)
			$("ul.center-address li .address").text(rs.address);
			if(curCity !== rs.addressComponents.city) {
				curCity = rs.addressComponents.city;
				if($(".current-city").css("visibility") === "hidden") $(".current-city").css("visibility", "visible");
				$(".current-city").text(curCity);
			}
		}, {"poiRadius": 300, "numPois": 10});
		/*百度地图POI行业分类（tag）*/
		/*http://lbsyun.baidu.com/index.php?title=open/dev-res*/
		local.searchNearby(["公司企业","政府机构","购物","生活服务","栋","楼","路","教育培训"], poi, 200);
	}
	function setListeners() {
		/*地址结果列表点击事件*/
		$(document).on("click", ".addresslist>li,.addresslist2>li,.center-address>li", function() {
			var address = $(this).children(".address").text();
			var lng = $(this).attr("data-lng"), lat = $(this).attr("data-lat");
			console.log({"address":address, "location":lng+","+lat});
			alert("address: "+address+"\nlocation: "+lng+","+lat)
		});
		/*地图拖拽*/
		mymap.addEventListener("dragend", function(){
			$("#address").blur();
			center = mymap.getCenter();
			showMap(center);
		});
		/*地图缩放*/
		mymap.addEventListener("zoomend", function(){
			$("#address").blur();
			center = mymap.getCenter();
			showMap(center);
		});
		/*当前定位*/
		$(".current-position").on("click", debounce(function(){
			if(curCenter) {
				mymap.centerAndZoom(curCenter, 14);
				showMap(curCenter);
			} else getCurAddress();
		}, 500));

		/*搜索*/
		$("#address").bind("input propertychange", debounce(function() {
			var inputval = $(this).val();
			if(inputval) {
				flag = true;
				$(".addresslist2").html("");
				var local_city = new BMap.LocalSearch(curCity, options); // 搜索类实例
				local_city.setPageCapacity(50); // 设置每页容量，取值范围：1 - 100. 此值只对下一次检索有效
				local_city.search([inputval], {forceLocal: true});
				$("#background").css("display", "block");
			} else {
				flag = false;
				$("#background").css("display", "none")
			}
		}, 300));
	}
	/*获取当前位置,浏览器定位存在bug，在移动端只能定位到城市级别，需原生辅助定位*/
	function getCurAddress() {
		center = new BMap.Point("114.237859", "22.691859");
		curCenter = center;
		mymap.centerAndZoom(center, 14);
		showMap(center);
//		var geolocation = new BMap.Geolocation();
//		geolocation.getCurrentPosition(function(r){
//			if(this.getStatus() == BMAP_STATUS_SUCCESS){
//			    const convertor = new BMap.Convertor();
//			    convertor.translate([r.point], 1, 5,function(data) {
//			        if(data && data.points && data.points.length>0){
//			            center = data.points[0];
//			            curCenter = center;
//			            mymap.centerAndZoom(center, 14);
//			            showMap(center);
//			        }
//			    });
//			} else {
//				mymap.centerAndZoom("深圳市", 14);
//			}
//		},{enableHighAccuracy: true,timeout:3000})
	}
	/*防抖*/
	function debounce(fn, delay) {
	  var timer
	  return function () {
	    var context = this
	    var args = arguments
	    clearTimeout(timer)
	    timer = setTimeout(function () {
	      fn.apply(context, args)
	    }, delay)
	  }
	}
})
