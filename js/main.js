let selectedBins = {
  mag: [],
  depth: [],
};

// Add at the top with other global variables
let isPlaying = false;
let animationInterval;
let timeExtent;

// function

function nearPointsSearch(data, time) {
  const date = new Date(time);
  const previousDate = date.getDate() - 1;
  const nextDate = date.setDate(date.getDate() + 1).toLocaleString();

  const sameDateData = data.filter((d) => {
    const tempDate = new Date(d.time).toLocaleDateString();
    if (tempDate === date.toLocaleDateString()) {
      return d;
    }
  });
  return sameDateData;
}

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

function filterDataByContinent(data, continent) {
  if (!continent) return data; // No filtering
  return data.filter((d) => d.Continent === continent);
}

function filterDataByMag(data, bins) {
  let result = [];
  bins.forEach((bin) => {
    result = result.concat(
      data.filter((d) => d.mag >= bin[0] && d.mag < bin[1])
    );
  });
  // console.log(result);
  return result;
}

function filterDataByDepth(data, bins) {
  let result = [];
  bins.forEach((bin) => {
    result = result.concat(
      data.filter((d) => d.depth >= bin[0] && d.depth < bin[1])
    );
  });
  // console.log(result);
  return result;
}

function filterDataByTime(data, time) {
  let res = [];
  if (time.length) {
    time.forEach((t) => {
      const year = new Date(t).getFullYear();
      const month = new Date(t).getMonth() + 1;
      if (year && month) {
        const temp = data.filter((d) => {
          const dotDate = new Date(d.time);
          const dotYear = dotDate.getFullYear();
          const dotMonth = dotDate.getMonth() + 1;
          if (dotYear === year && dotMonth === month) return d;
        });

        res = res.concat(temp);
      }
    });
    return res;
  }
  return data;
}

const mapSelectEventListener = (event) => {
  // Get the selected value from the dropdown
  const selectedValue = event.target.value;
  leafletMap.updateVis(selectedValue);
};

// Modified: store chart instances
let magChart, depthChart;

d3.csv("data/2014-2025earthquakes.csv") //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
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
      d.year = d.date.getFullYear();
    });
    let filters = {
      continent: "",
      mag: [],
      depth: [],
      time: [],
    };
    const filteredData = (data) => {
      let res = data;
      if (filters.continent) {
        res = filterDataByContinent(res, filters.continent);
      }
      if (filters.mag.length) {
        res = filterDataByMag(res, filters.mag);
      }
      if (filters.depth.length) {
        res = filterDataByDepth(res, filters.depth);
      }
      if (filters.time.length) {
        res = filterDataByTime(res, filters.time);
      }
      return res;
    };

    // This will also make the timeline slider start from the oldest date to the most recent date.
    data.sort((a, b) => a.date - b.date); // Sort by date ascending
    timeExtent = d3.extent(data, (d) => d.year);
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
      d3.select("#intro").text("Earthquakes Frequencies in:");

      // If the play button is clicked, we toggle the isPlaying state
      if (isPlaying) {
        animationInterval = setInterval(() => {
          // Check if the current value of the slider is less than the max value
          const currentValue = +slider.property("value");

          // If the current value is less than the max value, increment it by 100 (or whatever step you want)
          const newValue =
            currentValue < data.length - 1 ? currentValue + 100 : 0;
          slider.property("value", newValue).dispatch("input");
        }, 1);
      } else {
        clearInterval(animationInterval);
      }
    });

    let bubbleData = createBubbleChartData(data);

    const handleBubbleSelect = (year, month, event) => {
      let found = 0;
      const timeStamp = year + " " + month;
      if (filters.time.includes(timeStamp)) {
        filters.time.splice(filters.time.indexOf(timeStamp), 1);
      } else filters.time.push(timeStamp);

      // // console.log(filteredData(data, filters));
      const bubbleSelectEvent = new CustomEvent("dataFilterChange", {
        detail: {
          filteredData: filteredData(data, filters),
        },
      });
      document.dispatchEvent(bubbleSelectEvent);
    };

    let myBubbleChart = new bubbleChart(
      {
        parentElement: "#bubble-chart",
        containerWidth: 1200,
        containerHeight: 800,
        margin: { top: 40, right: 20, bottom: 40, left: 60 },
        onBubbleSelect: handleBubbleSelect,
      },
      bubbleData
    );

    const handleMapPointHover = (time, event) => {
      const searchedData = nearPointsSearch(data, time);
      const MapPointHoverEvent = new CustomEvent("mapPointHover", {
        detail: {
          searchedData: searchedData,
        },
      });
      document.dispatchEvent(MapPointHoverEvent);
    };
    // Initialize chart and then show it
    leafletMap = new LeafletMap(
      { parentElement: "#my-map", onHoverHandler: handleMapPointHover },
      data
    );
    // map = new MapVis({ parentElement: "#map2" }, data);

    // Added: bin selection handler
    const handleBinSelected = (bin, event) => {
      const field = bin.field;
      const currentBins = selectedBins[field];
      const newBin = { x0: bin.x0, x1: bin.x1 };

      // Toggle/replace selection based on Shift key
      if (event) {
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
        filters.mag = selectedBins.mag.map((mag) => [mag.x0, mag.x1]);
      } else if (field === "depth") {
        depthChart.updateSelectedBins(selectedBins.depth);
        filters.depth = selectedBins.depth.map((dep) => [dep.x0, dep.x1]);
      }

      // event created to change map dot due to bin change
      const binChangeEvent = new CustomEvent("dataFilterChange", {
        detail: {
          bubbleData: createBubbleChartData(filteredData(data, filters)),
          filteredData: filteredData(data, filters),
          changeFlag: 0,
        },
      });
      document.dispatchEvent(binChangeEvent);
    };

    // Modified: pass bin selection callback
    magChart = new BarChart({ parentElement: "#my-mag-chart" }, data, {
      field: "mag",
      label: "Magnitude",
      binStep: 0.25,
      color: "steelblue",
      units: "",
      hoverColor: "var(--selection-color)",
      onBinSelected: handleBinSelected,
    });

    depthChart = new BarChart({ parentElement: "#my-depth-chart" }, data, {
      field: "depth", // Use depth for the depth chart
      label: "Depth (km)", // Label for depth chart
      binStep: 25,
      color: "Green",
      units: "",
      hoverColor: "var(--selection-color)",
      onBinSelected: handleBinSelected,
    });

    // filter data by continent
    const handleContinentChange = (event) => {
      const selectedContinent = event.target.value;
      // Update map with the selected continent
      const dataByContinent = filterDataByContinent(data, selectedContinent);
      filters.continent = selectedContinent;
      const updatedBubbleData = createBubbleChartData(dataByContinent);
      // feed new data to other charts

      myBubbleChart.updateVis(updatedBubbleData);
      // trigger event to filter map point by continent
      const continentChangeEvent = new CustomEvent("dataFilterChange", {
        detail: {
          filteredData: filteredData(data, filters),
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
      const currentYear = data[index].year;
      timeDisplay.text(currentYear);

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
