class LeafletMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      onHoverHandler: _config.onHoverHandler,
    };
    this.data = _data;
    this.hoverSet = new Set();
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
    vis.streetMapUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
    vis.streetMapAttr =
      "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012";

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
      center: [10, 0],
      zoom: 1.2,
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
    vis.renderDots(vis.data);
    //handler here for updating the map, as you zoom in and out
    vis.theMap.on("zoomend", function () {
      vis.updateVis();
      // vis.updateFilter(vis.selectedBins);
    });

    // Add event listener for bubble selection

    document.addEventListener("dataFilterChange", (event) => {
      const { filteredData, enableHoverEffect = false } = event.detail;
      if (filteredData) {
        // vis.data = filteredData;
        vis.renderDots(filteredData);
      }
      if (enableHoverEffect) {
        vis.enableHoverEffect = true;
      }
    });
  }

  updateVis(mapBg) {
    let vis = this;

    //want to see how zoomed in you are?
    // console.log(vis.map.getZoom()); //how zoomed am I?
    //----- maybe you want to use the zoom level as a basis for changing the size of the points... ?

    //redraw based on new zoom- need to recalculate on-screen position
    vis.renderDots(vis.data);
    // Update opacity and size based on selection
    // vis.updateMapDots();
    // Update map background if specified
    if (mapBg) {
      //if we are changing the map background, we need to remove the old one and add the new one
      vis.theMap.removeLayer(vis.base_layer);
      if (mapBg == "TOPO") {
        vis.base_layer = L.tileLayer(vis.topoUrl, {
          id: "topo",
          attribution: vis.topoAttr,
        });
      } else if (mapBg == "street") {
        vis.base_layer = L.tileLayer(vis.streetMapUrl, {
          id: "streetMap",
          attribution: vis.streetMapAttr,
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

  renderDots(newData) {
    let vis = this;
    vis.data = newData;
    vis.Dots = vis.svg
      .selectAll("circle")
      .data(vis.data, (d) => d.id)
      .join("circle")
      .attr("fill", (d) => vis.colorScale(d.mag))
      .attr("stroke", "black")
      .attr("data-date", (d) => d.date.toLocaleDateString())
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
        const hoveredDate = d.date;
        const previousDate = new Date(
          hoveredDate.getFullYear(),
          hoveredDate.getMonth(),
          hoveredDate.getDate() - 1
        );
        const nextDate = new Date(
          hoveredDate.getFullYear(),
          hoveredDate.getMonth(),
          hoveredDate.getDate() + 1
        );
        vis.svg.selectAll("circle").classed("dimmed", true);

        // Then highlight only the points from the same date
        vis.svg
          .selectAll(`circle[data-date='${hoveredDate.toLocaleDateString()}']`)
          .classed("dimmed", false)
          .classed("sameDate", true);
        vis.svg
          .selectAll(`circle[data-date='${previousDate.toLocaleDateString()}']`)
          .classed("dimmed", false)
          .classed("prevDate", true);
        vis.svg
          .selectAll(`circle[data-date='${nextDate.toLocaleDateString()}']`)
          .classed("dimmed", false)
          .classed("nextDate", true);

        d3.select("#tooltip") //create a tool tip
          .style("opacity", 1)
          .style("z-index", 1000000)
          // Format number with million and thousand separator
          //***** TO DO- change this tooltip to show useful information about the quakes
          .html(
            `<div class="tooltip-label">
            <b>Location:</b> ${d.place} <br>
            <b>Magnitude:</b> ${d.mag} <br>
            <b>Depth:</b> ${d.depth} km <br>
            <b>Time:</b> ${d.time} <br>
            <b>Lattitude</b> ${d.latitude} <br>
            <b>Longitude</b> ${d.longitude} <br>
            </div>`
          );
        // vis.config.onHoverHandler(d.time);
        // vis.hoverDotEffect();
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

        vis.svg
          .selectAll("circle")
          .classed("dimmed", false)
          .classed("sameDate", false)
          .classed("prevDate", false)
          .classed("nextDate", false);

        d3.select("#tooltip").style("opacity", 0); //turn off the tooltip
      });

    //handler here for updating the map, as you zoom in and out
    vis.theMap.on("zoomend", function () {
      vis.updateVis();
      // vis.updateFilter(vis.selectedBins);
    });
  }
  renderVis() {
    let vis = this;

    //not using right now...
  }

  // Update the visualization with new data
  updateData(newData) {
    this.data = newData;
    this.updateVis();
  }

  // Update the visualization based on a time filter
  updateTimeFilter(currentDate) {
    let vis = this;

    vis.Dots = vis.svg
      .selectAll("circle")
      .data(vis.data, (d) => d.id) // Add unique key based on earthquake ID
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("fill", (d) => vis.colorScale(d.mag))
            .attr("stroke", "black")
            .attr("r", 0)
            .call((enter) =>
              enter
                .transition()
                .duration(500)
                .attr("r", (d) => (d.date <= currentDate ? 3 : 0))
            ),
        (update) =>
          update
            .attr("opacity", (d) => (d.date <= currentDate ? 1 : 0))
            .attr("r", (d) => (d.date <= currentDate ? 3 : 0)),
        (exit) => exit.remove()
      );

    vis.updateVis();
  }
}
