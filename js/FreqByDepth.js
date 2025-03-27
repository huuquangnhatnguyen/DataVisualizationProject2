class DepthChart {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 600,
      containerHeight: _config.containerHeight || 600,
    };
    this.data = _data;
    this.initVis();
  }

  initVis() {
    let vis = this;
    vis.width = vis.config.containerWidth;
    vis.height = vis.config.containerHeight;
    vis.margin = { top: 20, right: 20, bottom: 40, left: 50 };

    // Tooltip
    vis.tooltip = d3.select("#tooltip");

    // Create SVG
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

    // Scales
    vis.xScale = d3
      .scaleLinear()
      .domain([-2, d3.max(vis.data, (d) => d.x1)])
      .range([0, vis.width]);

    vis.yScale = d3
      .scaleLinear()
      .domain([0, d3.max(vis.data, (d) => d.count)])
      .range([vis.height, 0]);

    // Axes
    vis.svg
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(20,${vis.height})`)
      .call(d3.axisBottom(vis.xScale));

    vis.svg
      .append("g")
      .attr("class", "axis y-axis")
      .attr("transform", `translate(20,0)`)
      .call(d3.axisLeft(vis.yScale));

    // Draw bars
    vis.svg
      .selectAll(".bar")
      .data(vis.data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => vis.xScale(d.x0) + 20)
      .attr("width", (d) => vis.xScale(d.x1) - vis.xScale(d.x0) - 1) // -1 for bar spacing
      .attr("y", (d) => vis.yScale(d.count))
      .attr("height", (d) => vis.height - vis.yScale(d.count))
      .attr("fill", "green")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration(150) //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", "purple"); //change the fill
        //Create tool tip
        vis.tooltip.style("opacity", 1).html(
          `<div class="tooltip-label">
              <b>Depth:</b> ${d.x0.toFixed(1)}-${d.x1.toFixed(1)} km <br>
              <b>Count:</b> ${d.count} <br>
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
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration("150") //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", "green"); //change the fill
        vis.tooltip.style("opacity", 0);
      });

    // add axes labels
    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 30)
      .text("Depth (km)");

    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.height / 2)
      .attr("y", -30)
      .text("Count");
  }
  //   updateVis() {} // Optional: For future updates
}
