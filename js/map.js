class MapVis {
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
    vis.base_layer = L.tileLayer(vis.streetMapUrl, {
      id: "esri-image",
      attribution: vis.streetMapAttr,
      ext: "png",
    });

    vis.theMap = L.map("map2", {
      center: [30, 0],
      zoom: 2,
      layers: [vis.base_layer],
    });

    //if you stopped here, you would just have a map

    //initialize svg for d3 to add to map
    L.svg({ clickable: true }).addTo(vis.theMap); // we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane);
    vis.svg = vis.overlay.select("svg").attr("pointer-events", "auto");

    d3.json(
      "data/PB2002_plates.json" //**** TO DO  switch this to loading the tectonic plates 'data/tectonic-plates.json'
    )
      .then((data) => {
        // Create a D3 path generator that uses Leaflet's projection
        const projectPoint = function (x, y) {
          const point = vis.theMap.latLngToLayerPoint(new L.LatLng(y, x));
          this.stream.point(point.x, point.y);
        };

        // Custom transform for D3's path generator
        const transform = d3.geoTransform({ point: projectPoint });
        const path = d3.geoPath().projection(transform);

        // Draw the tectonic plates
        vis.svg
          .selectAll("path")
          .data(data.features)
          .enter()
          .append("path")
          .attr("d", path)
          .style("fill", "rgba(255, 87, 51, 0.1)") // Very light fill
          .style("stroke", "#FF5733")
          .style("stroke-width", 2)
          .style("cursor", "pointer")
          .attr(
            "class",
            (d) =>
              `plate ${d.properties.PlateName.replace(
                /\s+/g,
                "-"
              ).toLowerCase()}`
          )
          .style("transition", "fill 0.2s, stroke-width 0.2s");
        // Add hover effects
        // .on("mouseover", function (event, d) {
        //   // Highlight the plate area
        //   d3.select(this)
        //     .style("fill", "rgba(255, 195, 0, 0.3)")
        //     .style("stroke-width", 3);

        //   // Show tooltip with plate information
        //   tooltip.transition().duration(200).style("opacity", 0.9);

        //   let plateInfo = d.properties.PlateName || "Unknown Plate";

        //   tooltip
        //     .html(`<strong>${plateInfo}</strong>`)
        //     .style("left", event.pageX + 10 + "px")
        //     .style("top", event.pageY - 30 + "px");
        // })
        // .on("mousemove", function (event) {
        //   // Move tooltip with cursor
        //   tooltip
        //     .style("left", event.pageX + 10 + "px")
        //     .style("top", event.pageY - 30 + "px");
        // })
        // .on("mouseout", function () {
        //   // Restore original styling
        //   d3.select(this)
        //     .style("fill", "rgba(255, 87, 51, 0.1)")
        //     .style("stroke-width", 2);

        //   // Hide tooltip
        //   tooltip.transition().duration(500).style("opacity", 0);
        // });

        // Update function to reposition the SVG overlay when the map view changes
        function resetView() {
          const bounds = path.bounds(data);
          const topLeft = bounds[0];
          const bottomRight = bounds[1];

          svg
            .attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

          g.attr(
            "transform",
            "translate(" + -topLeft[0] + "," + -topLeft[1] + ")"
          );

          // Redraw features
          plates.attr("d", path);
        }

        // Set up map event handlers
        vis.theMap.on("viewreset", resetView);
        vis.theMap.on("moveend", resetView);
        resetView();
      })
      .catch((error) =>
        console.error("Error loading tectonic plates data:", error)
      );

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
  }

  renderVis() {
    let vis = this;

    //not using right now...
  }
}
