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
      containerWidth: _config.containerWidth || 1200,
      containerHeight: _config.containerHeight || 1000,
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
      .text("Number of Earthquakes per Month 2014 - 2025");

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

      // Remove existing elements
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();
      vis.chart.selectAll(".year-label").remove(); // Remove existing year labels
      vis.circles.remove();
      vis.labels.remove();

      // Update uniqueYears based on new data
      vis.uniqueYears = [...new Set(vis.data.map((d) => d.year))];

      vis.renderVis();

      // If in packed mode, add year labels for the clusters
      if (vis.isPackedMode) {
        vis.addYearLabels();
      }
    }
  }

  addYearLabels() {
    const vis = this;

    // Remove any existing year labels
    vis.chart.selectAll(".year-label").remove();

    // Add year labels for each cluster
    vis.yearLabels = vis.chart
      .selectAll(".year-label")
      .data(Object.entries(vis.clusters))
      .enter()
      .append("text")
      .attr("class", "year-label")
      .attr("text-anchor", "middle")
      .style("font-size", "30px")
      .style("font-weight", "bold")
      .text((d) => d[0]); // d[0] is the year

    // Position labels and make them follow clusters in the simulation
    function updateYearLabels() {
      vis.yearLabels
        .attr("x", (d) => {
          // Find the average x position of all bubbles in this cluster
          const yearBubbles = vis.data.filter((bubble) => bubble.year === d[0]);
          const avgX = d3.mean(yearBubbles, (bubble) => bubble.x);
          return avgX || d[1].x; // Fallback to cluster center if no data
        })
        .attr("y", (d) => {
          // Find the average y position of all bubbles in this cluster
          // Then subtract some space to position above the cluster
          const yearBubbles = vis.data.filter((bubble) => bubble.year === d[0]);
          const avgY = d3.mean(yearBubbles, (bubble) => bubble.y);
          return (avgY || d[1].y) - 40; // Position label above cluster
        });
    }

    // Add the update function to the tick event
    const existingTickFunction = vis.simulation.on("tick");

    vis.simulation.on("tick", () => {
      // Call existing tick function if it exists
      if (existingTickFunction) existingTickFunction();

      // Update label positions
      updateYearLabels();
    });
  }

  renderVis() {
    const vis = this;
    // Create scales
    // Radius scale based on count_of_ref
    vis.rScale = d3
      .scaleSqrt()
      .domain([0, d3.max(vis.data, (d) => d.count_of_ref)])
      .range([5, 40]); // Adjusted range for better visibility

    // Color scale for each uniqueYear
    vis.colorScale = d3
      .scaleOrdinal()
      .domain(vis.uniqueYears)
      .range(
        vis.uniqueYears.map((d, i) =>
          d3.interpolateRainbow(i / vis.uniqueYears.length)
        )
      );

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

      vis.clusters[year] = { x, y };
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
      .style("font-size", "14px")
      .raise(); // ensures labels stay on top of circles

    // Tooltip
    vis.tooltip = d3.select("#tooltip");

    vis.simulation = d3
      .forceSimulation(vis.data)
      .force("cluster", d3.forceX((d) => vis.clusters[d.year].x).strength(0.3))
      .force("y", d3.forceY((d) => vis.clusters[d.year].y).strength(0.3))
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

    // If in packed mode (default), add year labels immediately
    if (vis.isPackedMode) {
      vis.addYearLabels();
    }

    // "Ordered" layout button
    d3.select("#ordered-button").on("click", () => {
      // Stop the simulation
      vis.simulation.stop();
      // Disable all drag events
      vis.isPackedMode = false;

      // Remove the bubble legend and all year labels (ensure complete removal)
      vis.chart.selectAll(".bubble-size-legend").remove();
      vis.chart.selectAll(".year-label").remove();

      let dateDomain = d3.extent(
        vis.data,
        (d) => new Date(d.year, d.month - 1)
      );

      // x-scale based on year
      let xScale = d3.scaleTime().domain(dateDomain).range([0, vis.width]);

      // y-scale based on count_of_ref
      const yScale = d3
        .scaleLinear()
        .domain(d3.extent(vis.data, (d) => d.count_of_ref))
        .clamp(true)
        .range([vis.height, 30]);

      // Remove old axes if any
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();

      // Add new x-axis
      let xAxis = d3
        .axisBottom(xScale)
        .ticks(d3.timeYear.every(1)) // a tick per month
        .tickFormat(d3.timeFormat("%Y")); // format as and year

      vis.chart
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${vis.height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");

      // Add new y-axis
      // Generate dynamic tick values based on the data's extent and a desired tick count
      let yMin = d3.min(vis.data, (d) => d.count_of_ref);
      let yMax = d3.max(vis.data, (d) => d.count_of_ref);
      let tickCount = 8;
      let yAxis = d3
        .axisLeft(yScale)
        .tickValues(d3.ticks(yMin, yMax, tickCount));

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
        // .attr("r", vis.rScale.range()[0])
        .attr("r", 10)
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
              .attr(
                "fill",
                !isSelected ? "var(--selection-color)" : vis.colorScale(d.year)
              );
            vis.config.onBubbleSelect(d.year, d.month);
          });
        });

      vis.labels.transition().duration(300).style("opacity", 0);
    });
    // "Packed" layout button
    d3.select("#packed-button").on("click", () => {
      // Enable drag events
      vis.isPackedMode = true;

      // Remove axes
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();

      // Stop any existing simulation
      vis.simulation.stop();

      // Central force to pull everything toward center
      const centerX = vis.width / 2;
      const centerY = vis.height / 2;

      // First transition: Move all bubbles to the center but with some randomness
      // to prevent perfect overlap which causes intense collision forces
      vis.circles
        .transition()
        .duration(400)
        .attr("cx", (d) => centerX + (Math.random() - 0.5) * 50) // Add slight randomness
        .attr("cy", (d) => centerY + (Math.random() - 0.5) * 50) // Add slight randomness
        .attr("r", (d) => vis.rScale(d.count_of_ref))
        .attr("fill", (d) => vis.colorScale(d.year))
        .on("end", function () {
          // After bubbles have gathered near center, start the force simulation

          // Reset the forces with gentler settings
          vis.simulation
            .force(
              "cluster",
              d3.forceX((d) => vis.clusters[d.year].x).strength(0.1)
            ) // Start with very low strength
            .force("y", d3.forceY((d) => vis.clusters[d.year].y).strength(0.1))
            .force(
              "collide",
              d3
                .forceCollide((d) => vis.rScale(d.count_of_ref) + 2)
                .iterations(3) // More iterations for smoother collision
            )
            .force("center", d3.forceCenter(centerX, centerY).strength(0.05))
            // Add a force to push bubbles below a minimum y threshold
            .force(
              "limit-top",
              d3
                .forceY((d) => {
                  const minY = 40 + vis.rScale(d.count_of_ref);
                  return d.y < minY ? minY : d.y;
                })
                .strength(1)
            )
            .alpha(0.6) // Lower alpha for less energetic motion
            .alphaDecay(0.02) // Slower decay for smoother movement
            .restart();

          // Gradually increase force strength in stages
          setTimeout(() => {
            vis.simulation
              .force(
                "cluster",
                d3.forceX((d) => vis.clusters[d.year].x).strength(0.3)
              )
              .force(
                "y",
                d3.forceY((d) => vis.clusters[d.year].y).strength(0.3)
              )
              .alpha(0.4)
              .restart();
          }, 400);

          setTimeout(() => {
            vis.simulation
              .force(
                "cluster",
                d3.forceX((d) => vis.clusters[d.year].x).strength(0.6)
              )
              .force(
                "y",
                d3.forceY((d) => vis.clusters[d.year].y).strength(0.6)
              )
              .alpha(0.3)
              .restart();
          }, 800);
        });

      // Show labels with delay
      vis.labels
        .transition()
        .delay(600) // Longer delay before showing labels
        .duration(400)
        .style("opacity", 1);

      // Add year labels after transition
      setTimeout(() => {
        // Add year labels
        vis.addYearLabels();

        // Draw the legend
        drawSizeLegend(vis);
      }, 800);
    });
  }
}
