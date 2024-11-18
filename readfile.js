// Define color palettes
const colorPalettes = {
  palette1: ["#133E87", "#FF8000", "#006A67", "#4C1F7A"], // Classic colors
  palette2: ["#333333", "#555555", "#777777", "#999999"], // Dark mode
  palette3: ["#FF5733", "#33FF57", "#3357FF", "#FFFF33"], // Vibrant colors
  palette4: ["#4A90E2", "#F5A623", "#7ED321", "#D0021B"], // Custom palette (index 0: score, 1: gold, 2: exp, 3: enemy)
  palette5: ["#1E90FF", "#FFD700", "#32CD32", "#FF4500"], // Bright colors
  palette6: ["#8A2BE2", "#7FFF00", "#FF6347", "#20B2AA"], // Earthy tones
  palette7: ["#FF1493", "#00FA9A", "#C71585", "#FFD700"], // Bold and bright
  palette8: ["#A52A2A", "#8B4513", "#D2691E", "#C71585"], // Earthy brown tones
  palette9: ["#00CED1", "#FF6347", "#FF8C00", "#FFD700"], // Tropical colors
  palette10: ["#4682B4", "#32CD32", "#FFD700", "#9932CC"], // Balanced palette
  palette11: ["#ADFF2F", "#FF69B4", "#8A2BE2", "#7FFF00"], // Soft pastels
  palette12: ["#D2691E", "#FF4500", "#9ACD32", "#8B0000"], // Warm earthy tones
};

// Transform data for default and increment modes
function getDefaultTracks(data) {
  return data.trackResults.map((track) => ({
    time: track.time,
    score: track.scoreTotal,
    gold: track.goldTotal,
    exp: track.expTotal,
    enemyAmountSpawned: track.amount,
    enemies: track.enemies.map((e) => `${e.name} (x${e.amount})`).join(", "),
  }));
}

function getIncrementTracks(data) {
  return data.trackResults.map((track, index) => {
    if (index === 0) {
      return {
        time: track.time,
        score: track.scoreTotal,
        gold: track.goldTotal,
        exp: track.expTotal,
        enemyAmountSpawned: track.amount,
        enemies: track.enemies
          .map((e) => `${e.name} (x${e.amount})`)
          .join(", "),
      };
    }

    const prevTrack = data.trackResults.slice(0, index);

    return {
      time: track.time,
      score:
        prevTrack.reduce((sum, t) => sum + t.scoreTotal, 0) + track.scoreTotal,
      gold:
        prevTrack.reduce((sum, t) => sum + t.goldTotal, 0) + track.goldTotal,
      exp: prevTrack.reduce((sum, t) => sum + t.expTotal, 0) + track.expTotal,
      enemies: track.enemies.map((e) => `${e.name} (x${e.amount})`).join(", "),
      enemyAmountSpawned:
        prevTrack.reduce((sum, t) => sum + t.amount, 0) + track.amount, // Sum of all previous enemy amounts + current amount
    };
  });
}

// Variables to hold the data and current mode
let currentMode = "default"; // Default mode
let trackData = [];
let loadedData = null; // Variable to store the original loaded data
let colorPalette = colorPalettes.palette1;

