class BarChart {
  /**
   * @param {Object} config - Chart configuration
   * @param {Array} rawData - Raw CSV data
   * @param {Object} options - Visualization options
   */
  constructor(config, rawData, options = {}) {
    this.config = {
      parentElement: config.parentElement,
      containerWidth: config.containerWidth || 300,
      containerHeight: config.containerHeight || 300,
      margin: { top: 20, right: 20, bottom: 40, left: 50 },
      field: options.field || "mag",
      label: options.label || "Magnitude",
      color: options.color || "steelblue",
      binStep: options.binStep || 0.5,
      units: options.units || "",
      hoverColor: options.hoverColor || "var(--selection-color)",
      onBinSelected: options.onBinSelected || null, // Added: callback for bin selection
    };
    this.rawData = rawData;
    this.selectedBins = []; // Added: track selected bins
    this.initVis();
  }

  initVis() {
    const vis = this;

    // Process raw data into bins
    vis.processData();

    // Set up dimensions
    vis.setupDimensions();

    // Create visualization elements
    vis.createScales();
    vis.drawAxes();
    vis.drawBars();
    vis.addLabels();
    document.addEventListener("dataFilterChange", (event) => {
      const { filteredData, changeFlag = 1 } = event.detail;
      if (filteredData && changeFlag) {
        // vis.data = filteredData;
        vis.updateVis(filteredData);
      }
    });
  }

  processData() {
    const vis = this;

    // Extract values from specified field
    const values = vis.rawData.map((d) => +d[vis.config.field]);

    // Create histogram generator
    vis.histogram = d3
      .histogram()
      .value((d) => d)
      .thresholds(
        d3.range(
          d3.min(values),
          d3.max(values) + vis.config.binStep,
          vis.config.binStep
        )
      );

    // Generate bins
    vis.bins = vis.histogram(values);

    // Format for chart
    vis.data = vis.bins.map((bin) => ({
      x0: bin.x0,
      x1: bin.x1,
      count: bin.length,
    }));
  }

  setupDimensions() {
    const vis = this;

    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr(
        "width",
        vis.width + vis.config.margin.left + vis.config.margin.right
      )
      .attr(
        "height",
        vis.height + vis.config.margin.top + vis.config.margin.bottom
      )
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );
  }

  createScales() {
    const vis = this;

    vis.xScale = d3
      .scaleLinear()
      .domain([d3.min(vis.data, (d) => d.x0), d3.max(vis.data, (d) => d.x1)])
      .range([0, vis.width]);

    vis.yScale = d3
      .scaleLinear()
      .domain([0, d3.max(vis.data, (d) => d.count)])
      .range([vis.height, 0]);
  }

  drawAxes() {
    const vis = this;

    // X-axis
    vis.xAxis = vis.svg
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(10,${vis.height})`)
      .call(d3.axisBottom(vis.xScale));

    // Y-axis
    vis.yAxis = vis.svg
      .append("g")
      .attr("class", "axis y-axis")
      .attr("transform", "translate(10,0)") // Adjust for x-axis offset
      .call(d3.axisLeft(vis.yScale));
  }

  drawBars() {
    const vis = this;

    vis.bar = vis.svg
      .selectAll(".bar")
      .data(vis.data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => vis.xScale(d.x0) + 10)
      .attr("width", (d) =>
        Math.max(0, vis.xScale(d.x1) - vis.xScale(d.x0) - 1)
      )
      .attr("y", (d) => vis.yScale(d.count))
      .attr("height", (d) => vis.height - vis.yScale(d.count))
      .attr("fill", (d) => {
        // Modified: check if bin is selected
        return vis.selectedBins.some((b) => b.x0 === d.x0 && b.x1 === d.x1)
          ? vis.config.hoverColor
          : vis.config.color;
      })
      .on("mouseover", function (event, d) {
        // Modified: only change color if not selected
        if (!vis.selectedBins.some((b) => b.x0 === d.x0 && b.x1 === d.x1)) {
          d3.select(this).attr("fill", vis.config.hoverColor);
        }
        vis.showTooltip(event, d);
      })
      .on("mouseout", function (event, d) {
        // Modified: only revert if not selected
        if (!vis.selectedBins.some((b) => b.x0 === d.x0 && b.x1 === d.x1)) {
          d3.select(this).attr("fill", vis.config.color);
        }
        vis.hideTooltip();
      })
      .on("mousemove", (event) => {
        d3.select("#tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("click", function (event, d) {
        // Added: click handler for bin selection
        if (vis.config.onBinSelected) {
          vis.config.onBinSelected(
            {
              field: vis.config.field,
              x0: d.x0,
              x1: d.x1,
            },
            event
          );
        }
      });
  }

  // Modified updateSelectedBins to handle empty arrays better
  updateSelectedBins(selectedBins = []) {
    // Added default parameter
    const vis = this;
    vis.selectedBins = selectedBins;
    vis.bar = vis.svg
      .selectAll(".bar")
      .attr("fill", (d) =>
        selectedBins.some((b) => b.x0 === d.x0 && b.x1 === d.x1)
          ? vis.config.hoverColor
          : vis.config.color
      );
  }

  showTooltip(event, d) {
    const vis = this;
    const tooltipContent = `
          <strong>${vis.config.label}:</strong> ${d.x0.toFixed(
      1
    )}-${d.x1.toFixed(1)}${vis.config.units}<br>
          <strong>Count:</strong> ${d.count}
        `;

    d3.select("#tooltip")
      .style("opacity", 1)
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY - 28}px`)
      .html(tooltipContent);
  }

  hideTooltip() {
    d3.select("#tooltip").style("opacity", 0);
  }

  addLabels() {
    const vis = this;

    // X-axis label
    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 35)
      .text(`${vis.config.label} ${vis.config.units}`);

    // Y-axis label
    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.height / 2)
      .attr("y", -35)
      .text("Count");
  }
  updateVis(newData) {
    const vis = this;
    vis.rawData = newData;
    // vis.svg.remove();
    vis.bar.remove();
    vis.xAxis.remove();
    vis.yAxis.remove();

    vis.processData();

    // Set up dimensions
    // vis.setupDimensions();

    // Create visualization elements
    vis.createScales();
    vis.drawAxes();
    vis.drawBars();
    vis.addLabels();
  }
}
