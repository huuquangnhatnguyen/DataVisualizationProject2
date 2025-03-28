function drawSizeLegend(vis) {
  // 1) Use a fixed array of legend values (largest first if you want them behind smaller circles):
  const legendValues = [2000, 1500, 1000, 500, 100];

  // 2) Create a legend group
  const legendGroup = vis.chart.append("g")
    .attr("class", "bubble-size-legend")
    .attr("transform", `translate(${vis.width - 70}, 180)`);

  // 3) One <g> per circle+label
  const circleGroups = legendGroup.selectAll(".legend-circle-group")
    .data(legendValues)
    .enter()
    .append("g")
    .attr("class", "legend-circle-group");

  // 4) Each circle’s bottom sits at y=0 => center is at -radius
  circleGroups.append("circle")
    .attr("cx", 0)
    .attr("cy", d => -vis.rScale(d))
    .attr("r", d => vis.rScale(d))
    .style("fill", "none")
    .style("stroke", "#666");

  // 5) Label each circle near the top
  circleGroups.append("text")
    .attr("text-anchor", "middle")
    .attr("x", 0)
    .attr("y", d => -2 * vis.rScale(d))
    .attr("dy", "-0.5em")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .style("fill", "#666")
    .text(d => d3.format(".0f")(d));
}
