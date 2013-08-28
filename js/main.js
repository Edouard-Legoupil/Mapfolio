// THIS IS FOR THE IMAGE GALLERY, MAP STUFF START FARTHER DOWN
var windowHeight = $(window).height();
var extentButtons = $("#extentButtons").children();
var sectorButtons = $("#sectorButtons").children();
var visibleExtent = [];
var visibleSectors = [];
var thumbnails = $(".thumbnailGallery").children();

function toggleFilter (filter, element) {
    // steps if a extent filter is clicked
    if($(element).hasClass("btn-extent")){
        // set global var for extent (only 1 at a time)
        visibleExtent = filter;
        // adjust display of checks and Xs
        // has class "filtering" = active
        $.each(extentButtons, function(i, button){
            var buttonid = $(button).attr("id");
            var buttonSpan = $(button).children();            
            if(buttonid === filter){
                $(buttonSpan).removeClass("glyphicon-remove");        
                $(buttonSpan).addClass("glyphicon-ok");
                $(button).addClass("filtering");
            } else {
                $(buttonSpan).removeClass("glyphicon-ok");
                $(buttonSpan).addClass("glyphicon-remove");
                $(button).removeClass("filtering");
            }
        })        
    // steps if sector filter is clicked
    } else {
        if(filter === "refreshSectors"){
            var refreshSectorsSpan = $(element).children();
            $(refreshSectorsSpan).removeClass("glyphicon-remove");
            $(refreshSectorsSpan).addClass("glyphicon-ok");            
            $.each(sectorButtons, function(i,button){
                var buttonSpan = $(button).children();
                $(buttonSpan).removeClass("glyphicon-remove");
                $(buttonSpan).addClass("glyphicon-ok");
                $(button).addClass("filtering");
            })
        } else {
            var thisSpan = $(element).children();
            if($(element).hasClass("filtering")){
                $(element).removeClass("filtering");            
                $(thisSpan).removeClass("glyphicon-ok");
                $(thisSpan).addClass("glyphicon-remove");
                $("#refreshSectors").children().removeClass("glyphicon-ok");
                $("#refreshSectors").children().addClass("glyphicon-remove");
            } else{
                $(element).addClass("filtering");
                $(thisSpan).removeClass("glyphicon-remove");
                $(thisSpan).addClass("glyphicon-ok");   
            } 
        }        
    }
    if($(sectorButtons).children().hasClass("glyphicon-remove") === false){
        $("#refreshSectors").children().removeClass("glyphicon-remove");
        $("#refreshSectors").children().addClass("glyphicon-ok");        
    }

    // check to see what which extent is active (only 1 at a time)
    $.each(extentButtons, function(i, button){
        if($(button).hasClass("filtering")){
            var buttonid = $(button).attr("id");
            visibleExtent = buttonid;
        }
    })
    // check to see what sectors are active
    visibleSectors = [];
    $.each(sectorButtons, function(i, button){        
        if($(button).hasClass("filtering")){
            var buttonid = $(button).attr("id");
            visibleSectors.push(buttonid);
        }
    })
    toggleThumbnails();
}

function toggleThumbnails (){
    $(thumbnails).hide();
    $.each(thumbnails, function(iT, thumbnail){        
        $.each(visibleSectors, function(iS, sector){
            if($(thumbnail).hasClass(sector) && $(thumbnail).hasClass(visibleExtent)){
                $(thumbnail).show();
            }
        })
    })
    markersToMap();
}

function callModal (item) {
	var title = $(item).find('.caption').html();
	$(".modal-title").empty();
	$(".modal-title").append(title);
	
	var thumbSrc = $(item).find('img').attr("src");
	var mapSrc = thumbSrc.replace("_thumb", "");
    var img_maxHeight = (windowHeight*0.60).toString() + "px";
    $(".modal-img").css('max-height', img_maxHeight);
	$(".modal-img").load(function(){
        $(this).unbind('load');
        $(this).attr('src', mapSrc);
    }).attr('src', 'img/loader.gif');	

    var description = $(item).find('.detailedDescription').html();
    $(".modal-detailedDescription").empty();
    $(".modal-detailedDescription").append(description);    
	
	var pdfSrc = "pdf" + mapSrc.substring(3).replace(".png", ".pdf");
	$("#downloadPDF").attr("href", pdfSrc);  

	$('#myModal').modal();
}

//disclaimer text
function showDisclaimer() {
    window.alert("The maps on this page do not imply the expression of any opinion on the part of the American Red Cross concerning the legal status of a territory or of its authorities.");
}

// MAP SHIT STARTS HERE

var centroids = [];
var markersBounds = [];
var displayedPoints = [];
var markers = new L.MarkerClusterGroup();

var countryStyle = {
    color: '#fff',
    weight: 1,
    fillColor: '#d7d7d8',
    fillOpacity: 1,
    clickable: false
};

var centroidOptions = {
    radius: 8,
    fillColor: "#ED1B2E",
    color: "#FFF",
    weight: 2.5,
    opacity: 1,
    fillOpacity: 1
};

var cloudmadeUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var attribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | &copy; <a href="http://redcross.org" title="Red Cross" target="_blank">Red Cross</a> 2013';
var cloudmade = L.tileLayer(cloudmadeUrl, {attribution: attribution});

var map = L.map('map', {   
    zoom: 0,
    scrollWheelZoom: false,
    layers: [cloudmade]
});
cloudmade.setOpacity(0); 

// change display accordingly to the zoom level
function mapDisplay() {
    var remove = {fillOpacity:0, opacity:0}
    var add = {fillOpacity:1, opacity:1}
    map.on('viewreset', function() {
        if (map.getZoom() < 6) {
            cloudmade.setOpacity(0);
            geojson.setStyle(add);
        } else {
            geojson.setStyle(remove);
            cloudmade.setOpacity(1);
        }
    })
}

// on marker click open modal
function centroidClick (e) {
    var thumbnail_id = "#" + e.target.feature.properties.thumbnail_id;    
    if ($(thumbnail_id).hasClass("ONLINE")) {
        url = $(thumbnail_id).find('a').attr('href');
        window.open(url, '_blank');
    } else {
        callModal(thumbnail_id);
    }    
}

// on marker mouseover
function displayName(e) {   
    var target = e.target;
    target.openPopup();   
}
// on marker mouseout
function clearName(e) {    
    var target = e.target;
    target.closePopup();    
}

// beginning of function chain to initialize map
function getWorld() {
    $.ajax({
        type: 'GET',
        url: 'data/worldcountries.json',
        contentType: 'application/json',
        dataType: 'json',
        timeout: 10000,
        success: function(json) {
            worldcountries = json;
            countries = new L.layerGroup().addTo(map);
            geojson = L.geoJson(worldcountries,{
                style: countryStyle
            }).addTo(countries);
            getCentroids();
        },
        error: function(e) {
            console.log(e);
        }
    });
}

function getCentroids() {
    $.ajax({
        type: 'GET',
        url: 'data/centroids.json',
        contentType: 'application/json',
        dataType: 'json',
        timeout: 10000,
        success: function(data) {
            formatCentroids(data);
            mapDisplay();
        },
        error: function(e) {
            console.log(e);
        }
    });
}

function formatCentroids(data){
    $.each(data, function(index, item) {
        latlng = [item.longitude, item.latitude];
        var mapCoord = {
            "type": "Feature",
            "properties": {
                "name": item.name,
                "thumbnail_id": item.thumbnail_id,                                        
            },
            "geometry": {
                "type": "Point",
                "coordinates": latlng
            }
        }
        centroids.push(mapCoord);
    }); 
    markersToMap();
}

function markersToMap(){
    map.removeLayer(markers);
    markers = new L.MarkerClusterGroup({showCoverageOnHover:false, spiderfyDistanceMultiplier:3,});
    idList = [];
    displayedPoints=[];
    // build array of visible thumbnail IDs
    $.each(thumbnails, function (i, thumbnail){
        if($(thumbnail).css("display") !== "none"){
            idList.push($(thumbnail).attr("id"));
        }
    })
    $.each(centroids, function (i, centroid){
        var centroid_id = centroid.properties.thumbnail_id;
        if ($.inArray(centroid_id, idList) !== -1){
            displayedPoints.push(centroid);
        }        
    })    

    marker = L.geoJson(displayedPoints, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, centroidOptions);
        },
        onEachFeature: function(feature, layer) {
            var thumbnail_id = "#" + feature.properties.thumbnail_id;
            var popupContent = $(thumbnail_id).find('.caption').html();
            var popupOptions = {
                'minWidth': 30,
                'offset': [0,-10],
                'closeButton': false,
            }; 
            layer.bindPopup(popupContent, popupOptions);
            layer.on({
                click: centroidClick,
                mouseover: displayName,
                mouseout: clearName,
            });   
        }            
    });
    markers.addLayer(marker);
    markers.addTo(map);
    markersBounds = markers.getBounds();
    markersBounds._northEast.lat += 5;
    markersBounds._northEast.lng += 5;
    markersBounds._southWest.lat -= 5;
    markersBounds._southWest.lat -= 5;
    map.fitBounds(markersBounds);
} 


$(window).resize(function(){    
    map.fitBounds(markersBounds);    
    windowHeight = $(window).height();
})



// reset map bounds using Zoom to Extent button
function zoomOut() {
    map.fitBounds(markersBounds);
}

// tweet popup
$('.twitterpopup').click(function(event) {
    var width  = 575,
        height = 400,
        left   = ($(window).width()  - width)  / 2,
        top    = ($(window).height() - height) / 2,
        url    = this.href,
        opts   = 'status=1' +
                 ',width='  + width  +
                 ',height=' + height +
                 ',top='    + top    +
                 ',left='   + left;

    window.open(url, 'twitter', opts);

    return false;
});

// start function chain to initialize map
getWorld();