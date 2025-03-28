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
    };

    // Data array
    this.data = _data;

    // Initialize the visualization
    this.initVis();
  }

  initVis() {
    let vis = this; // Keep a reference to `this` in case we nest functions

    // Month names array
    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const uniqueYears = [...new Set(vis.data.map(d => d.year))];
    const uniqueMonths = [...new Set(vis.data.map(d => d.month))];
    
    // Define chart dimensions
    vis.width  = vis.config.containerWidth  - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top  - vis.config.margin.bottom;

    // Select the <svg> element, set its size
    vis.svg = d3.select(vis.config.parentElement)
      .attr("width",  vis.width  + vis.config.margin.left + vis.config.margin.right)
      .attr("height", vis.height + vis.config.margin.top  + vis.config.margin.bottom);

      vis.svg.append("text")
      .attr("class", "chart-title")
      .attr("x", (vis.width + vis.config.margin.left + vis.config.margin.right) / 2)
      .attr("y", vis.config.margin.top) 
      .attr("text-anchor", "middle")
      .style("font-size", "30px")
      .style("font-weight", "bold")
      .text("Number of Earthquakes per Month 2024 - 2025");

    // Append a <g> element that will contain our actual chart
    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

    // Create scales
    // Radius scale based on count_of_ref
    vis.rScale = d3.scaleSqrt()
      .domain([0, d3.max(vis.data, d => d.count_of_ref)])
      .range([5, 50]);

    // Color scale for each uniqueYear
    vis.colorScale = d3.scaleOrdinal()
      .domain(uniqueYears)
      .range(d3.schemeTableau10); 

    // use `.raise()` on the labels to keep them atop the circles
    vis.circles = vis.chart.selectAll("circle")
      .data(vis.data)
      .enter()
      .append("circle")
        .attr("r", d => vis.rScale(d.count_of_ref))
        .attr("fill", d => vis.colorScale(d.year))
        .attr("opacity", 0.7);

    // Add text labels to each bubble
    vis.labels = vis.chart.selectAll("text.label")
      .data(vis.data)
      .enter()
      .append("text")
        .attr("class", "label")
        .text(d => `${MONTH_NAMES[d.month - 1]} ${d.year}`)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .style("fill", "#000")
        .style("font-size", "12px")
        .raise(); // ensures labels stay on top of circles

    // Tooltip
    vis.tooltip = d3.select("#tooltip");

    // Center coordinates
    const centerX = vis.width  / 2;
    const centerY = vis.height / 2;

    // Create force simulation
    vis.simulation = d3.forceSimulation(vis.data)
      .force("x", d3.forceX(centerX).strength(0.05))
      .force("y", d3.forceY(centerY).strength(0.05))
      .force("collide", d3.forceCollide(d => vis.rScale(d.count_of_ref) + 1))
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
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 28) + "px");
      })
      .on("mousemove", event => {
        vis.tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        vis.tooltip
          .style("opacity", 0);
      });

    // Drag support
    vis.circles.call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) vis.simulation.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
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
      vis.circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      vis.labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    }

    // "Ordered" layout button
    d3.select("#ordered-button").on("click", () => {
      
    // Remove the bubble legend
    vis.chart.selectAll(".bubble-size-legend").remove();
    let dateDomain = d3.extent(vis.data, d => new Date(d.year, d.month - 1));

      // x-scale based on year
      let xScale = d3.scaleTime()
    .domain(dateDomain)
    .range([0, vis.width]);

      // y-scale based on count_of_ref
      const yScale = d3.scaleLinear()
        .domain([0, d3.max(vis.data, d => d.count_of_ref)])
        .range([vis.height, 0])
        .nice();

      // Remove old axes if any
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();

      // Add new x-axis
      let xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeMonth.every(1))                // a tick per month
        .tickFormat(d3.timeFormat("%b %Y")); // format as month and year

      vis.chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${vis.height})`)
        .call(xAxis)
        .selectAll("text")
          .attr("transform", "rotate(45)")
          .style("text-anchor", "start");

      // Add new y-axis
      vis.chart.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).ticks(5))
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -vis.height / 2)
          .attr("y", -40)
          .attr("fill", "#000")
          .style("font-size", "14px")
          .style("text-anchor", "middle")
          .text("Number of Earthquakes per Month");

      // Update forces to arrange circles by year & ref count
      vis.simulation
      .force("x", d3.forceX(d => xScale(new Date(d.year, d.month - 1))).strength(0.08))
      .force("y", d3.forceY(d => yScale(d.count_of_ref)).strength(0.07))
      .alpha(1) // re-heat the simulation
      .restart();

      // Transition radius to a smaller uniform size, just as an example
      vis.circles.transition()
        .duration(500)
        .attr("r", d => vis.rScale(d.count_of_ref))
        .attr("fill", d => vis.colorScale(d.year));
    });

    // "Packed" layout button
    d3.select("#packed-button").on("click", () => {
      // Remove axes
      vis.chart.selectAll(".x-axis").remove();
      vis.chart.selectAll(".y-axis").remove();

      // Reset the forces to center
      vis.simulation
        .force("x", d3.forceX(centerX).strength(0.05))
        .force("y", d3.forceY(centerY).strength(0.05))
        .alpha(1).restart();

      // Transition radius to original mapped sizes
      vis.circles.transition()
        .duration(500)
        .attr("r", d => vis.rScale(d.count_of_ref))
        .attr("fill", d => vis.colorScale(d.year));
      
      // Draw the legend
    drawSizeLegend(vis);
    });
  }

  updateVis() {
    
  }
}