// Function to draw the chart
function drawChart(tracks, data, colorPalette) {
  const margin = { top: 20, right: 50, bottom: 50, left: 50 };
  const width = 1280 - margin.left - margin.right; // Adjusted width
  const height = 480 - margin.top - margin.bottom; // Adjusted height

  // Clear existing chart
  d3.select("#chart").selectAll("*").remove();

  // Calculate the total amount of enemies spawned
  const totalEnemyAmountSpawned = tracks.reduce(
    (sum, track) => track.enemyAmountSpawned,
    0
  );
  const totalScore = tracks.reduce((sum, track) => track.score, 0);
  const totalGold = tracks.reduce((sum, track) => track.gold, 0);
  const totalExp = tracks.reduce((sum, track) => track.exp, 0);

  // Add stage info above the chart
  const infoContainer = document.querySelector("#stage-info");
  infoContainer.innerHTML = `
            <p><strong>Stage:</strong> ${data.stageName}</p>
            <p><strong>Difficulty:</strong> ${data.difficulty}</p>
            <p><strong>Character:</strong> ${data.character}</p>
            <p><strong>Version:</strong> ${data.version}</p>
            <p><strong>Total Enemies Spawned:</strong> ${totalEnemyAmountSpawned}</p>
            <p><strong>Total Score:</strong> ${totalScore}</p>
            <p><strong>Total Gold:</strong> ${totalGold}</p>
            <p><strong>Total Exp:</strong> ${totalExp}</p>
        `;

  // Initialize SVG
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  // Set up SVG and scales
  const newSvg = svg
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(tracks, (d) => d.time)])
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(tracks, (d) =>
        Math.max(d.score, d.gold, d.exp, d.enemyAmountSpawned)
      ),
    ])
    .range([height, 0]);

  const xAxis = newSvg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  const yAxis = newSvg.append("g").call(d3.axisLeft(y));

  const tooltip = d3.select(".tooltip");

  const lines = [
    {
      key: "Score",
      color: colorPalette[0],
      accessor: (d) => d.score,
      label: "Score",
    },
    {
      key: "Soul-Point",
      color: colorPalette[1],
      accessor: (d) => d.gold,
      label: "Gold",
    },
    {
      key: "EXP",
      color: colorPalette[2],
      accessor: (d) => d.exp,
      label: "EXP",
    },
    {
      key: "Amount-Spawned",
      color: colorPalette[3], // Choose a color for the new line
      accessor: (d) => d.enemyAmountSpawned,
      label: "Enemy Amount Spawned",
    },
  ];

  const lineGroup = newSvg.append("g").attr("class", "lines");

  lines.forEach(({ key, color, accessor }) => {
    // Draw the line
    lineGroup
      .append("path")
      .datum(tracks)
      .attr("class", `line ${key}-line`)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.time))
          .y((d) => y(accessor(d)))
      )
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5);

    // Draw points
    newSvg
      .selectAll(`.${key}-point`)
      .data(tracks)
      .enter()
      .append("circle")
      .attr("class", `${key}-point`)
      .attr("cx", (d) => x(d.time))
      .attr("cy", (d) => y(accessor(d)))
      .attr("r", 3)
      .attr("fill", color)
      .on("mouseover", (event, d) => {
        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`).html(`<strong>Time:</strong> ${
          d.time
        }s<br>
                               <strong>${key}:</strong> ${accessor(d)}<br>
                               <strong>Enemies:</strong> ${d.enemies}`);
      })
      .on("mouseout", () => tooltip.style("display", "none"));
  });

  const zoom = d3
    .zoom()
    .scaleExtent([1, 50]) // Set zoom limits
    .translateExtent([
      [-1, -1],
      [
        width + margin.left + margin.right * 1.5,
        height + margin.top + margin.bottom * 1.5,
      ],
    ])
    .on("zoom", (event) => {
      const transform = event.transform;

      // Rescale the X axis based on the zoom
      const newX = transform.rescaleX(x).clamp(true);

      // Rescale the Y axis for each category (score, gold, exp)
      const newY = transform.rescaleY(
        d3
          .scaleLinear()
          .domain([0, d3.max(tracks, (d) => d.score)])
          .range([height, 0])
      ); // Apply zoom to the main Y axis

      // Update axes
      xAxis.call(d3.axisBottom(newX).ticks(5)); // Optional: Adjust the number of ticks if needed
      yAxis.call(d3.axisLeft(newY));

      // Update line positions for each category
      newSvg.selectAll(".Score-line").attr("d", (d) =>
        d3
          .line()
          .x((d) => newX(d.time) + margin.left)
          .y((d) => newY(d.score))(d)
      );

      newSvg.selectAll(".Soul-Point-line").attr("d", (d) =>
        d3
          .line()
          .x((d) => newX(d.time) + margin.left)
          .y((d) => newY(d.gold))(d)
      );

      newSvg.selectAll(".EXP-line").attr("d", (d) =>
        d3
          .line()
          .x((d) => newX(d.time) + margin.left)
          .y((d) => newY(d.exp))(d)
      );

      newSvg.selectAll(".Amount-Spawned-line").attr("d", (d) =>
        d3
          .line()
          .x((d) => newX(d.time) + margin.left)
          .y((d) => newY(d.enemyAmountSpawned))(d)
      );

      // Recalculate the positions of points (circles) for each category
      newSvg
        .selectAll(".Score-point")
        .attr("cx", (d) => newX(d.time) + margin.left)
        .attr("cy", (d) => newY(d.score));

      newSvg
        .selectAll(".Soul-Point-point")
        .attr("cx", (d) => newX(d.time) + margin.left)
        .attr("cy", (d) => newY(d.gold));

      newSvg
        .selectAll(".EXP-point")
        .attr("cx", (d) => newX(d.time) + margin.left)
        .attr("cy", (d) => newY(d.exp));

      newSvg
        .selectAll(".Amount-Spawned-point")
        .attr("cx", (d) => newX(d.time) + margin.left)
        .attr("cy", (d) => newY(d.enemyAmountSpawned));

      // Create horizontal grid lines at fixed intervals along the Y-axis
      // Get the current Y-axis ticks (i.e., values) from the updated scale
      const yTicks = newY.ticks(); // Get the ticks from the rescaled Y-axis

      // Remove old grid lines
      newSvg.selectAll(".grid-line").remove();

      // Create new grid lines for each tick value in the Y-axis
      newSvg
        .selectAll(".grid-line")
        .data(yTicks)
        .join("line")
        .attr("class", "grid-line")
        .attr("x1", margin.left)
        .attr("x2", width + margin.left)
        .attr("y1", (d) => newY(d))
        .attr("y2", (d) => newY(d))
        .attr("stroke", "#444")
        .attr("stroke-dasharray", "2,2");
    });

  // Apply the zoom to the SVG container
  d3.select("#chart").call(zoom);

  // Add toggle buttons for the newly rendered lines
  addToggleButtons(lines);

  // Proceed with your existing chart setup and processing here
  // Add the data to the chart, update stage info, etc.
}

// Event listener for file selection
document.getElementById("fileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Parse the JSON data
    loadedData = JSON.parse(e.target.result);

    // Initialize data in both modes
    const defaultTracks = getDefaultTracks(loadedData);
    const incrementTracks = getIncrementTracks(loadedData);

    // Store the processed data for both modes
    trackData = { default: defaultTracks, increment: incrementTracks };

    // Draw the chart for the current mode
    drawChart(trackData[currentMode], loadedData, colorPalette);
  };

  reader.readAsText(file);
});

// Event listeners for the mode buttons
document.getElementById("defaultBtn").addEventListener("click", () => {
  if (!loadedData) {
    console.error("No data loaded. Please upload a file first.");
    return;
  }
  currentMode = "default";
  drawChart(trackData[currentMode], loadedData, colorPalette);
});

document.getElementById("incrementBtn").addEventListener("click", () => {
  if (!loadedData) {
    console.error("No data loaded. Please upload a file first.");
    return;
  }
  currentMode = "increment";
  drawChart(trackData[currentMode], loadedData, colorPalette);
});

// Add toggle buttons for showing and hiding the lines and dots
function addToggleButtons(lines) {
  // Clear existing toggle buttons before adding new ones
  d3.select("#legend").selectAll("*").remove();

  const legend = d3.select("#legend");

  // Add toggle buttons for each line
  lines.forEach(({ key, color, label }) => {
    legend
      .append("button")
      .attr("class", "toggle-btn")
      .text(`Toggle ${label}`)
      .style("background-color", color)
      .on("click", () => {
        const line = d3.select(`.${key}-line`);
        const points = d3.selectAll(`.${key}-point`);
        const isHidden = line.style("display") === "none";

        // Toggle the visibility of the line and points
        line.style("display", isHidden ? null : "none");
        points.style("display", isHidden ? null : "none");
      });
  });

  // Add a separate button to toggle all dots
  legend
    .append("button")
    .attr("class", "toggle-btn")
    .text("Toggle All Dots")
    .on("click", () => {
      const dots = d3.selectAll("[class$='-point']"); // Select all points
      const isHidden = dots.style("display") === "none";

      // Toggle visibility of all dots
      dots.style("display", isHidden ? null : "none");
    });
}

document.getElementById("colorPalette").addEventListener("change", (event) => {
  const selectedPalette = event.target.value;
  colorPalette = colorPalettes[selectedPalette];
});
