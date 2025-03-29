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

    new BarChart({ parentElement: "#my-mag-chart" }, data, {
      field: "mag",
      label: "Magnitude",
      binStep: 0.25,
      color: "steelblue",
      units: "",
      hoverColor: "orange",
    });

    // For depth chart
    new BarChart({ parentElement: "#my-depth-chart" }, data, {
      field: "depth",
      label: "Depth",
      binStep: 50,
      color: "green",
      units: " km",
      hoverColor: "purple",
    });
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
