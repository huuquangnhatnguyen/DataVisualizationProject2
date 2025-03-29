let selectedBins = {
  mag: [],
  depth: [],
};

// Added: bin selection handler
function handleBinSelected(bin, event) {
  const field = bin.field;
  const currentBins = selectedBins[field];
  const newBin = { x0: bin.x0, x1: bin.x1 };

  // Toggle/replace selection based on Shift key
  if (event.shiftKey) {
    const index = currentBins.findIndex(
      (b) => b.x0 === newBin.x0 && b.x1 === newBin.x1
    );
    if (index === -1) {
      currentBins.push(newBin);
    } else {
      currentBins.splice(index, 1);
    }
  } else {
    selectedBins[field] = [newBin];
  }

  // Update charts and map
  if (field === "mag") {
    magChart.updateSelectedBins(selectedBins.mag);
  } else if (field === "depth") {
    depthChart.updateSelectedBins(selectedBins.depth);
  }
  leafletMap.updateVis(null, selectedBins);
}

// Modified: store chart instances
let magChart, depthChart;

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

    // Modified: pass bin selection callback
    magChart = new BarChart({ parentElement: "#my-mag-chart" }, data, {
      field: "mag",
      label: "Magnitude",
      binStep: 0.25,
      color: "steelblue",
      units: "",
      hoverColor: "orange",
      onBinSelected: handleBinSelected,
    });

    depthChart = new BarChart({ parentElement: "#my-mag-chart" }, data, {
      field: "depth", // Use depth for the depth chart
      label: "Depth (km)", // Label for depth chart
      binStep: 25,
      color: "Green",
      units: "",
      hoverColor: "purple",
      onBinSelected: handleBinSelected,
    });

    const mapSelectEventListener = (event) => {
      // Get the selected value from the dropdown
      const selectedValue = event.target.value;
      // console.log(selectedValue);
      // Call the function to update the map with the selected value
      leafletMap.updateVis(selectedValue);
    };

    function handleBinSelection(field, x0, x1, isSelected) {
      const bin = { field, x0, x1 };
      if (isSelected) {
        selectedBins.push(bin);
      } else {
        selectedBins = selectedBins.filter(
          (b) => !(b.field === field && b.x0 === x0 && b.x1 === x1)
        );
      }

      const filteredData = filterData(selectedBins, data);

      // Update other visualizations
      myBubbleChart.updateVis(filteredData);
      leafletMap.updateVis(null, filteredData);
      magChart.updateBarColors();
      depthChart.updateBarColors();

      // Update depth and mag charts with filtered data from other fields
      if (field === "mag") {
        depthChart.updateData(filteredData);
      } else {
        magChart.updateData(filteredData);
      }
    }

    function filterData(selectedBins, data) {
      const groupedByField = selectedBins.reduce((acc, bin) => {
        if (!acc[bin.field]) acc[bin.field] = [];
        acc[bin.field].push(bin);
        return acc;
      }, {});

      return data.filter((d) =>
        Object.entries(groupedByField).every(([field, bins]) =>
          bins.some((bin) => d[field] >= bin.x0 && d[field] < bin.x1)
        )
      );
    }

    // Added: Reset filters function
    function resetFilters() {
      // Clear all selected bins
      selectedBins = {
        mag: [],
        depth: [],
      };

      // Update charts
      magChart.updateSelectedBins([]);
      depthChart.updateSelectedBins([]);

      // Update map with full opacity
      leafletMap.updateVis(null, selectedBins);
    }

    // Added: Event listener for reset button
    document
      .getElementById("reset-button")
      .addEventListener("click", resetFilters);
  });

document
  .getElementById("map-bg-selector")
  .addEventListener("change", mapSelectEventListener);
