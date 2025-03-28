d3.csv("data/2024-2025.csv") //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
  .then((data) => {
    // console.log("number of items: " + data.length);

    data.forEach((d) => {
      //convert from string to number
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.mag = +d.mag;
      d.date = new Date(d.time);
      d.depth = +d.depth;

      d.start = new Date(d.time);
      d.end = new Date(d.updated);

      // Calculate duration in days
      d.duration = (d.end - d.start) / (1000 * 60 * 60 * 24);
    });

    // Initialize the bubbleChart timeline
    let grouped = d3.rollups(
      data,
      (v) => v.length,
      (d) => d.date.getFullYear(),
      (d) => d.date.getMonth() + 1
    );
    //console.log(grouped);
    let bubbleData = [];
    grouped.forEach(([year, arrMonths]) => {
      arrMonths.forEach(([month, count]) => {
        bubbleData.push({
          year: +year,
          month: +month,
          count_of_ref: count,
        });
      });
    });

    let myBubbleChart = new bubbleChart(
      {
        parentElement: "#bubble-chart",
        containerWidth: 800,
        containerHeight: 700,
        margin: { top: 40, right: 20, bottom: 40, left: 60 },
      },
      bubbleData
    );

    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, data);

    // Create a histogram with 1-unit bins
    const maxMag = d3.max(data, (d) => d.mag);
    const minMag = d3.min(data, (d) => d.mag);
    const magGenHistogram = d3
      .histogram()
      .value((d) => d.mag)
      .thresholds(d3.range(minMag, maxMag + 1, 0.2)); // 1-unit bins

    // Create bins from the data
    const bins = magGenHistogram(data);
    const binnedData = bins.map((bin) => ({
      x0: bin.x0,
      x1: bin.x1,
      count: bin.length,
    }));

    // Pass binnedData to BarChart
    magChart = new MagChart({ parentElement: "#my-mag-chart" }, binnedData);

    // Process depth bins
    const maxDepth = d3.max(data, (d) => d.depth);
    const minDepth = d3.min(data, (d) => d.depth);
    const depthGenBins = d3
      .histogram()
      .value((d) => d.depth)
      .thresholds(d3.range(minDepth, maxDepth, 45)); // 50km bins up to 700km

    const depthBins = depthGenBins(data);
    const depthData = depthBins.map((bin) => ({
      x0: bin.x0,
      x1: bin.x1,
      count: bin.length,
    }));

    depthChart = new DepthChart(
      { parentElement: "#my-depth-chart" },
      depthData
    );

    const maxDuration = d3.max(data, (d) => d.duration);
    const minDuration = d3.min(data, (d) => d.duration);
    const durationGenBins = d3
      .histogram()
      .value((d) => d.duration)
      .thresholds(d3.range(minDuration, maxDuration, 10)); // 1-day bins

    const durationBins = durationGenBins(data);
    const durationData = durationBins.map((bin) => ({
      x0: bin.x0,
      x1: bin.x1,
      count: bin.length,
    }));

    durationChart = new DurationChart(
      { parentElement: "#my-duration-chart" },
      durationData
    );
  })
  .catch((error) => console.error(error));

const mapSelectEventListener = (event) => {
  // Get the selected value from the dropdown
  const selectedValue = event.target.value;
  // console.log(selectedValue);
  // Call the function to update the map with the selected value
  leafletMap.updateVis(selectedValue);
};

document
  .getElementById("map-bg-selector")
  .addEventListener("change", mapSelectEventListener);
