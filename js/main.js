let selectedBins = {
  mag: [],
  depth: [],
};

// Add at the top with other global variables
let isPlaying = false;
let animationInterval;
let timeExtent;

function createBubbleChartData(data) {
  let bubbleData = [];
  let grouped = d3.rollups(
    data,
    (v) => v.length,
    (d) => d.date.getFullYear(),
    (d) => d.date.getMonth() + 1
  );
  grouped.forEach(([year, arrMonths]) => {
    arrMonths.forEach(([month, count]) => {
      bubbleData.push({
        year: +year,
        month: +month,
        count_of_ref: count,
      });
    });
  });
  return bubbleData;
}

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

  // event created to change map dot due to bin change
  const binChangeEvent = new CustomEvent("binChange", {
    detail: {
      selectedBins: selectedBins,
    },
  });
  document.dispatchEvent(binChangeEvent);
}

function filterDataByContinent(data, continent) {
  if (!continent) return data; // No filtering
  return data.filter((d) => d.Continent === continent);
}

const mapSelectEventListener = (event) => {
  // Get the selected value from the dropdown
  const selectedValue = event.target.value;
  leafletMap.updateVis(selectedValue);
};

// Modified: store chart instances
let magChart, depthChart;

d3.csv("data/2024-2025.csv") //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
  .then((data) => {
    // console.log("number of items: " + data.length);

    data.forEach((d, i) => {
      //convert from string to number
      d.id = i;
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.mag = +d.mag;
      d.date = new Date(d.time);
      d.depth = +d.depth;
    });

    // As things stand, the time will be from the most recent to the oldest, which is not ideal for a timeline slider. We will reverse the order of the data to have the oldest date first. This will make the timeline more intuitive for users.
    // This will also make the timeline slider start from the oldest date to the most recent date.
    data.sort((a, b) => a.date - b.date); // Sort by date ascending
    timeExtent = d3.extent(data, (d) => d.date);
    const slider = d3.select("#timeline-slider");
    const timeDisplay = d3.select("#time-display");

    slider
      .attr("min", 0)
      .attr("max", data.length - 1)
      .on("input", function () {
        updateVisualizations(+this.value);
      });

    // Function to update visualizations based on the time slider value
    d3.select("#play-button").on("click", function () {
      isPlaying = !isPlaying;
      this.textContent = isPlaying ? "Pause" : "Play";

      // If the play button is clicked, we toggle the isPlaying state
      if (isPlaying) {
        animationInterval = setInterval(() => {
          // Check if the current value of the slider is less than the max value
          const currentValue = +slider.property("value");

          // If the current value is less than the max value, increment it by 100 (or whatever step you want)
          const newValue =
            currentValue < data.length - 1 ? currentValue + 100 : 0;
          slider.property("value", newValue).dispatch("input");
        }, 100);
      } else {
        clearInterval(animationInterval);
      }
    });

    // Initialize the bubbleChart timeline
    // let grouped = d3.rollups(
    //   data,
    //   (v) => v.length,
    //   (d) => d.date.getFullYear(),
    //   (d) => d.date.getMonth() + 1
    // );
    //console.log(grouped);
    let bubbleData = createBubbleChartData(data);
    // grouped.forEach(([year, arrMonths]) => {
    //   arrMonths.forEach(([month, count]) => {
    //     bubbleData.push({
    //       year: +year,
    //       month: +month,
    //       count_of_ref: count,
    //     });
    //   });
    // });

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
    // map = new MapVis({ parentElement: "#map2" }, data);

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

    // filter data by continent
    const handleContinentChange = (event) => {
      const selectedContinent = event.target.value;
      // Update map with the selected continent
      const dataByContinent = filterDataByContinent(data, selectedContinent);
      const updatedBubbleData = createBubbleChartData(dataByContinent);
      console.log(dataByContinent, updatedBubbleData);
      // feed new data to other charts
      magChart.updateVis(dataByContinent);
      depthChart.updateVis(dataByContinent);
      myBubbleChart.updateVis(updatedBubbleData);

      // trigger event to filter map point by continent
      const continentChangeEvent = new CustomEvent("continentChange", {
        detail: {
          selectedContinent: selectedContinent,
        },
      });
      document.dispatchEvent(continentChangeEvent);
    };

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

    // Update visualizations when the slider value changes
    function updateVisualizations(index) {
      const currentDate = data[index].date;
      timeDisplay.text(currentDate.toLocaleDateString());

      // Filter data up to current date
      const filteredData = data.filter((d) => d.date <= currentDate);

      // Update all visualizations with filtered data
      leafletMap.updateData(filteredData);
      leafletMap.updateTimeFilter(currentDate);

      const bubbleData = createBubbleChartData(filteredData);
      myBubbleChart.updateVis(bubbleData);

      magChart.updateVis(filteredData);
      depthChart.updateVis(filteredData);
    }

    // Added: Event listener for reset button
    document
      .getElementById("reset-button")
      .addEventListener("click", resetFilters);
    document
      .getElementById("continent-selector")
      .addEventListener("change", handleContinentChange);
  });

document
  .getElementById("map-bg-selector")
  .addEventListener("change", mapSelectEventListener);
