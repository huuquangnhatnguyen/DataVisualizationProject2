d3.csv("data/2024-2025.csv") //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
  .then((data) => {
    console.log("number of items: " + data.length);

    data.forEach((d) => {
      //convert from string to number
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.mag = +d.mag;
    });

    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, data);
  })
  .catch((error) => console.error(error));

const mapSelectEventListener = (event) => {
  // Get the selected value from the dropdown
  const selectedValue = event.target.value;
  console.log(selectedValue);
  // Call the function to update the map with the selected value
  leafletMap.updateVis(selectedValue);
};

document
  .getElementById("map-bg-selector")
  .addEventListener("change", mapSelectEventListener);
