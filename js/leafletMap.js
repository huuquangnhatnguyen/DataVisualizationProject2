class LeafletMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
    };
    this.data = _data;
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;
    // console.log(vis.data);
    const extent = d3.extent(
      vis.data.map((d) => {
        // console.log(d.mag);
        return d.mag;
      })
    );
    //ESRI
    vis.esriUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    vis.esriAttr =
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

    //TOPO
    vis.topoUrl = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
    vis.topoAttr =
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

    //Street Map- requires key... so meh...
    vis.streetMapUrl = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
    vis.streetMapAttr =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>';

    //World Physical
    vis.worldPhysicalUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}";
    vis.worldPhysicalAttr =
      "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri";

    //this is the base map layer, where we are showing the map background
    //**** TO DO - try different backgrounds
    vis.base_layer = L.tileLayer(vis.esriUrl, {
      id: "esri-image",
      attribution: vis.esriAttr,
      ext: "png",
    });

    vis.theMap = L.map("my-map", {
      center: [30, 0],
      zoom: 2,
      layers: [vis.base_layer],
    });

    //if you stopped here, you would just have a map

    //initialize svg for d3 to add to map
    L.svg({ clickable: true }).addTo(vis.theMap); // we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane);
    vis.svg = vis.overlay.select("svg").attr("pointer-events", "auto");
    vis.colorScale = d3
      .scaleLinear()
      .range(["#ffc100", "#ff0000"])
      .domain(extent)
      .interpolate(d3.interpolateHcl);
    //these are the city locations, displayed as a set of dots
    vis.Dots = vis.svg
      .selectAll("circle")
      .data(vis.data)
      .join("circle")
      .attr("fill", (d) => vis.colorScale(d.mag))
      //---- TO DO- color by magnitude
      .attr("stroke", "black")

      //Leaflet has to take control of projecting points.
      //Here we are feeding the latitude and longitude coordinates to
      //leaflet so that it can project them on the coordinates of the view.
      //the returned conversion produces an x and y point.
      //We have to select the the desired one using .x or .y
      .attr(
        "cx",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x
      )
      .attr(
        "cy",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y
      )
      .attr("r", (d) => 3) // --- TO DO- want to make radius proportional to earthquake size?
      .on("mouseover", function (event, d) {
        //function to add mouseover event
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration("150") //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", "red") //change the fill
          .attr("r", 4); //change radius

        //create a tool tip
        d3.select("#tooltip")
          .style("opacity", 1)
          .style("z-index", 1000000)
          // Format number with million and thousand separator
          //***** TO DO- change this tooltip to show useful information about the quakes
          .html(
            `<div class="tooltip-label">
            <b>Location:</b> ${d.place} <br>
            <b>Magnitude:</b> ${d.mag} <br>
            <b>Time:</b> ${Date(d.time)} <br>
            <b>Lattitude</b> ${d.latitude} <br>
            <b>Longitude</b> ${d.longitude} <br>
            </div>`
          );
      })
      .on("mousemove", (event) => {
        //position the tooltip
        d3.select("#tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseleave", function () {
        //function to add mouseover event
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration("150") //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", (d) => vis.colorScale(d.mag)) //change the fill  TO DO- change fill again
          .attr("r", 3); //change radius

        d3.select("#tooltip").style("opacity", 0); //turn off the tooltip
      });

    //handler here for updating the map, as you zoom in and out
    vis.theMap.on("zoomend", function () {
      vis.updateVis();
    });
  }

  updateVis(mapBg) {
    let vis = this;

    //want to see how zoomed in you are?
    // console.log(vis.map.getZoom()); //how zoomed am I?
    //----- maybe you want to use the zoom level as a basis for changing the size of the points... ?

    //redraw based on new zoom- need to recalculate on-screen position
    vis.Dots.attr(
      "cx",
      (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x
    )
      .attr(
        "cy",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y
      )
      .attr("fill", (d) => vis.colorScale(d.mag)) //---- TO DO- color by magnitude
      .attr("r", 3);
    if (mapBg) {
      console.log(mapBg);
      //if we are changing the map background, we need to remove the old one and add the new one
      vis.theMap.removeLayer(vis.base_layer);
      if (mapBg == "TOPO") {
        vis.base_layer = L.tileLayer(vis.topoUrl, {
          id: "topo",
          attribution: vis.topoAttr,
        });
      } else if (mapBg == "street") {
        vis.base_layer = L.tileLayer(vis.streetMapAttr, {
          id: "streetMap",
          attribution: vis.streetMapAttr,
          ext: "png",
        });
      } else if (mapBg == "physical") {
        vis.base_layer = L.tileLayer(vis.worldPhysicalUrl, {
          id: "worldPhysical",
          attribution: vis.worldPhysicalAttr,
          ext: "png",
        });
      } else if (mapBg == "ESRI") {
        vis.base_layer = L.tileLayer(vis.esriUrl, {
          id: "esri-image",
          attribution: vis.esriAttr,
          ext: "png",
        });
      }
      vis.theMap.addLayer(vis.base_layer);
    }
  }

  renderVis() {
    let vis = this;

    //not using right now...
  }
}
