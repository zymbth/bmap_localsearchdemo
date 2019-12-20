$(function() {
	var curCenter = null; // 用户当前位置
	mui.init();
	mui('.mui-scroll-wrapper').scroll({
		scrollY: true, //是否竖向滚动
		scrollX: false, //是否横向滚动
		startX: 0, //初始化时滚动至x
		startY: 0, //初始化时滚动至y
		indicators: true, //是否显示滚动条
		deceleration:0.0006, //阻尼系数,系数越小滑动越灵敏
		bounce: true //是否启用回弹
	});
	var posiInfo = {};
	var flag = false, center = "", lng = "", lat = "", curCity = "", resultList = [];
	var mymap = null;

	$(".top-icon-back").on("tap", function(){history.go(-1);});

	mymap = new BMap.Map("container", {enableMapClick:false});
	var size = new BMap.Size(10, window.innerHeight*0.73-window.innerWidth*0.6/7.5);
	mymap.addControl(new BMap.NavigationControl({
		anchor: BMAP_ANCHOR_TOP_RIGHT,
		offset: size,
		type: BMAP_NAVIGATION_CONTROL_SMALL
	}));

	/*搜索类配置*/
	var options = {
		onSearchComplete: function(results) {
			$(".mui-loading").css("display", "none");
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
				var ele = flag?$(".addresslist2"):$(".addresslist");
				if(str) ele.html(str);
				else {
					var str = flag?"没有符合地址":"附近没有搜索结果";
					ele.html(str);
				}
				if(!flag) mui('.addresslist-container').scroll().setTranslate(0, 0);
				else mui('#background').scroll().setTranslate(0, 0);
			} else {
				if(!flag) $(".addresslist").html("附近没有搜索结果");
			}
		}
	};
	var local = new BMap.LocalSearch(mymap, options); // 搜索类实例
	local.setPageCapacity(30); // 设置每页容量，取值范围：1 - 100. 此值只对下一次检索有效

	publicLisenters();

	/*初始中心点为输入坐标*/
	getAddress({"address":"深圳建业大厦", "location": "114.023061,22.543022"});
	/*初始中心点为当前坐标*/
//	getCurAddress1();

	function getAddress(obj){
		if(obj.location && obj.location.length > 0) {
			lng = Number(obj.location.split(",")[0]);
			lat = Number(obj.location.split(",")[1]);
			center = new BMap.Point(lng, lat);
			mymap.centerAndZoom(center, 14);
			showMap(center);
		} else if(obj.address && obj.address.length > 0) { // 地址转坐标
			var myGeo = new BMap.Geocoder();
			myGeo.getPoint(obj.address, function(data){
				lng = data.lng;
				lat = data.lat;
				center = new BMap.Point(lng, lat);
				mymap.centerAndZoom(center, 14);
				showMap(center);
			});
		}
	}
	function showMap(poi) { // 重置map
		var icon = new BMap.Icon("../assets/img/map_center_overlay.png", new BMap.Size(36, 36), {
			anchor: new BMap.Size(18, 36)
		});
		var mk = new BMap.Marker(poi, {icon: icon});
//		var mk = new centerPointOverlay(poi, 0.48, "img/center_overlay.png");
		mymap.clearOverlays();
		mymap.addOverlay(mk);
		/*百度地图POI行业分类（tag）*/
		/*http://lbsyun.baidu.com/index.php?title=open/dev-res*/
		local.searchNearby(["房地产","公司企业","政府机构","购物","教育培训","生活服务","栋","楼","号"], poi, 200);
		getCurCity(poi);
	}
	function publicLisenters() {
		/*点击返回*/
		$(document).on("tap", ".addresslist>li,.addresslist2>li", function() {
			var address = $(this).children(".address").html();
			lng = $(this).attr("data-lng");
			lat = $(this).attr("data-lat");
			var locations = lng + "," + lat;
			posiInfo.address = address;
			posiInfo.location = locations;
			sessionStorage.setItem("address_info", JSON.stringify(posiInfo));
			history.go(-1);
		});
		mymap.addEventListener("dragend", function(){ // 地图拖拽
			$(".mui-loading").css("display", "block");
			$("#address").blur();
			center = mymap.getCenter();
			showMap(center);
		});
		mymap.addEventListener("zoomend", function(){ // 地图缩放
			$("#address").blur();
			center = mymap.getCenter();
			showMap(center);
		});
		mymap.addEventListener("tap", function(){ $("#address").blur();});
		$(".current-position").on("tap", function(){
			getCurPosition();
		});
		/*搜索*/
		$("#address").bind("input propertychange", debounce(function() {
			var inputval = $(this).val();
			if(inputval) {
				flag = true;
				$(".addresslist2").html("");
				var local_city = new BMap.LocalSearch(curCity, options); // 搜索类实例
				local_city.setPageCapacity(50); // 设置每页容量，取值范围：1 - 100. 此值只对下一次检索有效
				local_city.search([inputval], {forceLocal: true});
				$("#background").css("display", "block")
			} else {
				flag = false;
				$("#background").css("display", "none")
			}
		}, 300));
	}
	/*获取当前定位*/
	function getCurPosition() {
		if(curCenter) {
			mymap.centerAndZoom(curCenter, 14);
			showMap(curCenter);
		}
		else getCurAddress1();
	}
	/*当前城市*/
	function getCurCity(poi) {
		var gc = new BMap.Geocoder();
		gc.getLocation(poi, function(rs){
			if(curCity !== rs.addressComponents.city) {
				curCity = rs.addressComponents.city;
				if($(".current-city").css("visibility") === "hidden") $(".current-city").css("visibility", "visible");
				$(".current-city").text(curCity);
			}
		});
	}
	/*获取当前位置,浏览器定位存在bug*/
	function getCurAddress() {
		var geolocation = new BMap.Geolocation();
		geolocation.getCurrentPosition(function(r){
			console.log(r)
			if(this.getStatus() == BMAP_STATUS_SUCCESS){
			    const convertor = new BMap.Convertor();
			    convertor.translate([r.point], 1, 5,function(data) {
			        if(data && data.points && data.points.length>0){
			            lng = data.points[0].lng;
			            lat = data.points[0].lat;
			            center = data.points[0];
			            curCenter = center;
			            mymap.centerAndZoom(center, 14);
			            showMap(center);
			        }
			    });
			} else {
				mui.toast('定位当前位置失败');
				mymap.centerAndZoom("深圳市", 14);
			}
		},{enableHighAccuracy: true,timeout:3000})
	}
	function getCurAddress1() {
//		调试
		lng = "114.237859";
		lat = "22.691859";
		center = new BMap.Point(lng, lat);
		curCenter = center;
		mymap.centerAndZoom(center, 14);
		showMap(center);
	}
})
