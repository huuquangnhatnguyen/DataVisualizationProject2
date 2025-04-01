// Month names array
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

class bubbleChart {
  /**
   * @param {Object} _config
   * @param {Object[]} _data
 
   */
  constructor(_config, _data) {
    // Configuration object
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 800,
      containerHeight: _config.containerHeight || 600,
      margin: _config.margin || { top: 40, right: 20, bottom: 60, left: 60 },
      onBubbleSelect: _config.onBubbleSelect,
    };

    // Data array
    this.data = _data;
    this.uniqueYears = [];

    // Default to Packed Mode
    this.isPackedMode = true;

    // Initialize the visualization
    this.initVis();
  }

  initVis() {
    let vis = this; // Keep a reference to `this` in case we nest functions
    // Define chart dimensions
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.uniqueYears = [...new Set(vis.data.map((d) => d.year))];

    // Select the <svg> element, set its size
    vis.svg = d3
      .select(vis.config.parentElement)
      .attr(
        "width",
        vis.width + vis.config.margin.left + vis.config.margin.right
      )
      .attr(
        "height",
        vis.height + vis.config.margin.top + vis.config.margin.bottom
      );

    vis.svg
      .append("text")
      .attr("class", "chart-title")
      .attr(
        "x",
        (vis.width + vis.config.margin.left + vis.config.margin.right) / 2
      )
      .attr("y", vis.config.margin.top)
      .attr("text-anchor", "middle")
      .style("font-size", "30px")
      .style("font-weight", "bold")
      .text("Number of Earthquakes per Month 2024 - 2025");

    // Append a <g> element that will contain our actual chart
    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left}, ${vis.config.margin.top})`
      );
    vis.renderVis();
    document.addEventListener("dataFilterChange", (event) => {
      const { bubbleData } = event.detail;
      if (bubbleData) {
        // vis.data = filteredData;
        vis.updateVis(bubbleData);
      }
    });
  }

  updateVis(newData) {
    const vis = this;
    if (newData) {
      vis.data = newData;

      // use `.raise()` on the labels to keep them atop the circles
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();
      vis.circles.remove();
      vis.labels.remove();
      vis.renderVis();
    }
  }
  renderVis() {
    const vis = this;
    // Create scales
    // Radius scale based on count_of_ref
    vis.rScale = d3
      .scaleSqrt()
      .domain([0, d3.max(vis.data, (d) => d.count_of_ref)])
      .range([5, 25]);

    // Color scale for each uniqueYear
    vis.colorScale = d3
      .scaleOrdinal()
      .domain(vis.uniqueYears)
      .range(d3.schemeTableau10);
    
    // Create cluster centers for each unique year - MODIFIED to be closer together
    vis.clusters = {};
    const clusterCount = vis.uniqueYears.length;
    
    // Arrange clusters around the center point in a tighter formation
    const centerX = vis.width / 2;
    const centerY = vis.height / 2;
    const radius = Math.min(vis.width, vis.height) / 4; // Smaller radius to keep them closer
    
    vis.uniqueYears.forEach((year, i) => {
      // Position clusters in a circle around the center
      const angle = (i / clusterCount) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      vis.clusters[year] = {x, y};
    });

    // use `.raise()` on the labels to keep them atop the circles
    vis.circles = vis.chart
      .selectAll("circle")
      .data(vis.data)
      .enter()
      .append("circle")
      .attr("r", (d) => vis.rScale(d.count_of_ref))
      .attr("fill", (d) => vis.colorScale(d.year))
      .attr("opacity", 0.7);

    // Add text labels to each bubble
    vis.labels = vis.chart
      .selectAll("text.label")
      .data(vis.data)
      .enter()
      .append("text")
      .attr("class", "label")
      .text((d) => `${MONTH_NAMES[d.month - 1]}`)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style("fill", "#000")
      .style("font-size", "3px")
      .raise(); // ensures labels stay on top of circles

    // Tooltip
    vis.tooltip = d3.select("#tooltip");

    // Center coordinates
    // const centerX = vis.width / 2;
    // const centerY = vis.height / 2;

    // Create force simulation
    // vis.simulation = d3
    //   .forceSimulation(vis.data)
    //   .force("x", d3.forceX(centerX).strength(0.05))
    //   .force("y", d3.forceY(centerY).strength(0.05))
    //   .force(
    //     "collide",
    //     d3.forceCollide((d) => vis.rScale(d.count_of_ref) + 1)
    //   )
    //   .on("tick", ticked);
    
    vis.simulation = d3
      .forceSimulation(vis.data)
      .force("cluster", d3.forceX(d => vis.clusters[d.year].x).strength(0.3))
      .force("y", d3.forceY(d => vis.clusters[d.year].y).strength(0.3))
      .force(
        "collide",
        d3.forceCollide((d) => vis.rScale(d.count_of_ref) + 2)
      )
      .on("tick", ticked);

    // Mouse events
    vis.circles
      .on("mouseover", (event, d) => {
        const monthYear = `${MONTH_NAMES[d.month - 1]} ${d.year}`;
        vis.tooltip
          .style("opacity", 1)
          .html(
            `<strong>${monthYear}</strong><br/>
             <strong>Count:</strong> ${d.count_of_ref}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        vis.tooltip.style("opacity", 0);
      });

    // Drag support
    vis.circles.call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (this.isPackedMode) {
            if (!event.active) vis.simulation.alphaTarget(0.2).restart();
            d.fx = d.x;
            d.fy = d.y;
          }
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) vis.simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // Tick function for the force simulation
    function ticked() {
      vis.circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      vis.labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
    }

    // "Ordered" layout button
    d3.select("#ordered-button").on("click", () => {
      // Stop the simulation
      vis.simulation.stop();
      // Disable all drag events
      vis.isPackedMode = false;

      // Remove the bubble legend
      vis.chart.selectAll(".bubble-size-legend").remove();

      let dateDomain = d3.extent(
        vis.data,
        (d) => new Date(d.year, d.month - 1)
      );

      // x-scale based on year
      let xScale = d3.scaleTime().domain(dateDomain).range([0, vis.width]);

      // y-scale based on count_of_ref
      const yScale = d3
        .scaleLinear()
        .domain([250, 2500]) // hardcoding the domain to ensure consistency
        .clamp(true)
        .range([vis.height, 0]);

      // Remove old axes if any
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();

      // Add new x-axis
      let xAxis = d3
        .axisBottom(xScale)
        .ticks(d3.timeYear.every(1)) // a tick per month
        .tickFormat(d3.timeFormat("%Y")); // format as month and year

      vis.chart
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${vis.height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");

      // Add new y-axis
      let yAxis = d3
        .axisLeft(yScale)
        .tickValues([250, 500, 1000, 1500, 2000, 2500]);

      vis.chart
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -vis.height / 2)
        .attr("y", -40)
        .attr("fill", "#000")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Number of Earthquakes per Month");

      // Update circles position and add click handler
      vis.circles
        .transition()
        .duration(600)
        .attr("cx", (d) => xScale(new Date(d.year, d.month - 1)))
        .attr("r", vis.rScale.range()[0])
        .attr("cy", (d) => yScale(d.count_of_ref))
        .attr("fill", (d) => vis.colorScale(d.year))
        .on("end", function () {
          // Add click handler after transition is complete
          d3.select(this).on("click", function (event, d) {
            event.stopPropagation();

            // Toggle selection
            const isSelected = d3.select(this).classed("selected");
            d3.select(this).classed("selected", !isSelected);

            // Update fill color based on selection
            d3.select(this)
              .transition()
              .duration(200)
              .attr("fill", !isSelected ? "var(--selection-color)" : vis.colorScale(d.year));
            vis.config.onBubbleSelect(d.year, d.month);
          });
        });

      // Update labels position and add click handler
      vis.labels
        .transition()
        .duration(600)
        .attr("x", (d) => xScale(new Date(d.year, d.month - 1)))
        .attr("y", (d) => yScale(d.count_of_ref))
        .on("end", function () {
          // Add click handler after transition is complete
          d3.select(this).on("click", function (event, d) {
            event.stopPropagation();

            // Find and click the corresponding circle
            const circle = vis.circles.filter(
              (circleData) =>
                circleData.year === d.year && circleData.month === d.month
            );
            if (circle.node()) {
              circle.dispatch("click");
            }
          });
        });
    });
    // "Packed" layout button
    d3.select("#packed-button").on("click", () => {
      // Enable drag events
      vis.isPackedMode = true;

      // Remove axes
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();

      // Central force to pull everything toward center
      const centerX = vis.width / 2;
      const centerY = vis.height / 2;

      // Reset the forces to create tight year-based clusters that are pulled together
      vis.simulation
        .force("cluster", d3.forceX(d => vis.clusters[d.year].x).strength(0.6)) // Year-based clustering
        .force("y", d3.forceY(d => vis.clusters[d.year].y).strength(0.6)) // Year-based clustering
        .force(
          "collide",
          d3.forceCollide((d) => vis.rScale(d.count_of_ref) + 0.5) // Minimal padding
        )
        // Add center-pulling force that affects ALL bubbles
        .force("center", d3.forceCenter(centerX, centerY).strength(0.1))
        // Keep the radial force for year-based organization
        .force("group", d3.forceRadial(20, d => vis.clusters[d.year].x, d => vis.clusters[d.year].y).strength(0.3))
        .alpha(1)
        .restart();

      // Transition radius to original mapped sizes
      vis.circles
        .transition()
        .duration(500)
        .attr("r", (d) => vis.rScale(d.count_of_ref))
        .attr("fill", (d) => vis.colorScale(d.year));

      // Add year labels
      vis.chart.selectAll(".year-label").remove();
      Object.entries(vis.clusters).forEach(([year, center]) => {
        vis.chart.append("text")
          .attr("class", "year-label")
          .attr("x", center.x)
          .attr("y", center.y - 30)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text(year);
      });

      // Draw the legend
      drawSizeLegend(vis);
    });
  }
}
