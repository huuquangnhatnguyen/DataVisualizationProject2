let selectedBins = {
  mag: [],
  depth: [],
};

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

function filterDataByContinent(data, continent) {
  if (!continent) return data; // No filtering
  return data.filter((d) => d.Continent === continent);
}
function filterDataByDepth(data, bins) {
  let result = data;
  bins.forEach((bin) => {
    result = result.concat(
      data.filter((d) => d.depth >= bin[0] && d.depth < bin[1])
    );
  });
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

    let bubbleData = createBubbleChartData(data);

    const handleBubbleSelect = (year, month, event) => {
      let found = 0;
      const timeStamp = year + " " + month;
      if (filters.time.includes(timeStamp)) {
        console.log("here");
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
        containerWidth: 800,
        containerHeight: 700,
        margin: { top: 40, right: 20, bottom: 40, left: 60 },
        onBubbleSelect: handleBubbleSelect,
      },
      bubbleData
    );

    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, data);
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
